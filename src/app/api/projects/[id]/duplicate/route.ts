import { handle } from "@/server/auth";
import { createProject } from "@/server/projects";
import { projectFor, type Ctx } from "@/server/route-helpers";

export const POST = handle(async (_req: Request, ctx: Ctx<{ id: string }>) => {
  const { user, project } = await projectFor(ctx);
  const id = createProject(user.id, { name: `${project.name} (copy)`, description: project.description, remixFrom: project.id });
  return Response.json({ id });
});
