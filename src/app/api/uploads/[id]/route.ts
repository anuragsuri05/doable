import { handle, requireUser } from "@/server/auth";
import { loadUpload } from "@/server/uploads";
import type { Ctx } from "@/server/route-helpers";

export const GET = handle(async (_req: Request, ctx: Ctx<{ id: string }>) => {
  await requireUser();
  const { id } = await ctx.params;
  const f = loadUpload(id);
  if (!f) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(f.data), { headers: { "content-type": f.mediaType, "cache-control": "private, max-age=31536000" } });
});
