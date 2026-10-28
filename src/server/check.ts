import "server-only";
import { ensureRunning, status } from "./sandbox";
import { routesFromApp, runtimeCheck } from "./browser-check";
import { fileExists, readFile } from "./projects";

/**
 * Compile-check a project through its running Vite dev server: request the entry
 * module, then every /src module it imports, transitively. Vite transforms each one,
 * so missing files, bad import paths, missing npm packages and syntax errors come
 * back as HTTP 500s with the error text. Takes a second or two, no browser needed.
 */
export interface CheckResult {
  ok: boolean;
  errors: string[];
  modules: number;
  runtime: "ok" | "failed" | "skipped";
}

/**
 * Full check: compile every module, then (if that passes) render the app's pages in a
 * headless browser to catch runtime crashes and blank screens.
 */
export async function checkApp(projectId: string, opts: { timeoutMs?: number; settleMs?: number; runtime?: boolean } = {}): Promise<CheckResult> {
  const compiled = await compileCheck(projectId, opts);
  if (!compiled.ok || opts.runtime === false || !compiled.origin) return { ok: compiled.ok, errors: compiled.errors, modules: compiled.modules, runtime: "skipped" };
  const app = fileExists(projectId, "src/App.tsx") ? readFile(projectId, "src/App.tsx") : "";
  const rt = await runtimeCheck(compiled.origin, routesFromApp(app)).catch((err) => ({
    skipped: true,
    issues: [] as { route: string; message: string }[],
    err,
  }));
  if (rt.skipped) return { ok: true, errors: [], modules: compiled.modules, runtime: "skipped" };
  const errors = rt.issues.map((i) => `Runtime error on page ${i.route}: ${i.message}`);
  return { ok: errors.length === 0, errors, modules: compiled.modules, runtime: errors.length ? "failed" : "ok" };
}

async function compileCheck(
  projectId: string,
  opts: { timeoutMs?: number; settleMs?: number },
): Promise<{ ok: boolean; errors: string[]; modules: number; origin?: string }> {
  await ensureRunning(projectId);
  const until = Date.now() + (opts.timeoutMs ?? 90_000);
  let st = status(projectId);
  while (st.status !== "running" && Date.now() < until) {
    if (st.status === "error") return { ok: false, errors: [`Dev server failed to start: ${st.error ?? "unknown error"}\n${st.logs.slice(-15).join("\n")}`], modules: 0 };
    await new Promise((r) => setTimeout(r, 500));
    st = status(projectId);
  }
  if (!st.port) return { ok: false, errors: ["Dev server is not running"], modules: 0 };
  // Give Vite's file watcher time to see files the agent just wrote; otherwise it serves
  // the previous (cached) transform and a fresh breakage goes unnoticed.
  await new Promise((r) => setTimeout(r, opts.settleMs ?? 1500));
  const origin = `http://127.0.0.1:${st.port}`;

  const seen = new Set<string>();
  const importer = new Map<string, string>();
  const queue = ["/src/main.tsx"];
  const errors: string[] = [];
  const IMPORT_RE = /(?:\bfrom\s*|\bimport\s*\(?\s*)["'](\/src\/[^"'?]+)(?:\?[^"']*)?["']/g;

  while (queue.length && seen.size < 400) {
    const url = queue.shift()!;
    if (seen.has(url)) continue;
    seen.add(url);
    let res: Response;
    try {
      res = await fetch(origin + url, { signal: AbortSignal.timeout(20_000) });
    } catch (err) {
      errors.push(`${url}: request failed (${err instanceof Error ? err.message : err})`);
      continue;
    }
    const body = await res.text();
    if (!res.ok) {
      errors.push(`${url.slice(1)}: ${cleanViteError(body)}`);
      continue;
    }
    // Vite answers a request for a missing file with index.html (SPA fallback), status 200.
    if ((res.headers.get("content-type") ?? "").includes("text/html")) {
      const from = importer.get(url);
      errors.push(`${url.slice(1)} does not exist${from ? `, but ${from.slice(1)} imports it` : ""}. Create the file or remove/fix the import.`);
      continue;
    }
    for (const m of body.matchAll(IMPORT_RE)) {
      if (seen.has(m[1])) continue;
      if (!importer.has(m[1])) importer.set(m[1], url);
      queue.push(m[1]);
    }
  }
  return { ok: errors.length === 0, errors, modules: seen.size, origin };
}

function cleanViteError(body: string) {
  // Vite returns either JSON or an HTML error page that embeds `const error = {...}`.
  const field = (name: string) => {
    const m = body.match(new RegExp(`"${name}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
    if (!m) return null;
    try {
      return JSON.parse(`"${m[1]}"`) as string;
    } catch {
      return m[1];
    }
  };
  const message = field("message");
  if (message) {
    const frame = field("frame");
    return `${message}${frame ? `\n${frame}` : ""}`.replace(/\x1b\[[0-9;]*m/g, "").slice(0, 1500);
  }
  return body
    .replace(/\x1b\[[0-9;]*m/g, "")
    .replace(/<[^>]+>/g, "")
    .trim()
    .slice(0, 1200);
}
