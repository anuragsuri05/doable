import { z } from "zod";
import { handle } from "@/server/auth";
import { body, projectFor, type Ctx } from "@/server/route-helpers";
import { ensureRunning, installDeps, restart, status } from "@/server/sandbox";

export const GET = handle(async (_req: Request, ctx: Ctx<{ id: string }>) => {
  const { project } = await projectFor(ctx);
  return Response.json(status(project.id));
});

export const POST = handle(async (req: Request, ctx: Ctx<{ id: string }>) => {
  const { project } = await projectFor(ctx);
  const { action } = await body(req, z.object({ action: z.enum(["start", "restart", "reinstall"]) }));
  if (action === "start") await ensureRunning(project.id);
  if (action === "restart") await restart(project.id);
  if (action === "reinstall") {
    await installDeps(project.id).catch(() => {});
    await restart(project.id);
  }
  return Response.json(status(project.id));
});
