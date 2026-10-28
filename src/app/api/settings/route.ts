import { z } from "zod";
import { handle, requireUser } from "@/server/auth";
import { body } from "@/server/route-helpers";
import { getUserSettings, setUserSettings } from "@/server/db";

export const GET = handle(async () => {
  const user = await requireUser();
  return Response.json({ settings: getUserSettings(user.id) });
});

export const PATCH = handle(async (req: Request) => {
  const user = await requireUser();
  const patch = await body(
    req,
    z.object({
      defaultProvider: z.enum(["anthropic", "openai", "google"]).optional(),
      defaultModel: z.string().max(120).optional(),
      effort: z.enum(["low", "medium", "high", "xhigh", "max"]).optional(),
      maxSteps: z.number().int().min(5).max(200).optional(),
      theme: z.enum(["light", "dark", "system"]).optional(),
    }),
  );
  return Response.json({ settings: setUserSettings(user.id, patch) });
});
