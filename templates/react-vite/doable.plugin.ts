// Doable dev-time plugin. Do not edit: it powers visual editing in the Doable editor.
// 1. Tags every JSX element with data-doable-id="path:line:col" so a click in the
//    preview maps back to source.
// 2. Injects a bridge script that talks to the editor over postMessage
//    (element selection, runtime errors, route changes).
import type { Plugin } from "vite";
import { parse } from "@babel/parser";
import MagicString from "magic-string";
import path from "node:path";

const BRIDGE_ID = "/@doable/bridge";

type Node = { type: string; start: number; end: number; loc?: { start: { line: number; column: number } }; [k: string]: unknown };

function walk(node: unknown, visit: (n: Node) => void) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }
  const n = node as Node;
  if (typeof n.type === "string") visit(n);
  for (const key in n) {
    if (key === "loc" || key === "leadingComments" || key === "trailingComments") continue;
    walk(n[key], visit);
  }
}

function elementName(name: Node): string {
  if (name.type === "JSXIdentifier") return name.name as string;
  if (name.type === "JSXMemberExpression") return `${elementName(name.object as Node)}.${elementName(name.property as Node)}`;
  return "";
}

export function doable(): Plugin {
  let root = process.cwd();
  return {
    name: "doable",
    enforce: "pre",
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      return id === BRIDGE_ID ? "\0doable-bridge" : null;
    },
    load(id) {
      return id === "\0doable-bridge" ? BRIDGE_SOURCE : null;
    },
    transformIndexHtml() {
      return [{ tag: "script", attrs: { type: "module", src: BRIDGE_ID }, injectTo: "head-prepend" }];
    },
    transform(code, id) {
      const file = id.split("?")[0];
      if (!/\.(jsx|tsx)$/.test(file) || file.includes("node_modules")) return null;
      let ast: unknown;
      try {
        ast = parse(code, { sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: true });
      } catch {
        return null; // let the React plugin report the syntax error
      }
      const rel = path.relative(root, file).split(path.sep).join("/");
      const s = new MagicString(code);
      walk(ast, (n) => {
        if (n.type !== "JSXOpeningElement") return;
        const nameNode = n.name as Node;
        const name = elementName(nameNode);
        if (!name || name === "Fragment" || name.endsWith(".Fragment")) return;
        const attrs = (n.attributes as Node[]) ?? [];
        if (attrs.some((a) => a.type === "JSXAttribute" && (a.name as Node)?.name === "data-doable-id")) return;
        const { line, column } = n.loc!.start;
        s.appendLeft(nameNode.end, ` data-doable-id="${rel}:${line}:${column + 1}"`);
      });
      return { code: s.toString(), map: s.generateMap({ hires: true }) };
    },
  };
}

const BRIDGE_SOURCE = `
const post = (msg) => { try { window.parent.postMessage({ source: "doable-preview", ...msg }, "*"); } catch {} };
let selectMode = false;
let hoverBox, selectBox, label;

function box(color, fill) {
  const el = document.createElement("div");
  Object.assign(el.style, { position: "fixed", pointerEvents: "none", zIndex: 2147483646, border: "2px solid " + color,
    background: fill, borderRadius: "4px", transition: "all 60ms ease-out", display: "none" });
  document.documentElement.appendChild(el);
  return el;
}
function ensure() {
  if (hoverBox) return;
  hoverBox = box("#8b5cf6", "rgba(139,92,246,0.08)");
  selectBox = box("#7c3aed", "rgba(124,58,237,0.12)");
  label = document.createElement("div");
  Object.assign(label.style, { position: "fixed", zIndex: 2147483647, pointerEvents: "none", background: "#7c3aed", color: "#fff",
    font: "500 11px/1 ui-sans-serif,system-ui", padding: "4px 6px", borderRadius: "4px", display: "none" });
  document.documentElement.appendChild(label);
}
function place(el, target) {
  const r = target.getBoundingClientRect();
  Object.assign(el.style, { display: "block", top: r.top + "px", left: r.left + "px", width: r.width + "px", height: r.height + "px" });
  return r;
}
function tagged(t) { return t && t.closest ? t.closest("[data-doable-id]") : null; }
function describe(el) {
  const r = el.getBoundingClientRect();
  const directText = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
  return { id: el.getAttribute("data-doable-id"), tag: el.tagName.toLowerCase(), className: el.getAttribute("class") || "",
    text: (el.innerText || "").trim().slice(0, 300), directText: directText.slice(0, 300),
    hasOnlyText: el.children.length === 0 && directText.length > 0,
    rect: { x: r.x, y: r.y, width: r.width, height: r.height },
    html: el.outerHTML.slice(0, 600) };
}
document.addEventListener("mousemove", (e) => {
  if (!selectMode) return;
  ensure();
  const el = tagged(e.target);
  if (!el) { hoverBox.style.display = "none"; label.style.display = "none"; return; }
  const r = place(hoverBox, el);
  label.textContent = el.tagName.toLowerCase();
  Object.assign(label.style, { display: "block", top: Math.max(0, r.top - 20) + "px", left: r.left + "px" });
}, true);
document.addEventListener("click", (e) => {
  if (!selectMode) return;
  const el = tagged(e.target);
  if (!el) return;
  e.preventDefault(); e.stopPropagation();
  ensure(); place(selectBox, el);
  post({ type: "selected", element: describe(el) });
}, true);
window.addEventListener("message", (e) => {
  const d = e.data || {};
  if (d.source !== "doable-editor") return;
  if (d.type === "select-mode") {
    selectMode = !!d.on; ensure();
    if (!selectMode) { hoverBox.style.display = "none"; selectBox.style.display = "none"; label.style.display = "none"; }
    document.documentElement.style.cursor = selectMode ? "crosshair" : "";
  }
  if (d.type === "navigate") { history.pushState({}, "", d.path); dispatchEvent(new PopStateEvent("popstate")); }
  if (d.type === "reload") location.reload();
});
const report = () => post({ type: "location", path: location.pathname + location.search + location.hash });
for (const k of ["pushState", "replaceState"]) {
  const orig = history[k];
  history[k] = function (...args) { const r = orig.apply(this, args); report(); return r; };
}
addEventListener("popstate", report);
addEventListener("load", report);
addEventListener("error", (e) => post({ type: "runtime-error", message: String(e.message || e.error), stack: e.error && e.error.stack }));
addEventListener("unhandledrejection", (e) => post({ type: "runtime-error", message: "Unhandled promise rejection: " + String(e.reason && (e.reason.message || e.reason)), stack: e.reason && e.reason.stack }));
const origError = console.error;
console.error = function (...args) {
  post({ type: "console", level: "error", message: args.map((a) => { try { return typeof a === "string" ? a : (a && a.stack) || JSON.stringify(a); } catch { return String(a); } }).join(" ").slice(0, 4000) });
  return origError.apply(this, args);
};
if (import.meta.hot) {
  import.meta.hot.on("vite:error", (p) => post({ type: "build-error", message: p.err.message, file: p.err.id || p.err.loc?.file, frame: p.err.frame }));
  import.meta.hot.on("vite:afterUpdate", () => post({ type: "hmr-update" }));
}
// A failed module/script load (e.g. a missing file) never reaches window.onerror; catch it here.
addEventListener("error", (e) => {
  const t = e.target;
  if (t && t !== window && (t.tagName === "SCRIPT" || t.tagName === "LINK")) post({ type: "runtime-error", message: "Failed to load " + (t.src || t.href) });
}, true);
// Report a blank page so the editor can run a compile check and offer "Try to fix".
addEventListener("load", () => setTimeout(() => {
  const root = document.getElementById("root");
  if (root && root.children.length === 0 && !(root.textContent || "").trim()) post({ type: "blank" });
}, 2000));
post({ type: "ready" });
`;
