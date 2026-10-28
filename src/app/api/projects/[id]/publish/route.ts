import { handle, HttpError } from "@/server/auth";
import { projectFor, type Ctx } from "@/server/route-helpers";
import { publish, siteUrl, unpublish } from "@/server/publish";

export const POST = handle(async (req: Request, ctx: Ctx<{ id: string }>) => {
  const { project } = await projectFor(ctx);
  try {
    const r = await publish(project);
    return Response.json({ ...r, url: siteUrl(project.slug, req.headers.get("host")) });
  } catch (err) {
    throw new HttpError(400, err instanceof Error ? err.message : String(err));
  }
});

export const DELETE = handle(async (_req: Request, ctx: Ctx<{ id: string }>) => {
  const { project } = await projectFor(ctx);
  unpublish(project);
  return Response.json({ ok: true });
});
