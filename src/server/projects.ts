import "server-only";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, execFile } from "node:child_process";
import { promisify } from "node:util";
import JSZip from "jszip";
import { db, newId, now, type ProjectRow } from "./db";
import { projectDir, safeJoin, TEMPLATES_DIR } from "./paths";
import { decrypt, encrypt } from "./crypto";

const execFileAsync = promisify(execFile);
const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", ".vite"]);
// Secrets live in .env.local (written from the encrypted project env); never list, zip or expose them.
const HIDDEN_FILES = new Set([".DS_Store", ".env.local"]);
const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: "Doable",
  GIT_AUTHOR_EMAIL: "agent@doable.local",
  GIT_COMMITTER_NAME: "Doable",
  GIT_COMMITTER_EMAIL: "agent@doable.local",
};

function git(dir: string, args: string[]) {
  return execFileSync("git", ["-C", dir, ...args], { env: GIT_ENV, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();
}

function slugify(name: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "app";
  return `${base}-${newId(5)}`;
}

/** Copy node_modules cheaply: APFS/reflink clone when possible, otherwise leave it for `install`. */
function cloneNodeModules(from: string, to: string) {
  const src = path.join(from, "node_modules");
  if (!fs.existsSync(src)) return;
  try {
    if (process.platform === "darwin") execFileSync("cp", ["-cR", src, to]);
    else execFileSync("cp", ["-r", "--reflink=auto", src, to]);
  } catch {
    // install will run on first preview
  }
}

function copyTree(from: string, to: string) {
  fs.cpSync(from, to, {
    recursive: true,
    filter: (src) => !IGNORED_DIRS.has(path.basename(src)) || src === from,
  });
}

export function createProject(userId: string, opts: { name: string; description?: string; template?: string; remixFrom?: string }) {
  const id = newId(12);
  const dir = projectDir(id);
  const source = opts.remixFrom ? projectDir(opts.remixFrom) : path.join(TEMPLATES_DIR, opts.template || "react-vite");
  copyTree(source, dir);
  cloneNodeModules(source, dir);
  if (opts.remixFrom) fs.rmSync(path.join(dir, ".git"), { recursive: true, force: true });
  git(dir, ["init", "-q", "-b", "main"]);
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-q", "-m", opts.remixFrom ? "Remixed project" : "Initial commit"]);
  const t = now();
  db.prepare(
    `INSERT INTO projects (id, user_id, name, description, slug, remixed_from, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, userId, opts.name, opts.description ?? "", slugify(opts.name), opts.remixFrom ?? null, t, t);
  return id;
}

export function deleteProject(id: string) {
  db.prepare("DELETE FROM projects WHERE id = ?").run(id);
  fs.rmSync(projectDir(id), { recursive: true, force: true });
}

// ---------- Files ----------

export interface FileEntry { path: string; size: number }

export function listFiles(projectId: string): FileEntry[] {
  const root = projectDir(projectId);
  const out: FileEntry[] = [];
  const walk = (dir: string) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (IGNORED_DIRS.has(ent.name) || HIDDEN_FILES.has(ent.name)) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else out.push({ path: path.relative(root, full).split(path.sep).join("/"), size: fs.statSync(full).size });
    }
  };
  walk(root);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

export function readFile(projectId: string, rel: string): string {
  if (HIDDEN_FILES.has(rel.replace(/^\/+/, "").split("/")[0])) throw new Error("File not found");
  return fs.readFileSync(safeJoin(projectDir(projectId), rel), "utf8");
}

export function fileExists(projectId: string, rel: string) {
  try {
    return fs.statSync(safeJoin(projectDir(projectId), rel)).isFile();
  } catch {
    return false;
  }
}

function assertWritable(rel: string) {
  const first = rel.replace(/^\/+/, "").split("/")[0];
  if (IGNORED_DIRS.has(first)) throw new Error(`Cannot modify ${first}/`);
  if (HIDDEN_FILES.has(first)) throw new Error(`${first} is managed by Doable. Use project secrets instead.`);
}

export function writeFile(projectId: string, rel: string, contents: string) {
  assertWritable(rel);
  const target = safeJoin(projectDir(projectId), rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}

export function deleteFile(projectId: string, rel: string) {
  assertWritable(rel);
  const target = safeJoin(projectDir(projectId), rel);
  fs.rmSync(target, { force: true, recursive: true });
}

export function renameFile(projectId: string, from: string, to: string) {
  assertWritable(from);
  assertWritable(to);
  const root = projectDir(projectId);
  const dest = safeJoin(root, to);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(safeJoin(root, from), dest);
}

// ---------- Versions (git) ----------

export function commitAll(projectId: string, message: string): string | null {
  const dir = projectDir(projectId);
  git(dir, ["add", "-A"]);
  const status = git(dir, ["status", "--porcelain"]);
  if (!status) return null;
  git(dir, ["commit", "-q", "-m", message.slice(0, 200) || "Update"]);
  return git(dir, ["rev-parse", "HEAD"]);
}

export function headSha(projectId: string) {
  return git(projectDir(projectId), ["rev-parse", "HEAD"]);
}

export interface Version { sha: string; message: string; date: number; files: string[] }

export function listVersions(projectId: string, limit = 100): Version[] {
  const raw = git(projectDir(projectId), ["log", `-n${limit}`, "--name-only", "--format=%x1e%H%x1f%ct%x1f%s"]);
  return raw
    .split("\x1e")
    .filter(Boolean)
    .map((chunk) => {
      const [header, ...rest] = chunk.trim().split("\n");
      const [sha, ct, message] = header.split("\x1f");
      return { sha, message, date: Number(ct) * 1000, files: rest.filter(Boolean) };
    });
}

export function restoreVersion(projectId: string, sha: string) {
  if (!/^[0-9a-f]{7,40}$/.test(sha)) throw new Error("Invalid version");
  const dir = projectDir(projectId);
  git(dir, ["restore", `--source=${sha}`, "--staged", "--worktree", "--", "."]);
  const short = sha.slice(0, 7);
  return commitAll(projectId, `Restore to ${short}`) ?? headSha(projectId);
}

export function diffForCommit(projectId: string, sha: string) {
  if (!/^[0-9a-f]{7,40}$/.test(sha)) throw new Error("Invalid version");
  return git(projectDir(projectId), ["show", "--format=", "--patch", "--no-color", sha]).slice(0, 400_000);
}

export function readFileAt(projectId: string, sha: string, rel: string) {
  return git(projectDir(projectId), ["show", `${sha}:${rel}`]);
}

// ---------- Export ----------

export async function zipProject(projectId: string): Promise<Buffer> {
  const zip = new JSZip();
  const root = projectDir(projectId);
  for (const f of listFiles(projectId)) zip.file(f.path, fs.readFileSync(path.join(root, f.path)));
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

// ---------- Project env (secrets) ----------

export function getProjectEnv(p: ProjectRow): Record<string, string> {
  if (!p.env_enc) return {};
  try {
    return JSON.parse(decrypt(p.env_enc));
  } catch {
    return {};
  }
}

export function setProjectEnv(projectId: string, env: Record<string, string>) {
  db.prepare("UPDATE projects SET env_enc = ?, updated_at = ? WHERE id = ?").run(encrypt(JSON.stringify(env)), now(), projectId);
  // Vite only exposes VITE_* vars to the client; everything is written so server tools can use them.
  const lines = Object.entries(env).map(([k, v]) => `${k}=${JSON.stringify(v)}`);
  fs.writeFileSync(path.join(projectDir(projectId), ".env.local"), lines.join("\n") + "\n");
}

export async function gitAsync(projectId: string, args: string[]) {
  const { stdout } = await execFileAsync("git", ["-C", projectDir(projectId), ...args], { env: GIT_ENV, maxBuffer: 64 * 1024 * 1024 });
  return stdout.trim();
}
