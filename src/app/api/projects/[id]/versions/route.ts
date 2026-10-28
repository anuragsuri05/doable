import { handle } from "@/server/auth";
import { projectFor, type Ctx } from "@/server/route-helpers";
import { listVersions } from "@/server/projects";

export const GET = handle(async (_req: Request, ctx: Ctx<{ id: string }>) => {
  const { project } = await projectFor(ctx);
  return Response.json({ versions: listVersions(project.id), publishedCommit: project.published_commit });
});
