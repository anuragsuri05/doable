import { z } from "zod";
import { db, type ProjectRow } from "@/server/db";
import { handle, requireUser } from "@/server/auth";
import { createProject } from "@/server/projects";
import { body, imageSchema, modeSchema, providerSchema } from "@/server/route-helpers";
import { toProjectSummary } from "@/server/serialize";
import { startRun } from "@/server/ai/runner";
import { ensureRunning } from "@/server/sandbox";

export const GET = handle(async () => {
  const user = await requireUser();
  const rows = db.prepare("SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC").all(user.id) as unknown as ProjectRow[];
  return Response.json({ projects: rows.map(toProjectSummary) });
});

/** Create a project; with a prompt, the first agent run starts immediately (like Lovable/v0's home prompt box). */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const data = await body(
    req,
    z.object({
      prompt: z.string().max(50_000).optional(),
      name: z.string().max(80).optional(),
      template: z.string().regex(/^[a-z0-9-]+$/).optional(),
      mode: modeSchema.default("build"),
      provider: providerSchema.optional(),
      model: z.string().max(120).optional(),
      images: z.array(imageSchema).max(10).default([]),
    }),
  );
  const name = data.name || (data.prompt ? data.prompt.split(/\s+/).slice(0, 5).join(" ").slice(0, 40) : "Untitled project");
  const id = createProject(user.id, { name, template: data.template });
  ensureRunning(id).catch(() => {});
  if (data.prompt && data.provider && data.model) {
    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as unknown as ProjectRow;
    startRun({ userId: user.id, project, text: data.prompt, images: data.images, mode: data.mode, provider: data.provider, model: data.model });
  }
  return Response.json({ id });
});
