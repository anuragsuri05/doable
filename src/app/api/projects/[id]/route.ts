import { z } from "zod";
import { db, now } from "@/server/db";
import { handle } from "@/server/auth";
import { deleteProject } from "@/server/projects";
import { body, projectFor, type Ctx } from "@/server/route-helpers";
import { toProjectSummary } from "@/server/serialize";
import { changeSlug, siteUrl } from "@/server/publish";
import { stop } from "@/server/sandbox";
import { stopRun } from "@/server/ai/runner";

export const GET = handle(async (req: Request, ctx: Ctx<{ id: string }>) => {
  const { project } = await projectFor(ctx);
  return Response.json({
    project: { ...toProjectSummary(project), knowledge: project.knowledge, publishedCommit: project.published_commit },
    siteUrl: siteUrl(project.slug, req.headers.get("host")),
  });
});

export const PATCH = handle(async (req: Request, ctx: Ctx<{ id: string }>) => {
  const { project } = await projectFor(ctx);
  const data = await body(
    req,
    z.object({
      name: z.string().min(1).max(80).optional(),
      description: z.string().max(500).optional(),
      starred: z.boolean().optional(),
      knowledge: z.string().max(20_000).optional(),
      visibility: z.enum(["private", "public"]).optional(),
      slug: z.string().optional(),
    }),
  );
  if (data.slug && data.slug !== project.slug) changeSlug(project, data.slug);
  const fields: Record<string, unknown> = {};
  if (data.name !== undefined) fields.name = data.name;
  if (data.description !== undefined) fields.description = data.description;
  if (data.starred !== undefined) fields.starred = data.starred ? 1 : 0;
  if (data.knowledge !== undefined) fields.knowledge = data.knowledge;
  if (data.visibility !== undefined) fields.visibility = data.visibility;
  const keys = Object.keys(fields);
  if (keys.length) {
    db.prepare(`UPDATE projects SET ${keys.map((k) => `${k} = ?`).join(", ")}, updated_at = ? WHERE id = ?`).run(
      ...(keys.map((k) => fields[k]) as (string | number)[]),
      now(),
      project.id,
    );
  }
  return Response.json({ ok: true });
});

export const DELETE = handle(async (_req: Request, ctx: Ctx<{ id: string }>) => {
  const { project } = await projectFor(ctx);
  stopRun(project.id);
  stop(project.id);
  deleteProject(project.id);
  return Response.json({ ok: true });
});
