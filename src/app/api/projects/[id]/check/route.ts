import { handle } from "@/server/auth";
import { projectFor, type Ctx } from "@/server/route-helpers";
import { checkApp } from "@/server/check";

/** Compile-check the app (used by the editor when the preview renders blank). */
export const GET = handle(async (_req: Request, ctx: Ctx<{ id: string }>) => {
  const { project } = await projectFor(ctx);
  return Response.json(await checkApp(project.id, { timeoutMs: 30_000 }));
});
