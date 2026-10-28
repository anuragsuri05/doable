import { serveSiteFile } from "@/server/publish";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string; path?: string[] }> }) {
  const { slug, path } = await ctx.params;
  return serveSiteFile(slug, (path ?? []).join("/") || "index.html");
}
