import { z } from "zod";
import { handle } from "@/server/auth";
import { body, projectFor, type Ctx } from "@/server/route-helpers";
import { addClientErrors, clearClientErrors } from "@/server/ai/client-errors";

export const POST = handle(async (req: Request, ctx: Ctx<{ id: string }>) => {
  const { project } = await projectFor(ctx);
  const { errors } = await body(req, z.object({ errors: z.array(z.object({ kind: z.string().max(40), message: z.string().max(8000) })).max(20) }));
  addClientErrors(project.id, errors);
  return Response.json({ ok: true });
});

export const DELETE = handle(async (_req: Request, ctx: Ctx<{ id: string }>) => {
  const { project } = await projectFor(ctx);
  clearClientErrors(project.id);
  return Response.json({ ok: true });
});
