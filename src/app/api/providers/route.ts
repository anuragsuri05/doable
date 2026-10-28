import { z } from "zod";
import { handle, HttpError, requireUser } from "@/server/auth";
import { body } from "@/server/route-helpers";
import { deleteKey, keyStatus, saveKey } from "@/server/ai/keys";
import { fetchLiveModels } from "@/server/ai/models";
import { db } from "@/server/db";
import type { Provider } from "@/lib/types";

const anyProvider = z.enum(["anthropic", "openai", "google", "github"]);

export const GET = handle(async () => {
  const user = await requireUser();
  const github = db.prepare("SELECT hint FROM provider_keys WHERE user_id = ? AND provider = 'github'").get(user.id) as { hint: string } | undefined;
  return Response.json({ providers: keyStatus(user.id), github: { connected: !!github, hint: github?.hint ?? null } });
});

/** Save a key after verifying it against the provider. */
export const PUT = handle(async (req: Request) => {
  const user = await requireUser();
  const { provider, apiKey } = await body(req, z.object({ provider: anyProvider, apiKey: z.string().min(8).max(500) }));
  const key = apiKey.trim();
  if (provider === "github") {
    const res = await fetch("https://api.github.com/user", { headers: { authorization: `Bearer ${key}`, accept: "application/vnd.github+json" } });
    if (!res.ok) throw new HttpError(400, "GitHub rejected this token.");
    const u = await res.json();
    saveKey(user.id, "github" as Provider, key);
    return Response.json({ ok: true, account: u.login });
  }
  try {
    const models = await fetchLiveModels(provider, key);
    saveKey(user.id, provider, key);
    return Response.json({ ok: true, modelCount: models.length });
  } catch (err) {
    throw new HttpError(400, `Could not verify the key: ${err instanceof Error ? err.message.slice(0, 200) : err}`);
  }
});

export const DELETE = handle(async (req: Request) => {
  const user = await requireUser();
  const provider = anyProvider.parse(new URL(req.url).searchParams.get("provider"));
  deleteKey(user.id, provider as Provider);
  return Response.json({ ok: true });
});
