// Types shared by the server and the browser.

export type Provider = "anthropic" | "openai" | "google";
export type Mode = "build" | "plan" | "chat";

export const PROVIDERS: { id: Provider; name: string; keyUrl: string; keyPrefix: string }[] = [
  { id: "anthropic", name: "Anthropic Claude", keyUrl: "https://console.anthropic.com/settings/keys", keyPrefix: "sk-ant-" },
  { id: "openai", name: "OpenAI GPT", keyUrl: "https://platform.openai.com/api-keys", keyPrefix: "sk-" },
  { id: "google", name: "Google Gemini", keyUrl: "https://aistudio.google.com/app/apikey", keyPrefix: "" },
];

export interface ImageAttachment {
  name: string;
  mediaType: string;
  data: string; // base64, no data: prefix
}

export interface SelectedElement {
  id: string; // "src/pages/Index.tsx:12:7"
  tag: string;
  className: string;
  text: string;
  directText: string;
  hasOnlyText: boolean;
  html: string;
}

/** Streamed from the agent runner to the editor. */
export type AgentEvent =
  | { type: "text"; delta: string }
  | { type: "thinking"; delta: string }
  | { type: "tool_start"; id: string; name: string }
  | { type: "tool_input"; id: string; input: Record<string, unknown> }
  | { type: "tool_end"; id: string; ok: boolean; summary: string }
  | { type: "status"; message: string }
  | { type: "usage"; inputTokens: number; outputTokens: number; costUsd: number }
  | { type: "error"; message: string }
  | { type: "done"; messageId: string; commitSha: string | null; status: string };

export type MessagePart =
  | { type: "text"; text: string }
  | { type: "thinking"; text: string }
  | { type: "tool"; id: string; name: string; input: Record<string, unknown>; status: "running" | "ok" | "error"; summary?: string };

export function applyEvent(parts: MessagePart[], ev: AgentEvent): MessagePart[] {
  const last = parts[parts.length - 1];
  switch (ev.type) {
    case "text":
      if (last?.type === "text") return [...parts.slice(0, -1), { ...last, text: last.text + ev.delta }];
      return [...parts, { type: "text", text: ev.delta }];
    case "thinking":
      if (last?.type === "thinking") return [...parts.slice(0, -1), { ...last, text: last.text + ev.delta }];
      return [...parts, { type: "thinking", text: ev.delta }];
    case "tool_start":
      if (parts.some((p) => p.type === "tool" && p.id === ev.id)) return parts;
      return [...parts, { type: "tool", id: ev.id, name: ev.name, input: {}, status: "running" }];
    case "tool_input":
      return parts.map((p) => (p.type === "tool" && p.id === ev.id ? { ...p, input: { ...p.input, ...ev.input } } : p));
    case "tool_end":
      return parts.map((p) => (p.type === "tool" && p.id === ev.id ? { ...p, status: ev.ok ? "ok" : "error", summary: ev.summary } : p));
    default:
      return parts;
  }
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  parts: MessagePart[];
  attachments: { name: string; mediaType: string; url?: string }[];
  mode: Mode;
  provider: Provider | null;
  model: string | null;
  status: string;
  error: string | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  commitSha: string | null;
  createdAt: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: Provider;
  recommended?: boolean;
  inputPrice?: number; // USD per 1M tokens
  outputPrice?: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  slug: string;
  visibility: string;
  starred: boolean;
  publishedAt: number | null;
  createdAt: number;
  updatedAt: number;
}
