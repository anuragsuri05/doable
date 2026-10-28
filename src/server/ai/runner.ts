import "server-only";
import { db, newId, now, getUserSettings, type MessageRow, type ProjectRow } from "../db";
import * as files from "../projects";
import * as sandbox from "../sandbox";
import { applyEvent, type AgentEvent, type ImageAttachment, type MessagePart, type Mode, type Provider, type SelectedElement } from "@/lib/types";
import { buildSystem, turnContext } from "./prompt";
import { executeTool, toolsForMode } from "./tools";
import { resolveKey } from "./keys";
import { estimateCost } from "./models";
import { runAnthropic } from "./providers/anthropic";
import { runOpenAI } from "./providers/openai";
import { runGoogle } from "./providers/google";
import { runMock } from "./providers/mock";
import { checkApp } from "../check";
import type { AgentRunOptions, AgentRunResult, Effort, NeutralMessage } from "./providers/types";
import { saveUpload, loadUpload } from "../uploads";

interface Run {
  id: string;
  projectId: string;
  messageId: string;
  events: AgentEvent[];
  listeners: Set<(ev: AgentEvent) => void>;
  abort: AbortController;
  done: boolean;
}

type G = typeof globalThis & { __doableRuns?: Map<string, Run> };
const g = globalThis as G;
const runs: Map<string, Run> = g.__doableRuns ?? (g.__doableRuns = new Map());

const RUNNERS: Record<Provider, (o: AgentRunOptions) => Promise<AgentRunResult>> = {
  anthropic: runAnthropic,
  openai: runOpenAI,
  google: runGoogle,
};

export function activeRun(projectId: string) {
  const r = runs.get(projectId);
  return r && !r.done ? r : null;
}

export function subscribe(projectId: string, listener: (ev: AgentEvent) => void) {
  const r = runs.get(projectId);
  if (!r) return null;
  for (const ev of r.events) listener(ev);
  if (r.done) return { messageId: r.messageId, unsubscribe: () => {} };
  r.listeners.add(listener);
  return { messageId: r.messageId, unsubscribe: () => r.listeners.delete(listener) };
}

export function stopRun(projectId: string) {
  activeRun(projectId)?.abort.abort();
}

function history(projectId: string): NeutralMessage[] {
  const rows = db
    .prepare("SELECT * FROM messages WHERE project_id = ? AND status != 'streaming' ORDER BY created_at DESC LIMIT 40")
    .all(projectId) as unknown as MessageRow[];
  const out: NeutralMessage[] = [];
  for (const r of rows.reverse()) {
    const text = r.role === "assistant" ? r.content || (r.error ? `(failed: ${r.error})` : "(no reply)") : r.content;
    // Providers require alternating roles; merge consecutive messages of the same role.
    const prev = out[out.length - 1];
    if (prev && prev.role === r.role) prev.text += `\n\n${text}`;
    else out.push({ role: r.role, text });
  }
  if (out[0]?.role === "assistant") out.shift();
  return out;
}

export interface StartRunInput {
  userId: string;
  project: ProjectRow;
  text: string;
  images: ImageAttachment[];
  mode: Mode;
  provider: Provider;
  model: string;
  selected?: SelectedElement | null;
  route?: string;
}

export function startRun(input: StartRunInput) {
  const { project, userId } = input;
  if (activeRun(project.id)) throw new Error("Doable is already working on this project. Stop it or wait for it to finish.");
  const mock = input.model === "doable-mock" && process.env.NODE_ENV !== "production";
  const key = mock ? { apiKey: "mock", source: "platform" as const } : resolveKey(userId, input.provider);
  if (!key) throw new Error(`No API key for ${input.provider}. Add one in Settings → AI Providers.`);

  const isFirstBuild =
    (db.prepare("SELECT COUNT(*) AS n FROM messages WHERE project_id = ? AND role = 'assistant' AND mode = 'build'").get(project.id) as {
      n: number;
    }).n === 0;
  const prior = history(project.id);

  const t = now();
  const userMsgId = newId();
  const attachments = input.images.map((img) => ({ name: img.name, mediaType: img.mediaType, uploadId: saveUpload(img) }));
  db.prepare(
    `INSERT INTO messages (id, project_id, role, content, attachments_json, mode, provider, model, status, created_at)
     VALUES (?, ?, 'user', ?, ?, ?, ?, ?, 'done', ?)`,
  ).run(userMsgId, project.id, input.text, JSON.stringify(attachments), input.mode, input.provider, input.model, t);
  const messageId = newId();
  db.prepare(
    `INSERT INTO messages (id, project_id, role, mode, provider, model, status, created_at)
     VALUES (?, ?, 'assistant', ?, ?, ?, 'streaming', ?)`,
  ).run(messageId, project.id, input.mode, input.provider, input.model, t + 1);

  const run: Run = { id: newId(), projectId: project.id, messageId, events: [], listeners: new Set(), abort: new AbortController(), done: false };
  runs.set(project.id, run);

  let parts: MessagePart[] = [];
  let dirty = false;
  const emit = (ev: AgentEvent) => {
    run.events.push(ev);
    parts = applyEvent(parts, ev);
    dirty = true;
    for (const l of run.listeners) l(ev);
  };
  const flush = setInterval(() => {
    if (!dirty) return;
    dirty = false;
    db.prepare("UPDATE messages SET parts_json = ? WHERE id = ?").run(JSON.stringify(parts), messageId);
  }, 1000);

  const envNames = Object.keys(files.getProjectEnv(project));
  const context = turnContext({
    fileList: files.listFiles(project.id).map((f) => f.path),
    envNames,
    selected: input.selected,
    isFirstBuild,
    route: input.route,
  });
  const settings = getUserSettings(userId);
  const messages: NeutralMessage[] = [...prior, { role: "user", text: `${context}\n\n${input.text}`, images: input.images }];
  if (messages.length > 1 && messages[messages.length - 2].role === "user") {
    // Two user turns in a row (e.g. a failed previous run): merge them.
    const last = messages.pop()!;
    const prev = messages[messages.length - 1];
    prev.text += `\n\n${last.text}`;
    prev.images = [...(prev.images ?? []), ...(last.images ?? [])];
  }

  (async () => {
    let status = "done";
    let error: string | null = null;
    let result: AgentRunResult = { text: "", inputTokens: 0, outputTokens: 0 };
    try {
      const runOnce = (msgs: NeutralMessage[]) =>
        (mock ? runMock : RUNNERS[input.provider])({
          model: input.model,
          apiKey: key.apiKey,
          system: buildSystem(input.mode, project.knowledge),
          messages: msgs,
          tools: toolsForMode(input.mode),
          execute: (name, toolInput) => executeTool(project.id, name, toolInput),
          emit,
          signal: run.abort.signal,
          maxSteps: Number(settings.maxSteps) || 80,
          effort: ((settings.effort as Effort) || "medium") as Effort,
        });
      result = await runOnce(messages);

      // Verify: after a build turn, compile-check the whole app and hand any errors
      // back to the model to repair (up to 2 rounds) before reporting done.
      for (let round = 0; input.mode === "build" && round < 2 && !run.abort.signal.aborted; round++) {
        emit({ type: "status", message: "Checking the app for errors…" });
        const check = await checkApp(project.id, { timeoutMs: 60_000 });
        if (check.ok) break;
        const id = `verify_${round}`;
        emit({ type: "tool_start", id, name: "check_app" });
        emit({ type: "tool_end", id, ok: false, summary: `${check.errors.length} error${check.errors.length === 1 ? "" : "s"} found, fixing` });
        emit({ type: "text", delta: "\n\n" });
        messages.push(
          { role: "assistant", text: result.text || "(made changes)" },
          {
            role: "user",
            text: `Automatic check: the app is broken after your changes (this is what the user sees in the preview). Find the root cause of each error (read the files involved first), fix it, run check_app to confirm, then summarise:\n\n${check.errors.slice(0, 8).join("\n\n")}`,
          },
        );
        const fix = await runOnce(messages);
        result = { text: `${result.text}\n\n${fix.text}`, inputTokens: result.inputTokens + fix.inputTokens, outputTokens: result.outputTokens + fix.outputTokens, hitStepLimit: fix.hitStepLimit };
      }
      if (result.hitStepLimit && !run.abort.signal.aborted) {
        emit({
          type: "text",
          delta: `\n\n**Paused:** I reached the limit of ${Number(settings.maxSteps) || 80} steps for one message before finishing. Send “continue” and I'll pick up where I left off (you can raise the limit in Settings → Agent).`,
        });
      }
      if (run.abort.signal.aborted) status = "stopped";
    } catch (err) {
      if (run.abort.signal.aborted) status = "stopped";
      else {
        status = "error";
        error = friendlyError(err);
        emit({ type: "error", message: error });
      }
    }

    // Commit whatever changed, even on failure, so the user can always restore.
    let commitSha: string | null = null;
    if (input.mode === "build") {
      try {
        commitSha = files.commitAll(project.id, input.text.split("\n")[0].slice(0, 120) || "Update");
        await sandbox.syncDeps(project.id);
      } catch (err) {
        console.error("commit failed", err);
      }
    }
    const costUsd = estimateCost(input.model, result.inputTokens, result.outputTokens);
    emit({ type: "usage", inputTokens: result.inputTokens, outputTokens: result.outputTokens, costUsd });
    clearInterval(flush);
    const finalText = parts
      .filter((p): p is Extract<MessagePart, { type: "text" }> => p.type === "text")
      .map((p) => p.text)
      .join("\n\n");
    db.prepare(
      `UPDATE messages SET content = ?, parts_json = ?, status = ?, error = ?, input_tokens = ?, output_tokens = ?, cost_usd = ?, commit_sha = ? WHERE id = ?`,
    ).run(finalText || result.text, JSON.stringify(parts), status, error, result.inputTokens, result.outputTokens, costUsd, commitSha, messageId);
    db.prepare(
      `INSERT INTO usage_events (id, user_id, project_id, provider, model, key_source, input_tokens, output_tokens, cost_usd, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(newId(), userId, project.id, input.provider, input.model, key.source, result.inputTokens, result.outputTokens, costUsd, now());
    db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(now(), project.id);
    emit({ type: "done", messageId, commitSha, status });
    run.done = true;
    run.listeners.clear();
  })();

  return { runId: run.id, userMessageId: userMsgId, messageId };
}

function friendlyError(err: unknown): string {
  const e = err as { status?: number; message?: string };
  const msg = e?.message ?? String(err);
  if (e?.status === 401 || /api key|unauthorized|invalid x-api-key|API_KEY_INVALID/i.test(msg)) {
    return "The API key was rejected. Check it in Settings → AI Providers.";
  }
  if (e?.status === 404 || /model.*not found|does not exist|not_found/i.test(msg)) {
    return `This model is not available for your key: ${msg.slice(0, 200)}`;
  }
  if (e?.status === 429) return "Rate limited by the provider. Wait a moment and try again.";
  if (e?.status === 402 || /credit balance|quota|billing/i.test(msg)) return `Provider billing/quota error: ${msg.slice(0, 200)}`;
  return msg.slice(0, 500);
}

export { loadUpload };
