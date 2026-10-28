import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { jsonSchema } from "../tools";
import { AgentError, labelTracker, type AgentRunOptions, type AgentRunResult } from "./types";

// Models that take adaptive thinking + effort (4.6 and later). Older models get neither.
const ADAPTIVE = /^claude-(?:(?:opus|sonnet)-4-[6-9]|(?:opus|sonnet|haiku|fable|mythos)-5)/;
// Models with server-side refusal fallbacks ("default" routing by refusal category).
const FALLBACK_MODELS = new Set(["claude-fable-5-1", "claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5"]);

export async function runAnthropic(o: AgentRunOptions): Promise<AgentRunResult> {
  const client = new Anthropic({ apiKey: o.apiKey });
  const tools = o.tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: jsonSchema(t) as Anthropic.Beta.BetaTool.InputSchema,
    eager_input_streaming: true,
  }));
  const messages: Anthropic.Beta.BetaMessageParam[] = o.messages.map((m) => ({
    role: m.role,
    content: [
      ...(m.images ?? []).map((img) => ({
        type: "image" as const,
        source: { type: "base64" as const, media_type: img.mediaType as "image/png", data: img.data },
      })),
      { type: "text" as const, text: m.text || "(empty)" },
    ],
  }));

  const adaptive = ADAPTIVE.test(o.model);
  const fallback = FALLBACK_MODELS.has(o.model);
  const trackLabel = labelTracker(o.emit);
  let inputTokens = 0;
  let outputTokens = 0;
  const texts: string[] = [];
  let jsonRetries = 0;

  let finished = false;
  for (let step = 0; step < o.maxSteps; step++) {
    const params = {
      model: o.model,
      max_tokens: 64000,
      system: [{ type: "text" as const, text: o.system, cache_control: { type: "ephemeral" as const } }],
      messages,
      tools,
      ...(adaptive
        ? { thinking: { type: "adaptive" as const, display: "summarized" as const }, output_config: { effort: o.effort } }
        : {}),
      ...(fallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } : {}),
    } as Anthropic.Beta.MessageCreateParamsStreaming;

    const stream = client.beta.messages.stream(params, { signal: o.signal });
    const toolNames = new Map<string, string>();
    let currentToolId: string | null = null;
    let stepText = "";

    stream.on("text", (delta) => {
      stepText += delta;
      o.emit({ type: "text", delta });
    });
    stream.on("thinking", (delta) => o.emit({ type: "thinking", delta }));
    stream.on("streamEvent", (event) => {
      if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
        currentToolId = event.content_block.id;
        toolNames.set(currentToolId, event.content_block.name);
        o.emit({ type: "tool_start", id: currentToolId, name: event.content_block.name });
      }
    });
    stream.on("inputJson", (_partial, snapshot) => {
      if (!currentToolId) return;
      const def = o.tools.find((t) => t.name === toolNames.get(currentToolId!));
      trackLabel(currentToolId, def?.label, snapshot);
    });

    let message: Anthropic.Beta.BetaMessage;
    try {
      message = await stream.finalMessage();
      jsonRetries = 0;
    } catch (err) {
      // Only an unparseable streamed tool input is retried; API errors propagate.
      if (err instanceof Anthropic.APIError || o.signal.aborted || jsonRetries++ >= 2) throw err;
      continue;
    }

    const u = message.usage;
    inputTokens += (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
    outputTokens += u.output_tokens ?? 0;
    if (stepText) texts.push(stepText);

    if (message.stop_reason === "refusal") {
      throw new AgentError("The model declined this request. Try rephrasing it or switching models.");
    }
    if (message.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: message.content });
      continue;
    }

    const toolUses = message.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (toolUses.length === 0) {
      finished = true;
      break;
    }
    if (message.stop_reason === "max_tokens") {
      throw new AgentError("The response was cut off mid tool call (max tokens). Ask for a smaller change.");
    }

    messages.push({ role: "assistant", content: message.content });
    // Run tools in order (they touch the same files) and return all results in one user message.
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      const r = await o.execute(tu.name, tu.input);
      o.emit({ type: "tool_end", id: tu.id, ok: r.ok, summary: r.summary });
      results.push({ type: "tool_result", tool_use_id: tu.id, content: r.output.slice(0, 100_000), is_error: !r.ok });
    }
    messages.push({ role: "user", content: results });
    if (o.signal.aborted) {
      finished = true;
      break;
    }
  }

  return { text: texts.join("\n\n"), inputTokens, outputTokens, hitStepLimit: !finished };
}
