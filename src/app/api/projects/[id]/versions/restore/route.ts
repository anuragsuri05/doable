import { z } from "zod";
import { handle, HttpError } from "@/server/auth";
import { body, projectFor, type Ctx } from "@/server/route-helpers";
import { restoreVersion } from "@/server/projects";
import { activeRun } from "@/server/ai/runner";
import { syncDeps } from "@/server/sandbox";

export const POST = handle(async (req: Request, ctx: Ctx<{ id: string }>) => {
  const { project } = await projectFor(ctx);
  const { sha } = await body(req, z.object({ sha: z.string() }));
  if (activeRun(project.id)) throw new HttpError(409, "Stop the running task before restoring.");
  const head = restoreVersion(project.id, sha);
  await syncDeps(project.id);
  return Response.json({ ok: true, sha: head });
});
