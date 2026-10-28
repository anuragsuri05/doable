import "server-only";
import { db, now } from "../db";
import { decrypt, encrypt } from "../crypto";
import type { Provider } from "@/lib/types";

const ENV_KEYS: Record<Provider, string[]> = {
  anthropic: ["ANTHROPIC_API_KEY"],
  openai: ["OPENAI_API_KEY"],
  google: ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
};

export type KeySource = "user" | "platform";

function platformKey(provider: Provider): string | null {
  if (process.env.DOABLE_PLATFORM_KEYS === "off") return null;
  for (const name of ENV_KEYS[provider]) if (process.env[name]) return process.env[name]!;
  return null;
}

/** The user's own key wins; otherwise fall back to the platform key from the server env. */
export function resolveKey(userId: string, provider: Provider): { apiKey: string; source: KeySource } | null {
  const row = db.prepare("SELECT enc_key FROM provider_keys WHERE user_id = ? AND provider = ?").get(userId, provider) as
    | { enc_key: string }
    | undefined;
  if (row) return { apiKey: decrypt(row.enc_key), source: "user" };
  const pk = platformKey(provider);
  return pk ? { apiKey: pk, source: "platform" } : null;
}

export function saveKey(userId: string, provider: Provider, apiKey: string) {
  const hint = `${apiKey.slice(0, 6)}…${apiKey.slice(-4)}`;
  db.prepare(
    `INSERT INTO provider_keys (user_id, provider, enc_key, hint, created_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, provider) DO UPDATE SET enc_key = excluded.enc_key, hint = excluded.hint, created_at = excluded.created_at`,
  ).run(userId, provider, encrypt(apiKey), hint, now());
}

export function deleteKey(userId: string, provider: Provider) {
  db.prepare("DELETE FROM provider_keys WHERE user_id = ? AND provider = ?").run(userId, provider);
}

export function keyStatus(userId: string) {
  const rows = db.prepare("SELECT provider, hint, created_at FROM provider_keys WHERE user_id = ?").all(userId) as {
    provider: Provider;
    hint: string;
    created_at: number;
  }[];
  return (["anthropic", "openai", "google"] as Provider[]).map((p) => {
    const r = rows.find((x) => x.provider === p);
    return {
      provider: p,
      connected: !!r,
      hint: r?.hint ?? null,
      connectedAt: r?.created_at ?? null,
      platformAvailable: !!platformKey(p),
    };
  });
}
