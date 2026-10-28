import "server-only";
import path from "node:path";
import fs from "node:fs";

export const ROOT = process.cwd();
export const DATA_DIR = path.resolve(process.env.DOABLE_DATA_DIR || path.join(ROOT, ".data"));
export const PROJECTS_DIR = path.join(DATA_DIR, "projects");
export const SITES_DIR = path.join(DATA_DIR, "sites");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
export const TEMPLATES_DIR = path.join(ROOT, "templates");

for (const dir of [DATA_DIR, PROJECTS_DIR, SITES_DIR, UPLOADS_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

export function projectDir(projectId: string) {
  if (!/^[a-z0-9]+$/.test(projectId)) throw new Error("Invalid project id");
  return path.join(PROJECTS_DIR, projectId);
}

/** Resolve a model- or user-supplied relative path inside a root, rejecting escapes. */
export function safeJoin(root: string, rel: string) {
  const cleaned = rel.replace(/^\/+/, "");
  const target = path.resolve(root, cleaned);
  const relative = path.relative(root, target);
  if (!relative || relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) {
    throw new Error(`Path escapes the project root: ${rel}`);
  }
  return target;
}
