import "server-only";
import { z } from "zod";
import { getProjectForUser, type ProjectRow, type UserRow } from "./db";
import { HttpError, requireUser } from "./auth";

export type Ctx<P extends Record<string, string | string[]>> = { params: Promise<P> };

export async function body<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  return parsed.data;
}

export async function projectFor(ctx: Ctx<{ id: string }>): Promise<{ user: UserRow; project: ProjectRow }> {
  const user = await requireUser();
  const { id } = await ctx.params;
  const project = /^[a-z0-9]+$/.test(id) ? getProjectForUser(id, user.id) : undefined;
  if (!project) throw new HttpError(404, "Project not found");
  return { user, project };
}

export const imageSchema = z.object({
  name: z.string().max(200),
  mediaType: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif"]),
  data: z.string().max(14_000_000),
});

export const providerSchema = z.enum(["anthropic", "openai", "google"]);
export const modeSchema = z.enum(["build", "plan", "chat"]);
