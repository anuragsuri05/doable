import { z } from "zod";
import { handle, HttpError } from "@/server/auth";
import { body, projectFor, type Ctx } from "@/server/route-helpers";
import { commitAll, fileExists, readFile, writeFile } from "@/server/projects";

/** Find the end of a JSX opening tag that starts at `start` (the "<"), skipping strings and {expressions}. */
function openingTagEnd(src: string, start: number) {
  let depth = 0;
  let quote: string | null = null;
  for (let i = start + 1; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (c === ">" && depth === 0) return i;
  }
  return -1;
}

/**
 * Direct visual edits without an AI call (free, instant), like Lovable's Visual Edits:
 * change an element's text or its literal className string in the source.
 */
export const POST = handle(async (req: Request, ctx: Ctx<{ id: string }>) => {
  const { project } = await projectFor(ctx);
  const data = await body(
    req,
    z.object({
      elementId: z.string().regex(/^[^:]+:\d+:\d+$/),
      kind: z.enum(["text", "class"]),
      oldValue: z.string().max(5000),
      newValue: z.string().max(5000),
    }),
  );
  const [file, lineStr, colStr] = data.elementId.split(":");
  if (!fileExists(project.id, file)) throw new HttpError(404, `File not found: ${file}`);
  const src = readFile(project.id, file);
  const lines = src.split("\n");
  const line = Number(lineStr);
  const col = Number(colStr);
  if (line < 1 || line > lines.length) throw new HttpError(400, "Element location is out of date. Refresh the preview.");
  const start = lines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0) + (col - 1);
  if (src[start] !== "<") throw new HttpError(409, "The source changed since the preview loaded. Refresh and try again.");
  const end = openingTagEnd(src, start);
  if (end < 0) throw new HttpError(400, "Could not parse the element.");
  const tag = src.slice(start, end + 1);
  let next: string;

  if (data.kind === "class") {
    const m = tag.match(/className=(?:"([^"]*)"|'([^']*)'|\{"([^"]*)"\}|\{`([^`$]*)`\})/);
    if (!m) {
      if (/className=/.test(tag)) throw new HttpError(422, "This element's classes are computed in code. Ask the AI to change them instead.");
      const nameEnd = start + tag.match(/^<[\w.]+/)![0].length;
      next = `${src.slice(0, nameEnd)} className="${data.newValue}"${src.slice(nameEnd)}`;
    } else {
      const absolute = start + (m.index ?? 0);
      next = `${src.slice(0, absolute)}className="${data.newValue.replace(/"/g, "")}"${src.slice(absolute + m[0].length)}`;
    }
  } else {
    const oldText = data.oldValue.trim();
    if (!oldText) throw new HttpError(400, "This element has no text to edit.");
    const window = src.slice(end + 1, end + 1 + 5000);
    const idx = window.indexOf(oldText);
    if (idx < 0) throw new HttpError(422, "The text comes from code (a variable or prop). Ask the AI to change it instead.");
    const safe = data.newValue.replace(/[{}<>]/g, (c) => `{"${c}"}`);
    const at = end + 1 + idx;
    next = src.slice(0, at) + safe + src.slice(at + oldText.length);
  }
  writeFile(project.id, file, next);
  const sha = commitAll(project.id, `Visual edit in ${file}`);
  return Response.json({ ok: true, sha });
});
