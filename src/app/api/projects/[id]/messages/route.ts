import { z } from "zod";
import { db, type MessageRow } from "@/server/db";
import { handle, HttpError } from "@/server/auth";
import { body, imageSchema, modeSchema, projectFor, providerSchema, type Ctx } from "@/server/route-helpers";
import { toChatMessage } from "@/server/serialize";
import { activeRun, startRun } from "@/server/ai/runner";

export const GET = handle(async (_req: Request, ctx: Ctx<{ id: string }>) => {
  const { project } = await projectFor(ctx);
  const rows = db.prepare("SELECT * FROM messages WHERE project_id = ? ORDER BY created_at ASC").all(project.id) as unknown as MessageRow[];
  return Response.json({ messages: rows.map(toChatMessage), running: !!activeRun(project.id) });
});

const selectedSchema = z.object({
  id: z.string().max(300),
  tag: z.string().max(60),
  className: z.string().max(2000),
  text: z.string().max(2000),
  directText: z.string().max(2000),
  hasOnlyText: z.boolean(),
  html: z.string().max(4000),
});

export const POST = handle(async (req: Request, ctx: Ctx<{ id: string }>) => {
  const { user, project } = await projectFor(ctx);
  const data = await body(
    req,
    z.object({
      text: z.string().min(1).max(50_000),
      mode: modeSchema,
      provider: providerSchema,
      model: z.string().min(1).max(120),
      images: z.array(imageSchema).max(10).default([]),
      selected: selectedSchema.nullable().optional(),
      route: z.string().max(500).optional(),
    }),
  );
  try {
    const r = startRun({ userId: user.id, project, ...data });
    return Response.json(r);
  } catch (err) {
    throw new HttpError(400, err instanceof Error ? err.message : String(err));
  }
});
