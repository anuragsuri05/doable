import { z } from "zod";
import { handle, HttpError } from "@/server/auth";
import { body, projectFor, type Ctx } from "@/server/route-helpers";
import { commitAll, fileExists, readFile, readFileAt, writeFile } from "@/server/projects";

export const GET = handle(async (req: Request, ctx: Ctx<{ id: string }>) => {
  const { project } = await projectFor(ctx);
  const url = new URL(req.url);
  const path = url.searchParams.get("path") ?? "";
  const at = url.searchParams.get("at");
  if (at) {
    if (!/^[0-9a-f]{7,40}$/.test(at)) throw new HttpError(400, "Invalid version");
    try {
      return Response.json({ path, content: readFileAt(project.id, at, path) });
    } catch {
      return Response.json({ path, content: null });
    }
  }
  if (!fileExists(project.id, path)) throw new HttpError(404, "File not found");
  return Response.json({ path, content: readFile(project.id, path) });
});

/** Manual save from the code editor ("Dev mode"). Each save is a version, like Lovable. */
export const PUT = handle(async (req: Request, ctx: Ctx<{ id: string }>) => {
  const { project } = await projectFor(ctx);
  const { path, content } = await body(req, z.object({ path: z.string().min(1), content: z.string().max(5_000_000) }));
  if (path === "doable.plugin.ts") throw new HttpError(400, "doable.plugin.ts is managed by Doable");
  try {
    writeFile(project.id, path, content);
  } catch (err) {
    throw new HttpError(400, err instanceof Error ? err.message : String(err));
  }
  const sha = commitAll(project.id, `Edit ${path}`);
  return Response.json({ ok: true, sha });
});
