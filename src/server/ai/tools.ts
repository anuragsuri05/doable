import "server-only";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import * as files from "../projects";
import * as sandbox from "../sandbox";
import { db, now } from "../db";
import { projectDir } from "../paths";
import { getClientErrors } from "./client-errors";
import { checkApp } from "../check";

export interface ToolResult {
  ok: boolean;
  output: string;
  summary: string;
}

export interface ToolDef {
  name: string;
  description: string;
  schema: z.ZodObject;
  readOnly: boolean;
  /** Key in the input that is worth showing in the UI while streaming (e.g. the file path). */
  label?: string;
  run: (projectId: string, input: never) => Promise<ToolResult>;
}

const ok = (output: string, summary: string): ToolResult => ({ ok: true, output, summary });
const fail = (output: string): ToolResult => ({ ok: false, output, summary: output.slice(0, 200) });

function define<S extends z.ZodObject>(def: {
  name: string;
  description: string;
  schema: S;
  readOnly: boolean;
  label?: string;
  run: (projectId: string, input: z.infer<S>) => Promise<ToolResult>;
}): ToolDef {
  return def as unknown as ToolDef;
}

const PROTECTED = new Set(["doable.plugin.ts"]);

export const TOOLS: ToolDef[] = [
  define({
    name: "list_files",
    description: "List every file in the project with its size in bytes. node_modules, dist and .git are excluded.",
    schema: z.object({}),
    readOnly: true,
    run: async (pid) => {
      const list = files.listFiles(pid);
      return ok(list.map((f) => `${f.path} (${f.size}b)`).join("\n"), `${list.length} files`);
    },
  }),
  define({
    name: "read_file",
    description: "Read a project file. Optionally pass a 1-based line range for large files. Lines are returned with numbers.",
    schema: z.object({
      path: z.string().describe("Path relative to the project root, e.g. src/App.tsx"),
      start_line: z.number().int().optional(),
      end_line: z.number().int().optional(),
    }),
    readOnly: true,
    label: "path",
    run: async (pid, { path: p, start_line, end_line }) => {
      if (!files.fileExists(pid, p)) return fail(`File not found: ${p}`);
      const lines = files.readFile(pid, p).split("\n");
      const s = Math.max(1, start_line ?? 1);
      const e = Math.min(lines.length, end_line ?? lines.length);
      const body = lines
        .slice(s - 1, e)
        .map((l, i) => `${String(s + i).padStart(4)}| ${l}`)
        .join("\n");
      return ok(body, `Read ${p}`);
    },
  }),
  define({
    name: "write_file",
    description:
      "Create or overwrite a file with the complete contents. Use for new files or full rewrites; prefer edit_file for small changes to existing files.",
    schema: z.object({ path: z.string(), contents: z.string().describe("The full file contents") }),
    readOnly: false,
    label: "path",
    run: async (pid, { path: p, contents }) => {
      if (PROTECTED.has(p)) return fail(`${p} is managed by Doable and cannot be changed.`);
      const existed = files.fileExists(pid, p);
      files.writeFile(pid, p, contents);
      return ok(`Wrote ${p} (${contents.split("\n").length} lines)`, `${existed ? "Updated" : "Created"} ${p}`);
    },
  }),
  define({
    name: "edit_file",
    description:
      "Replace an exact string in a file. old_string must match the file exactly (including indentation) and be unique unless replace_all is true. Read the file first.",
    schema: z.object({
      path: z.string(),
      old_string: z.string(),
      new_string: z.string(),
      replace_all: z.boolean().optional(),
    }),
    readOnly: false,
    label: "path",
    run: async (pid, { path: p, old_string, new_string, replace_all }) => {
      if (PROTECTED.has(p)) return fail(`${p} is managed by Doable and cannot be changed.`);
      if (!files.fileExists(pid, p)) return fail(`File not found: ${p}`);
      const src = files.readFile(pid, p);
      const count = src.split(old_string).length - 1;
      if (count === 0) return fail(`old_string not found in ${p}. Re-read the file and copy the text exactly.`);
      if (count > 1 && !replace_all) return fail(`old_string occurs ${count} times in ${p}; add more context or set replace_all.`);
      const next = replace_all ? src.split(old_string).join(new_string) : src.replace(old_string, () => new_string);
      files.writeFile(pid, p, next);
      return ok(`Edited ${p} (${count} replacement${count > 1 ? "s" : ""})`, `Edited ${p}`);
    },
  }),
  define({
    name: "delete_file",
    description: "Delete a file or folder from the project.",
    schema: z.object({ path: z.string() }),
    readOnly: false,
    label: "path",
    run: async (pid, { path: p }) => {
      if (PROTECTED.has(p) || p === "package.json" || p === "index.html") return fail(`${p} cannot be deleted.`);
      files.deleteFile(pid, p);
      return ok(`Deleted ${p}`, `Deleted ${p}`);
    },
  }),
  define({
    name: "rename_file",
    description: "Move or rename a file.",
    schema: z.object({ from: z.string(), to: z.string() }),
    readOnly: false,
    label: "from",
    run: async (pid, { from, to }) => {
      files.renameFile(pid, from, to);
      return ok(`Renamed ${from} -> ${to}`, `Renamed ${from} → ${to}`);
    },
  }),
  define({
    name: "search_files",
    description: "Search project files with a regular expression. Returns matching lines as path:line: text (max 100).",
    schema: z.object({
      pattern: z.string().describe("JavaScript regular expression"),
      path_prefix: z.string().optional().describe("Only search under this folder, e.g. src/components"),
    }),
    readOnly: true,
    label: "pattern",
    run: async (pid, { pattern, path_prefix }) => {
      let re: RegExp;
      try {
        re = new RegExp(pattern, "i");
      } catch {
        return fail(`Invalid regular expression: ${pattern}`);
      }
      const hits: string[] = [];
      for (const f of files.listFiles(pid)) {
        if (path_prefix && !f.path.startsWith(path_prefix)) continue;
        if (f.size > 300_000 || /\.(png|jpe?g|gif|webp|ico|woff2?|lock|lockb)$/.test(f.path)) continue;
        const lines = files.readFile(pid, f.path).split("\n");
        lines.forEach((l, i) => {
          if (hits.length < 100 && re.test(l)) hits.push(`${f.path}:${i + 1}: ${l.trim().slice(0, 200)}`);
        });
      }
      return ok(hits.join("\n") || "No matches", `${hits.length} matches for /${pattern}/`);
    },
  }),
  define({
    name: "add_dependencies",
    description: "Install npm packages into the project (updates package.json). Use for libraries not already in package.json.",
    schema: z.object({ packages: z.array(z.string()).min(1), dev: z.boolean().optional() }),
    readOnly: false,
    label: "packages",
    run: async (pid, { packages, dev }) => {
      const bad = packages.find((p) => !/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*(@[\w.^~<>=*-]+)?$/i.test(p));
      if (bad) return fail(`Invalid package name: ${bad}`);
      try {
        await sandbox.installDeps(pid, packages, dev);
        return ok(`Installed ${packages.join(", ")}`, `Installed ${packages.join(", ")}`);
      } catch (err) {
        return fail(`Install failed: ${err instanceof Error ? err.message : err}\n${sandbox.recentLogs(pid, 20).join("\n")}`);
      }
    },
  }),
  define({
    name: "read_console_logs",
    description:
      "Read the latest dev-server output and browser errors from the live preview. Use this to debug build errors and runtime crashes.",
    schema: z.object({}),
    readOnly: true,
    run: async (pid) => {
      const server = sandbox.recentLogs(pid, 60).join("\n");
      const browser = getClientErrors(pid)
        .map((e) => `[${e.kind}] ${e.message}`)
        .join("\n");
      return ok(`## Dev server\n${server || "(empty)"}\n\n## Browser\n${browser || "(no errors)"}`, "Read console logs");
    },
  }),
  define({
    name: "check_app",
    description:
      "Check that the app actually works: compiles every module reachable from src/main.tsx (missing files, bad imports, missing packages, syntax errors), then opens each page in a headless browser and reports runtime crashes, console errors and blank (white) screens. Run it after multi-file changes and before you finish.",
    schema: z.object({}),
    readOnly: true,
    run: async (pid) => {
      const r = await checkApp(pid);
      return r.ok
        ? ok(
            `OK: ${r.modules} modules compiled${r.runtime === "ok" ? " and every page rendered without errors" : ""}.`,
            r.runtime === "ok" ? `App works (${r.modules} modules, pages render)` : `App compiles (${r.modules} modules)`,
          )
        : { ok: true, output: `${r.errors.length} error(s):\n\n${r.errors.join("\n\n")}`, summary: `${r.errors.length} error${r.errors.length === 1 ? "" : "s"} found` };
    },
  }),
  define({
    name: "rename_project",
    description: "Give the project a short, memorable name (2-4 words). Call this once when building the first version of a new app.",
    schema: z.object({ name: z.string().min(1).max(60) }),
    readOnly: false,
    label: "name",
    run: async (pid, { name }) => {
      db.prepare("UPDATE projects SET name = ?, updated_at = ? WHERE id = ?").run(name, now(), pid);
      // Keep the HTML title in sync for new projects that still use the template title.
      const html = path.join(projectDir(pid), "index.html");
      if (fs.existsSync(html)) {
        const src = fs.readFileSync(html, "utf8");
        if (src.includes("<title>Doable App</title>")) fs.writeFileSync(html, src.replace("<title>Doable App</title>", `<title>${name.replace(/[<>&]/g, "")}</title>`));
      }
      return ok(`Project renamed to ${name}`, `Named project “${name}”`);
    },
  }),
];

export function toolsForMode(mode: "build" | "plan" | "chat") {
  return mode === "build" ? TOOLS : TOOLS.filter((t) => t.readOnly);
}

export function jsonSchema(t: ToolDef): Record<string, unknown> {
  const schema = z.toJSONSchema(t.schema) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}

/** Validate model-supplied input against the tool's schema, then run it. */
export async function executeTool(projectId: string, name: string, input: unknown): Promise<ToolResult> {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) return fail(`Unknown tool: ${name}`);
  const parsed = tool.schema.safeParse(input ?? {});
  if (!parsed.success) return fail(`INVALID_INPUT: ${parsed.error.message}. Input received: ${JSON.stringify(input).slice(0, 500)}`);
  try {
    return await tool.run(projectId, parsed.data as never);
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}
