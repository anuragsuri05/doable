import { z } from "zod";
import { handle, HttpError } from "@/server/auth";
import { body, projectFor, type Ctx } from "@/server/route-helpers";
import { commitAll, deleteFile, listFiles, renameFile } from "@/server/projects";

export const GET = handle(async (_req: Request, ctx: Ctx<{ id: string }>) => {
  const { project } = await projectFor(ctx);
  return Response.json({ files: listFiles(project.id) });
});

/** Rename or delete a file from the code editor. */
export const POST = handle(async (req: Request, ctx: Ctx<{ id: string }>) => {
  const { project } = await projectFor(ctx);
  const data = await body(
    req,
    z.discriminatedUnion("action", [
      z.object({ action: z.literal("rename"), from: z.string(), to: z.string() }),
      z.object({ action: z.literal("delete"), path: z.string() }),
    ]),
  );
  try {
    if (data.action === "rename") {
      renameFile(project.id, data.from, data.to);
      commitAll(project.id, `Rename ${data.from} to ${data.to}`);
    } else {
      deleteFile(project.id, data.path);
      commitAll(project.id, `Delete ${data.path}`);
    }
  } catch (err) {
    throw new HttpError(400, err instanceof Error ? err.message : String(err));
  }
  return Response.json({ ok: true });
});
