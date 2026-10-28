import "server-only";
import { GoogleGenAI, type Content, type Part } from "@google/genai";
import { jsonSchema } from "../tools";
import type { AgentRunOptions, AgentRunResult } from "./types";

export async function runGoogle(o: AgentRunOptions): Promise<AgentRunResult> {
  const ai = new GoogleGenAI({ apiKey: o.apiKey });
  const contents: Content[] = o.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [
      ...(m.images ?? []).map((img): Part => ({ inlineData: { mimeType: img.mediaType, data: img.data } })),
      { text: m.text || "(empty)" },
    ],
  }));
  const functionDeclarations = o.tools.map((t) => ({
    name: t.name,
    description: t.description,
    parametersJsonSchema: jsonSchema(t),
  }));

  let inputTokens = 0;
  let outputTokens = 0;
  const texts: string[] = [];

  let finished = false;
  for (let step = 0; step < o.maxSteps; step++) {
    const stream = await ai.models.generateContentStream({
      model: o.model,
      contents,
      config: {
        systemInstruction: o.system,
        tools: [{ functionDeclarations }],
        thinkingConfig: { includeThoughts: true },
        abortSignal: o.signal,
      },
    });
    // Keep every part exactly as returned (including thought signatures) so the
    // next request replays the model turn faithfully.
    const modelParts: Part[] = [];
    const calls: { id: string; name: string; args: Record<string, unknown>; providerId?: string }[] = [];
    let stepText = "";
    let usage: { prompt?: number; out?: number } = {};

    for await (const chunk of stream) {
      const um = chunk.usageMetadata;
      if (um) usage = { prompt: um.promptTokenCount, out: (um.candidatesTokenCount ?? 0) + (um.thoughtsTokenCount ?? 0) };
      for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
        modelParts.push(part);
        if (part.functionCall) {
          const id = part.functionCall.id ?? `fc_${step}_${calls.length}`;
          calls.push({ id, name: part.functionCall.name ?? "", args: part.functionCall.args ?? {}, providerId: part.functionCall.id });
          o.emit({ type: "tool_start", id, name: part.functionCall.name ?? "" });
          const def = o.tools.find((t) => t.name === part.functionCall!.name);
          if (def?.label && part.functionCall.args?.[def.label] != null) {
            o.emit({ type: "tool_input", id, input: { [def.label]: part.functionCall.args[def.label] } });
          }
        } else if (part.text) {
          if (part.thought) o.emit({ type: "thinking", delta: part.text });
          else {
            stepText += part.text;
            o.emit({ type: "text", delta: part.text });
          }
        }
      }
    }
    inputTokens += usage.prompt ?? 0;
    outputTokens += usage.out ?? 0;
    if (stepText) texts.push(stepText);
    if (calls.length === 0) {
      finished = true;
      break;
    }

    contents.push({ role: "model", parts: modelParts });
    const responses: Part[] = [];
    for (const c of calls) {
      const r = await o.execute(c.name, c.args);
      o.emit({ type: "tool_end", id: c.id, ok: r.ok, summary: r.summary });
      responses.push({
        functionResponse: {
          ...(c.providerId ? { id: c.providerId } : {}),
          name: c.name,
          response: r.ok ? { output: r.output.slice(0, 100_000) } : { error: r.output.slice(0, 20_000) },
        },
      });
    }
    contents.push({ role: "user", parts: responses });
    if (o.signal.aborted) {
      finished = true;
      break;
    }
  }
  return { text: texts.join("\n\n"), inputTokens, outputTokens, hitStepLimit: !finished };
}
