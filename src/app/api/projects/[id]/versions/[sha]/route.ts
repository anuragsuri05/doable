import { handle } from "@/server/auth";
import { projectFor, type Ctx } from "@/server/route-helpers";
import { diffForCommit } from "@/server/projects";

export const GET = handle(async (_req: Request, ctx: Ctx<{ id: string; sha: string }>) => {
  const { project } = await projectFor(ctx as unknown as Ctx<{ id: string }>);
  const { sha } = await ctx.params;
  return Response.json({ diff: diffForCommit(project.id, sha) });
});
