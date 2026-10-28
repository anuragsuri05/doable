import { z } from "zod";
import { handle } from "@/server/auth";
import { body, projectFor, type Ctx } from "@/server/route-helpers";
import { getProjectEnv, setProjectEnv } from "@/server/projects";

export const GET = handle(async (_req: Request, ctx: Ctx<{ id: string }>) => {
  const { project } = await projectFor(ctx);
  const env = getProjectEnv(project);
  // Values are returned so the owner can edit them; secrets never leave the owner's session.
  return Response.json({ env });
});

export const PUT = handle(async (req: Request, ctx: Ctx<{ id: string }>) => {
  const { project } = await projectFor(ctx);
  const { env } = await body(
    req,
    z.object({ env: z.record(z.string().regex(/^[A-Z_][A-Z0-9_]*$/, "Use UPPER_SNAKE_CASE names"), z.string().max(10_000)) }),
  );
  setProjectEnv(project.id, env);
  return Response.json({ ok: true });
});
