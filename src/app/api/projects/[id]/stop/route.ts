import { handle } from "@/server/auth";
import { projectFor, type Ctx } from "@/server/route-helpers";
import { stopRun } from "@/server/ai/runner";

export const POST = handle(async (_req: Request, ctx: Ctx<{ id: string }>) => {
  const { project } = await projectFor(ctx);
  stopRun(project.id);
  return Response.json({ ok: true });
});
