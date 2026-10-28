import type { AgentEvent, ImageAttachment } from "@/lib/types";
import type { ToolDef, ToolResult } from "../tools";

export interface NeutralMessage {
  role: "user" | "assistant";
  text: string;
  images?: ImageAttachment[];
}

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export interface AgentRunOptions {
  model: string;
  apiKey: string;
  system: string;
  messages: NeutralMessage[];
  tools: ToolDef[];
  execute: (name: string, input: unknown) => Promise<ToolResult>;
  emit: (ev: AgentEvent) => void;
  signal: AbortSignal;
  maxSteps: number;
  effort: Effort;
}

export interface AgentRunResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  /** The agent was still calling tools when it ran out of steps. */
  hitStepLimit?: boolean;
}

export class AgentError extends Error {}

/** Throttles tool_input events so the UI learns a file path early without a flood of events. */
export function labelTracker(emit: (ev: AgentEvent) => void) {
  const seen = new Map<string, string>();
  return (id: string, label: string | undefined, snapshot: unknown) => {
    if (!label || !snapshot || typeof snapshot !== "object") return;
    const value = (snapshot as Record<string, unknown>)[label];
    if (value == null) return;
    const str = JSON.stringify(value);
    if (seen.get(id) === str) return;
    seen.set(id, str);
    emit({ type: "tool_input", id, input: { [label]: value } });
  };
}
