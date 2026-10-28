import "server-only";
import fs from "node:fs";
import puppeteer, { type Browser } from "puppeteer-core";

/**
 * Runtime check: open the running preview in a headless Chrome and report what a user
 * would see go wrong: uncaught exceptions, console errors, failed module loads, and
 * pages that render nothing. Catches crashes the compile check cannot (e.g. code that
 * throws when it loads, like a backend client created without its env vars).
 *
 * Uses the system Chrome/Chromium (set DOABLE_CHROME_PATH to override). If none is
 * found the check is skipped rather than failing the build.
 */

const CANDIDATES = [
  process.env.DOABLE_CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean) as string[];

const chromePath = CANDIDATES.find((p) => fs.existsSync(p)) ?? null;

type G = typeof globalThis & { __doableBrowser?: Promise<Browser> | null };
const g = globalThis as G;

async function browser(): Promise<Browser | null> {
  if (!chromePath) return null;
  if (g.__doableBrowser) {
    const b = await g.__doableBrowser.catch(() => null);
    if (b?.connected) return b;
  }
  g.__doableBrowser = puppeteer.launch({ executablePath: chromePath, headless: true, args: ["--no-first-run", "--no-default-browser-check"] });
  const b = await g.__doableBrowser.catch(() => null);
  if (!b) g.__doableBrowser = null;
  return b;
}

const NOISE = /Download the React DevTools|\[vite\] (connecting|connected)|was not wrapped in act|Failed to load resource: the server responded with a status of 404|favicon/i;

export interface RuntimeIssue {
  route: string;
  message: string;
}

/** Static routes from src/App.tsx (no params), so each page gets rendered once. */
export function routesFromApp(appSource: string, limit = 6): string[] {
  const routes = new Set<string>(["/"]);
  for (const m of appSource.matchAll(/path=["'`](\/[^"'`]*)["'`]/g)) {
    const r = m[1];
    if (r.includes(":") || r.includes("*")) continue;
    routes.add(r);
    if (routes.size >= limit) break;
  }
  return [...routes];
}

export async function runtimeCheck(origin: string, routes: string[]): Promise<{ skipped: boolean; issues: RuntimeIssue[] }> {
  const b = await browser();
  if (!b) return { skipped: true, issues: [] };
  const issues: RuntimeIssue[] = [];
  const page = await b.newPage();
  try {
    await page.setViewport({ width: 1280, height: 800 });
    let route = "/";
    const add = (message: string) => {
      const msg = message.slice(0, 1500);
      if (!NOISE.test(msg) && !issues.some((i) => i.message === msg)) issues.push({ route, message: msg });
    };
    page.on("pageerror", (e) => add(`Uncaught ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`));
    page.on("console", (m) => {
      if (m.type() === "error") add(`console.error: ${m.text()}`);
    });
    page.on("requestfailed", (r) => {
      if (r.url().startsWith(origin) && /\.(tsx?|jsx?|css)(\?|$)/.test(r.url())) add(`Failed to load ${r.url().replace(origin, "")}`);
    });

    for (const r of routes) {
      route = r;
      const before = issues.length;
      try {
        await page.goto(origin + r, { waitUntil: "networkidle2", timeout: 25_000 });
      } catch (err) {
        add(`Page did not finish loading: ${err instanceof Error ? err.message : err}`);
      }
      await new Promise((res) => setTimeout(res, 800));
      const blank = await page
        .evaluate(() => {
          const root = document.getElementById("root");
          return !!root && root.children.length === 0 && !(root.textContent || "").trim();
        })
        .catch(() => false);
      if (blank) add(issues.length > before ? `The page rendered blank (white screen).` : `The page rendered blank (white screen) with no error message.`);
    }
  } finally {
    await page.close().catch(() => {});
  }
  return { skipped: false, issues };
}
