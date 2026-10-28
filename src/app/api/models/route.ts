import { handle, requireUser } from "@/server/auth";
import { resolveKey } from "@/server/ai/keys";
import { fetchLiveModels, mergeModels } from "@/server/ai/models";
import type { ModelInfo, Provider } from "@/lib/types";

/** Models per provider: curated defaults merged with the live list the user's key can access. */
export const GET = handle(async () => {
  const user = await requireUser();
  const providers: Provider[] = ["anthropic", "openai", "google"];
  const out: Record<string, { available: boolean; source: string | null; models: ModelInfo[]; error?: string }> = {};
  await Promise.all(
    providers.map(async (p) => {
      const key = resolveKey(user.id, p);
      if (!key) {
        out[p] = { available: false, source: null, models: mergeModels(p, null) };
        return;
      }
      try {
        out[p] = { available: true, source: key.source, models: mergeModels(p, await fetchLiveModels(p, key.apiKey)) };
      } catch (err) {
        out[p] = { available: true, source: key.source, models: mergeModels(p, null), error: err instanceof Error ? err.message.slice(0, 200) : "error" };
      }
    }),
  );
  return Response.json({ providers: out });
});
