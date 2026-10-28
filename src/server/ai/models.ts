import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import type { ModelInfo, Provider } from "@/lib/types";

/**
 * Curated defaults. The live list from each provider's /models endpoint (fetched with
 * the user's own key) is merged in, so newly released models appear automatically.
 * Prices are USD per 1M tokens and only used for cost estimates.
 */
export const CURATED: ModelInfo[] = [
  { id: "claude-opus-5-5", name: "Claude Opus 5.5", provider: "anthropic", recommended: true, inputPrice: 4, outputPrice: 20 },
  { id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", provider: "anthropic", inputPrice: 2, outputPrice: 10 },
  { id: "claude-haiku-5-5", name: "Claude Haiku 5.5", provider: "anthropic", inputPrice: 0.1, outputPrice: 0.5 },
  { id: "claude-fable-5-1", name: "Claude Fable 5.1", provider: "anthropic", inputPrice: 10, outputPrice: 50 },
  { id: "gpt-6-astra", name: "GPT-6 Astra", provider: "openai", recommended: true, inputPrice: 10, outputPrice: 50 },
  { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro (preview)", provider: "google", recommended: true },
  { id: "gemini-3-flash-preview", name: "Gemini 3 Flash (preview)", provider: "google" },
];

export const DEFAULT_MODEL: Record<Provider, string> = {
  anthropic: "claude-opus-5-5",
  openai: "gpt-6-astra",
  google: "gemini-3.1-pro-preview",
};

export function priceFor(model: string): { input: number; output: number } | null {
  const m = CURATED.find((c) => c.id === model);
  if (m?.inputPrice == null || m.outputPrice == null) return null;
  return { input: m.inputPrice, output: m.outputPrice };
}

export function estimateCost(model: string, inputTokens: number, outputTokens: number) {
  const p = priceFor(model);
  if (!p) return 0;
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

const cache = new Map<string, { at: number; models: ModelInfo[] }>();

function prettify(id: string) {
  return id
    .replace(/^models\//, "")
    .split(/[-_]/)
    .map((w) => (/^(gpt|ai)$/i.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/** Fetch models the key can actually use. Throws on invalid key (used for "Test connection"). */
export async function fetchLiveModels(provider: Provider, apiKey: string): Promise<ModelInfo[]> {
  const cacheKey = `${provider}:${apiKey.slice(-8)}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.models;

  let models: ModelInfo[] = [];
  if (provider === "anthropic") {
    const client = new Anthropic({ apiKey });
    for await (const m of client.models.list()) models.push({ id: m.id, name: m.display_name || prettify(m.id), provider });
  } else if (provider === "openai") {
    const client = new OpenAI({ apiKey });
    for await (const m of client.models.list()) {
      if (!/^(gpt|o\d|chatgpt)/.test(m.id)) continue;
      if (/(audio|realtime|tts|transcribe|image|embedding|search|moderation|instruct)/.test(m.id)) continue;
      models.push({ id: m.id, name: prettify(m.id), provider });
    }
  } else {
    const ai = new GoogleGenAI({ apiKey });
    const pager = await ai.models.list();
    for await (const m of pager) {
      const id = (m.name ?? "").replace(/^models\//, "");
      if (!id.startsWith("gemini")) continue;
      if (m.supportedActions && !m.supportedActions.includes("generateContent")) continue;
      if (/(embedding|tts|image|audio|live)/.test(id)) continue;
      models.push({ id, name: m.displayName || prettify(id), provider });
    }
  }
  models.sort((a, b) => b.id.localeCompare(a.id));
  cache.set(cacheKey, { at: Date.now(), models });
  return models;
}

/**
 * Rank a provider's live model list so the strongest general-purpose model comes first:
 * newer versions above older ones, flagship above mini/nano/lite, and dated snapshots
 * hidden when their alias is listed. (Alphabetical order put e.g. o4-mini on top.)
 */
function score(provider: Provider, id: string): number {
  const ver = (re: RegExp) => {
    const m = id.match(re);
    return m ? parseFloat(m[1]) : 0;
  };
  let s = 0;
  if (provider === "openai") {
    if (/^gpt-\d/.test(id)) s = 1000 + ver(/^gpt-(\d+(?:\.\d+)?)/) * 100;
    else if (/^o\d/.test(id)) s = 500 + ver(/^o(\d+)/) * 10;
    else s = 100;
  } else if (provider === "google") {
    s = 1000 + ver(/^gemini-(\d+(?:\.\d+)?)/) * 100;
    if (/-pro/.test(id)) s += 30;
    else if (/flash-lite|-lite/.test(id)) s -= 20;
    else if (/flash/.test(id)) s += 10;
  } else {
    s = 1000 + ver(/-(\d+(?:-\d+)?)$/) * 10;
    if (/opus|fable/.test(id)) s += 30;
    else if (/sonnet/.test(id)) s += 20;
  }
  if (/-nano\b/.test(id)) s -= 60;
  if (/-mini\b/.test(id)) s -= 40;
  if (/-pro\b/.test(id) && provider === "openai") s -= 15; // much slower and pricier per message
  if (/codex/.test(id)) s -= 8;
  if (/chat-latest|preview|exp/.test(id)) s -= 5;
  return s;
}

export function mergeModels(provider: Provider, live: ModelInfo[] | null): ModelInfo[] {
  const curated = CURATED.filter((m) => m.provider === provider);
  if (!live) return curated;
  const liveIds = new Set(live.map((m) => m.id));
  // Hide dated snapshots (e.g. gpt-5.2-2025-12-11) when the plain alias is available.
  const visible = live.filter((m) => {
    const alias = m.id.replace(/-\d{4}-\d{2}-\d{2}$|-\d{8}$/, "");
    return alias === m.id || !liveIds.has(alias);
  });
  const kept = curated.filter((m) => liveIds.has(m.id));
  const rest = visible.filter((m) => !kept.some((k) => k.id === m.id)).sort((a, b) => score(provider, b.id) - score(provider, a.id));
  const merged = [...kept, ...rest];
  // If none of our curated picks is available on this key, recommend the top-ranked live model.
  if (!merged.some((m) => m.recommended) && merged[0]) merged[0] = { ...merged[0], recommended: true };
  return merged;
}
