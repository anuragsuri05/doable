import "server-only";
import OpenAI from "openai";
import { jsonSchema } from "../tools";
import { labelTracker, type AgentRunOptions, type AgentRunResult } from "./types";

type Msg = OpenAI.Chat.Completions.ChatCompletionMessageParam;

function tolerantParse(raw: string): unknown {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return null;
  }
}

/** Best-effort partial parse so the UI can show the file path while arguments stream. */
function partialLabel(raw: string, label: string | undefined) {
  if (!label) return undefined;
  const m = raw.match(new RegExp(`"${label}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
  return m ? { [label]: JSON.parse(`"${m[1]}"`) } : undefined;
}

export async function runOpenAI(o: AgentRunOptions): Promise<AgentRunResult> {
  const client = new OpenAI({ apiKey: o.apiKey });
  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = o.tools.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: jsonSchema(t) },
  }));
  const messages: Msg[] = [
    { role: "system", content: o.system },
    ...o.messages.map((m): Msg => {
      if (m.role === "assistant") return { role: "assistant", content: m.text };
      return {
        role: "user",
        content: [
          ...(m.images ?? []).map((img) => ({
            type: "image_url" as const,
            image_url: { url: `data:${img.mediaType};base64,${img.data}` },
          })),
          { type: "text" as const, text: m.text || "(empty)" },
        ],
      };
    }),
  ];

  const trackLabel = labelTracker(o.emit);
  let inputTokens = 0;
  let outputTokens = 0;
  const texts: string[] = [];

  let finished = false;
  for (let step = 0; step < o.maxSteps; step++) {
    const stream = await client.chat.completions.create(
      { model: o.model, messages, tools, stream: true, stream_options: { include_usage: true } },
      { signal: o.signal },
    );
    let stepText = "";
    const calls: { id: string; name: string; args: string }[] = [];
    let finish: string | null = null;

    for await (const chunk of stream) {
      if (chunk.usage) {
        inputTokens += chunk.usage.prompt_tokens ?? 0;
        outputTokens += chunk.usage.completion_tokens ?? 0;
      }
      const choice = chunk.choices[0];
      if (!choice) continue;
      if (choice.finish_reason) finish = choice.finish_reason;
      const delta = choice.delta;
      if (delta?.content) {
        stepText += delta.content;
        o.emit({ type: "text", delta: delta.content });
      }
      for (const tc of delta?.tool_calls ?? []) {
        let call = calls[tc.index];
        if (!call) {
          call = calls[tc.index] = { id: tc.id ?? `call_${step}_${tc.index}`, name: tc.function?.name ?? "", args: "" };
          o.emit({ type: "tool_start", id: call.id, name: call.name });
        }
        if (tc.function?.arguments) {
          call.args += tc.function.arguments;
          const def = o.tools.find((t) => t.name === call.name);
          trackLabel(call.id, def?.label, partialLabel(call.args, def?.label));
        }
      }
    }
    if (stepText) texts.push(stepText);
    const real = calls.filter(Boolean);
    if (real.length === 0) {
      finished = true;
      break;
    }
    if (finish === "length") throw new Error("The response was cut off mid tool call. Ask for a smaller change.");

    messages.push({
      role: "assistant",
      content: stepText || null,
      tool_calls: real.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: c.args } })),
    });
    for (const c of real) {
      const input = tolerantParse(c.args);
      const r =
        input === null
          ? { ok: false, output: `INVALID_JSON: ${c.args.slice(0, 500)}`, summary: "Invalid tool input" }
          : await o.execute(c.name, input);
      o.emit({ type: "tool_end", id: c.id, ok: r.ok, summary: r.summary });
      messages.push({ role: "tool", tool_call_id: c.id, content: r.output.slice(0, 100_000) });
    }
    if (o.signal.aborted) {
      finished = true;
      break;
    }
  }
  return { text: texts.join("\n\n"), inputTokens, outputTokens, hitStepLimit: !finished };
}
