import "server-only";
import fs from "node:fs";
import path from "node:path";
import { db, now, type ProjectRow } from "./db";
import { SITES_DIR } from "./paths";
import { buildForPublish } from "./sandbox";
import { headSha } from "./projects";

export function siteDir(slug: string) {
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("Invalid slug");
  return path.join(SITES_DIR, slug);
}

export async function publish(p: ProjectRow) {
  const final = siteDir(p.slug);
  const tmp = `${final}.building`;
  await buildForPublish(p.id, tmp);
  fs.rmSync(final, { recursive: true, force: true });
  fs.renameSync(tmp, final);
  const sha = headSha(p.id);
  db.prepare("UPDATE projects SET published_at = ?, published_commit = ? WHERE id = ?").run(now(), sha, p.id);
  return { publishedAt: now(), commit: sha };
}

export function unpublish(p: ProjectRow) {
  fs.rmSync(siteDir(p.slug), { recursive: true, force: true });
  db.prepare("UPDATE projects SET published_at = NULL, published_commit = NULL WHERE id = ?").run(p.id);
}

export function changeSlug(p: ProjectRow, slug: string) {
  if (!/^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/.test(slug)) throw new Error("Use 3-48 lowercase letters, numbers and dashes.");
  const taken = db.prepare("SELECT id FROM projects WHERE slug = ? AND id != ?").get(slug, p.id);
  if (taken) throw new Error("That subdomain is taken.");
  if (fs.existsSync(siteDir(p.slug))) fs.renameSync(siteDir(p.slug), siteDir(slug));
  db.prepare("UPDATE projects SET slug = ? WHERE id = ?").run(slug, p.id);
}

/** Public URL of a published site: <slug>.<host>, e.g. my-app.localhost:3000 or my-app.doable.app */
export function siteUrl(slug: string, reqHost: string | null, proto = "http") {
  const base = process.env.DOABLE_SITES_HOST || reqHost || "localhost:3000";
  return `${proto}://${slug}.${base.replace(/^www\./, "")}`;
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".map": "application/json",
};

export function serveSiteFile(slug: string, reqPath: string): Response {
  let root: string;
  try {
    root = siteDir(slug);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (!fs.existsSync(root)) return new Response("This site is not published.", { status: 404 });
  const clean = path.normalize(decodeURIComponent(reqPath)).replace(/^(\.\.(\/|\\|$))+/, "");
  let file = path.join(root, clean);
  if (!file.startsWith(root)) return new Response("Not found", { status: 404 });
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    // SPA fallback: unknown paths without an extension render index.html
    file = path.extname(clean) ? "" : path.join(root, "index.html");
  }
  if (!file || !fs.existsSync(file)) return new Response("Not found", { status: 404 });
  const ext = path.extname(file);
  const immutable = clean.startsWith("assets/");
  return new Response(fs.readFileSync(file), {
    headers: {
      "content-type": MIME[ext] ?? "application/octet-stream",
      "cache-control": immutable ? "public, max-age=31536000, immutable" : "no-cache",
    },
  });
}
