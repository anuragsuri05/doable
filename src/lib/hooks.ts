"use client";
import * as React from "react";
import { api } from "./api";
import type { ModelInfo, Provider } from "./types";

export interface Me { id: string; email: string; name: string; createdAt: number }

let meCache: Promise<{ user: Me | null }> | null = null;
export function useMe() {
  const [me, setMe] = React.useState<Me | null | undefined>(undefined);
  React.useEffect(() => {
    meCache ??= api<{ user: Me | null }>("/api/auth/me");
    meCache.then((r) => setMe(r.user)).catch(() => setMe(null));
  }, []);
  return me;
}
export function resetMeCache() {
  meCache = null;
}

export type ModelsResponse = Record<Provider, { available: boolean; source: "user" | "platform" | null; models: ModelInfo[]; error?: string }>;
let modelsCache: Promise<ModelsResponse> | null = null;
export function invalidateModels() {
  modelsCache = null;
}
export function useModels() {
  const [data, setData] = React.useState<ModelsResponse | null>(null);
  const [version, setVersion] = React.useState(0);
  React.useEffect(() => {
    modelsCache ??= api<{ providers: ModelsResponse }>("/api/models").then((r) => r.providers);
    modelsCache.then(setData).catch(() => setData(null));
  }, [version]);
  return {
    data,
    refresh: () => {
      invalidateModels();
      setVersion((v) => v + 1);
    },
  };
}

export interface ModelChoice { provider: Provider; model: string }
const CHOICE_KEY = "doable-model";

/** The model the user last picked, falling back to the first provider with a key. */
export function useModelChoice(models: ModelsResponse | null) {
  const [choice, setChoiceState] = React.useState<ModelChoice | null>(null);
  React.useEffect(() => {
    if (!models) return;
    let saved: ModelChoice | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(CHOICE_KEY) || "null");
    } catch {}
    if (saved && models[saved.provider]?.available) {
      setChoiceState(saved);
      return;
    }
    const order: Provider[] = ["anthropic", "openai", "google"];
    const p = order.find((x) => models[x]?.available) ?? "anthropic";
    const list = models[p]?.models ?? [];
    setChoiceState({ provider: p, model: (list.find((m) => m.recommended) ?? list[0])?.id ?? "claude-opus-5-5" });
  }, [models]);
  const setChoice = React.useCallback((c: ModelChoice) => {
    setChoiceState(c);
    try {
      localStorage.setItem(CHOICE_KEY, JSON.stringify(c));
    } catch {}
  }, []);
  return [choice, setChoice] as const;
}

export function useTheme() {
  const [theme, setThemeState] = React.useState<"light" | "dark" | "system">("system");
  React.useEffect(() => {
    try {
      setThemeState((localStorage.getItem("doable-theme") as "light" | "dark" | "system") || "system");
    } catch {}
  }, []);
  const setTheme = (t: "light" | "dark" | "system") => {
    setThemeState(t);
    try {
      localStorage.setItem("doable-theme", t);
    } catch {}
    const dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  };
  return [theme, setTheme] as const;
}
