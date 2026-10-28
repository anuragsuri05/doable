import "server-only";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import crypto from "node:crypto";
import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { projectDir } from "./paths";

/**
 * Local sandbox: each project runs its own Vite dev server as a child process.
 * Swap this module for a container/VM provider (Docker, E2B, Vercel Sandbox)
 * in production — the rest of the app only uses the exported functions.
 */

export type SandboxStatus = "stopped" | "installing" | "starting" | "running" | "error";

interface Sandbox {
  status: SandboxStatus;
  port: number | null;
  proc: ChildProcess | null;
  logs: string[];
  error: string | null;
  lastActive: number;
  depsHash: string | null;
  starting: Promise<void> | null;
}

type G = typeof globalThis & { __doableSandboxes?: Map<string, Sandbox>; __doableReaper?: NodeJS.Timeout };
const g = globalThis as G;
const sandboxes: Map<string, Sandbox> = g.__doableSandboxes ?? (g.__doableSandboxes = new Map());

const IDLE_MS = 20 * 60 * 1000;
if (!g.__doableReaper) {
  g.__doableReaper = setInterval(() => {
    for (const [id, sb] of sandboxes) if (sb.proc && Date.now() - sb.lastActive > IDLE_MS) stop(id);
  }, 60_000);
  g.__doableReaper.unref();
  const killAll = () => {
    for (const sb of sandboxes.values()) sb.proc?.kill("SIGTERM");
  };
  process.once("exit", killAll);
}

const PACKAGE_MANAGER = (() => {
  try {
    execFileSync("bun", ["--version"], { stdio: "ignore" });
    return "bun";
  } catch {
    return "npm";
  }
})();

function get(id: string): Sandbox {
  let sb = sandboxes.get(id);
  if (!sb) {
    sb = { status: "stopped", port: null, proc: null, logs: [], error: null, lastActive: Date.now(), depsHash: null, starting: null };
    sandboxes.set(id, sb);
  }
  return sb;
}

function log(sb: Sandbox, line: string) {
  for (const l of line.split(/\r?\n/)) {
    // strip ANSI colour codes
    const clean = l.replace(/\x1b\[[0-9;]*m/g, "");
    if (clean.trim()) sb.logs.push(clean);
  }
  if (sb.logs.length > 400) sb.logs.splice(0, sb.logs.length - 400);
}

function depsHash(dir: string) {
  const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
  return crypto.createHash("sha1").update(JSON.stringify([pkg.dependencies, pkg.devDependencies])).digest("hex");
}

async function freePort(start = 5200): Promise<number> {
  const used = new Set([...sandboxes.values()].map((s) => s.port));
  for (let port = start; port < start + 800; port++) {
    if (used.has(port)) continue;
    const ok = await new Promise<boolean>((resolve) => {
      const srv = net.createServer();
      srv.once("error", () => resolve(false));
      srv.listen(port, "127.0.0.1", () => srv.close(() => resolve(true)));
    });
    if (ok) return port;
  }
  throw new Error("No free port for preview server");
}

function run(sb: Sandbox, cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    log(sb, `$ ${cmd} ${args.join(" ")}`);
    const p = spawn(cmd, args, { cwd, env: { ...process.env, CI: "1", NODE_ENV: "development" } });
    p.stdout.on("data", (d) => log(sb, d.toString()));
    p.stderr.on("data", (d) => log(sb, d.toString()));
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args[0]} exited with code ${code}`))));
  });
}

export async function installDeps(id: string, packages: string[] = [], dev = false) {
  const sb = get(id);
  const dir = projectDir(id);
  const prev = sb.status;
  sb.status = "installing";
  try {
    if (packages.length) {
      const args = PACKAGE_MANAGER === "bun" ? ["add", ...(dev ? ["-d"] : []), ...packages] : ["install", ...(dev ? ["-D"] : []), ...packages];
      await run(sb, PACKAGE_MANAGER, args, dir);
    } else {
      await run(sb, PACKAGE_MANAGER, ["install"], dir);
    }
    sb.depsHash = depsHash(dir);
  } finally {
    sb.status = sb.proc ? "running" : prev === "installing" ? "stopped" : prev;
  }
}

async function waitForPort(port: number, timeoutMs: number) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const ok = await new Promise<boolean>((resolve) => {
      const s = net.connect(port, "127.0.0.1");
      s.once("connect", () => (s.end(), resolve(true)));
      s.once("error", () => resolve(false));
    });
    if (ok) return;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("Preview server did not start in time");
}

async function boot(id: string, sb: Sandbox) {
  const dir = projectDir(id);
  sb.error = null;
  const hash = depsHash(dir);
  if (!fs.existsSync(path.join(dir, "node_modules", "vite")) || (sb.depsHash && sb.depsHash !== hash)) {
    sb.status = "installing";
    await installDeps(id);
  }
  sb.depsHash = hash;
  sb.status = "starting";
  const port = await freePort();
  sb.port = port;
  log(sb, `Starting dev server on port ${port}`);
  const proc = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--port", String(port), "--strictPort", "--host", "127.0.0.1"], {
    cwd: dir,
    env: { ...process.env, NODE_ENV: "development", VITE_CONFIG_NATIVE_IGNORE_WARNING: "true", FORCE_COLOR: "0" },
  });
  sb.proc = proc;
  proc.stdout?.on("data", (d) => log(sb, d.toString()));
  proc.stderr?.on("data", (d) => log(sb, d.toString()));
  proc.on("exit", (code) => {
    log(sb, `Dev server exited (${code})`);
    if (sb.proc === proc) {
      sb.proc = null;
      sb.port = null;
      sb.status = code === 0 || code === null ? "stopped" : "error";
      if (sb.status === "error") sb.error = `Dev server exited with code ${code}`;
    }
  });
  await waitForPort(port, 60_000);
  sb.status = "running";
}

export async function ensureRunning(id: string) {
  const sb = get(id);
  sb.lastActive = Date.now();
  if (sb.status === "running" && sb.proc) return sb;
  if (!sb.starting) {
    sb.starting = boot(id, sb)
      .catch((err) => {
        sb.status = "error";
        sb.error = err instanceof Error ? err.message : String(err);
        log(sb, `Error: ${sb.error}`);
        sb.proc?.kill();
      })
      .finally(() => {
        sb.starting = null;
      });
  }
  return sb;
}

export function stop(id: string) {
  const sb = sandboxes.get(id);
  if (!sb) return;
  sb.proc?.kill("SIGTERM");
  sb.proc = null;
  sb.port = null;
  sb.status = "stopped";
}

export async function restart(id: string) {
  stop(id);
  return ensureRunning(id);
}

export function status(id: string) {
  const sb = get(id);
  sb.lastActive = Date.now();
  return { status: sb.status, port: sb.port, error: sb.error, logs: sb.logs.slice(-200) };
}

export function recentLogs(id: string, n = 80) {
  return get(id).logs.slice(-n);
}

/** Restart dependencies if package.json changed (called after agent turns). */
export async function syncDeps(id: string) {
  const sb = get(id);
  const hash = depsHash(projectDir(id));
  if (sb.depsHash && sb.depsHash !== hash) {
    await installDeps(id);
    if (sb.proc) await restart(id);
  }
}

export async function buildForPublish(id: string, outDir: string) {
  const sb = get(id);
  const dir = projectDir(id);
  if (!fs.existsSync(path.join(dir, "node_modules", "vite"))) await installDeps(id);
  const lines: string[] = [];
  await new Promise<void>((resolve, reject) => {
    const p = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "build", "--outDir", outDir, "--emptyOutDir"], {
      cwd: dir,
      env: { ...process.env, NODE_ENV: "production", VITE_CONFIG_NATIVE_IGNORE_WARNING: "true", FORCE_COLOR: "0" },
    });
    const collect = (d: Buffer) => {
      lines.push(d.toString());
      log(sb, d.toString());
    };
    p.stdout.on("data", collect);
    p.stderr.on("data", collect);
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`Build failed:\n${lines.join("").slice(-3000)}`))));
  });
}
