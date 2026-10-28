import { handle } from "@/server/auth";
import { projectFor, type Ctx } from "@/server/route-helpers";
import { zipProject } from "@/server/projects";

export const GET = handle(async (_req: Request, ctx: Ctx<{ id: string }>) => {
  const { project } = await projectFor(ctx);
  const buf = await zipProject(project.id);
  const name = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "project";
  return new Response(new Uint8Array(buf), {
    headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${name}.zip"` },
  });
});
