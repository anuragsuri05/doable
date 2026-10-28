"use client";
import * as React from "react";
import { AlertTriangle, Loader2, RefreshCw, Sparkles, Terminal, Type, Paintbrush, X, MessageSquarePlus, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import type { SelectedElement } from "@/lib/types";
import { cn } from "@/lib/cn";

export type Device = "desktop" | "tablet" | "mobile";
export interface PreviewStatus {
  status: "stopped" | "installing" | "starting" | "running" | "error";
  port: number | null;
  error: string | null;
  logs: string[];
}
export interface PreviewError {
  kind: string;
  message: string;
}

const DEVICE_WIDTH: Record<Device, number | null> = { desktop: null, tablet: 820, mobile: 390 };

export function previewOrigin(port: number) {
  // The dev server listens on 127.0.0.1; use the same hostname the editor is served from when local.
  return `http://127.0.0.1:${port}`;
}

export const PreviewPane = React.forwardRef<
  HTMLIFrameElement,
  {
    projectId: string;
    status: PreviewStatus | null;
    device: Device;
    route: string;
    reloadKey: number;
    selectMode: boolean;
    selected: SelectedElement | null;
    errors: PreviewError[];
    agentRunning: boolean;
    onSelect: (el: SelectedElement | null) => void;
    onRoute: (route: string) => void;
    onErrors: (errs: PreviewError[]) => void;
    onBlank: () => void;
    onFix: (errs: PreviewError[]) => void;
    onAskAboutSelection: () => void;
    onRestart: () => void;
  }
>(function PreviewPane(p, ref) {
  const innerRef = React.useRef<HTMLIFrameElement>(null);
  React.useImperativeHandle(ref, () => innerRef.current!);
  const [showLogs, setShowLogs] = React.useState(false);
  const port = p.status?.port;
  const running = p.status?.status === "running" && port;
  const src = React.useMemo(() => (running ? `${previewOrigin(port)}${p.route.startsWith("/") ? p.route : "/"}` : null), [running, port, p.reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bridge messages from the preview iframe.
  const { onSelect, onRoute, onErrors, onBlank, errors } = p;
  React.useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const d = e.data;
      if (!d || d.source !== "doable-preview") return;
      if (port && e.origin !== previewOrigin(port)) return;
      if (d.type === "selected") onSelect(d.element as SelectedElement);
      if (d.type === "location") onRoute(d.path);
      if (d.type === "blank") onBlank();
      if (d.type === "runtime-error" || d.type === "build-error" || (d.type === "console" && d.level === "error")) {
        const message = d.type === "build-error" ? `${d.message}${d.frame ? `\n${d.frame}` : ""}` : d.message + (d.stack ? `\n${String(d.stack).slice(0, 1500)}` : "");
        if (/\[vite\]|Download the React DevTools|was not wrapped in act/.test(message)) return;
        const next = [...errors.filter((x) => x.message !== message), { kind: d.type, message }].slice(-8);
        onErrors(next);
      }
      if (d.type === "hmr-update" || d.type === "ready") {
        if (d.type === "ready" && errors.length) onErrors([]);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [port, onSelect, onRoute, onErrors, onBlank, errors]);

  // Keep select mode in sync with the iframe.
  React.useEffect(() => {
    innerRef.current?.contentWindow?.postMessage({ source: "doable-editor", type: "select-mode", on: p.selectMode }, "*");
  }, [p.selectMode, src]);

  const width = DEVICE_WIDTH[p.device];

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-subtle">
      <div className={cn("relative flex min-h-0 flex-1 justify-center", width && "overflow-auto py-4")}>
        {src ? (
          <iframe
            key={`${src}-${p.reloadKey}`}
            ref={innerRef}
            src={src}
            title="Preview"
            onLoad={() =>
              innerRef.current?.contentWindow?.postMessage({ source: "doable-editor", type: "select-mode", on: p.selectMode }, "*")
            }
            className={cn("h-full border-0 bg-white", width ? "rounded-xl shadow-card ring-1 ring-border" : "w-full")}
            style={width ? { width, minHeight: p.device === "mobile" ? 760 : 900, height: "100%" } : undefined}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
          />
        ) : (
          <BootScreen status={p.status} onRestart={p.onRestart} />
        )}
        {p.agentRunning && src && (
          <div className="pointer-events-none absolute top-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-elevated/95 px-3 py-1.5 text-xs text-fg-muted shadow-card backdrop-blur">
            <Sparkles className="size-3.5 animate-pulse text-accent" /> Doable is updating your app…
          </div>
        )}
      </div>

      {p.selected && p.selectMode && <VisualEditPanel projectId={p.projectId} el={p.selected} onClose={() => p.onSelect(null)} onAsk={p.onAskAboutSelection} />}

      {p.errors.length > 0 && !p.agentRunning && (
        <div className="absolute right-3 bottom-3 left-3 rounded-xl border border-danger/30 bg-elevated shadow-xl">
          <div className="flex items-center gap-2 px-3 py-2.5">
            <AlertTriangle className="size-4 shrink-0 text-danger" />
            <span className="flex-1 truncate text-[13px] text-fg">
              {p.errors.length === 1 ? "Your app hit an error" : `${p.errors.length} errors in your app`}:{" "}
              <span className="text-fg-muted">{p.errors[p.errors.length - 1].message.split("\n")[0]}</span>
            </span>
            <button onClick={() => setShowLogs(!showLogs)} className="rounded p-1 text-fg-subtle hover:bg-muted hover:text-fg" title="Details">
              {showLogs ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
            </button>
            <Button size="sm" variant="accent" onClick={() => p.onFix(p.errors)}>
              <Sparkles /> Try to fix
            </Button>
            <button onClick={() => p.onErrors([])} className="rounded p-1 text-fg-subtle hover:bg-muted hover:text-fg" aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </div>
          {showLogs && (
            <pre className="scrollbar-thin max-h-56 overflow-auto border-t border-border px-3 py-2 font-mono text-[11px] whitespace-pre-wrap text-fg-muted">
              {p.errors.map((e) => `[${e.kind}] ${e.message}`).join("\n\n")}
            </pre>
          )}
        </div>
      )}
    </div>
  );
});

function BootScreen({ status, onRestart }: { status: PreviewStatus | null; onRestart: () => void }) {
  const [logs, setLogs] = React.useState(false);
  const label =
    status?.status === "installing" ? "Installing dependencies…" : status?.status === "starting" ? "Starting your app…" : status?.status === "error" ? "The preview server stopped" : "Waking up the preview…";
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      {status?.status === "error" ? <AlertTriangle className="size-6 text-danger" /> : <Loader2 className="size-6 animate-spin text-fg-subtle" />}
      <div>
        <div className="text-sm font-medium text-fg">{label}</div>
        {status?.error && <div className="mt-1 max-w-md text-xs text-fg-muted">{status.error}</div>}
      </div>
      <div className="flex gap-2">
        {status?.status === "error" && (
          <Button size="sm" variant="outline" onClick={onRestart}>
            <RefreshCw /> Restart preview
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => setLogs(!logs)}>
          <Terminal /> {logs ? "Hide" : "Show"} logs
        </Button>
      </div>
      {logs && (
        <pre className="scrollbar-thin max-h-64 w-full max-w-2xl overflow-auto rounded-xl border border-border bg-elevated p-3 text-left font-mono text-[11px] text-fg-muted">
          {status?.logs.join("\n") || "No output yet"}
        </pre>
      )}
    </div>
  );
}

function VisualEditPanel({ projectId, el, onClose, onAsk }: { projectId: string; el: SelectedElement; onClose: () => void; onAsk: () => void }) {
  const [text, setText] = React.useState(el.directText);
  const [classes, setClasses] = React.useState(el.className);
  const [saving, setSaving] = React.useState<"text" | "class" | null>(null);
  React.useEffect(() => {
    setText(el.directText);
    setClasses(el.className);
  }, [el]);

  const save = async (kind: "text" | "class") => {
    setSaving(kind);
    try {
      await api(`/api/projects/${projectId}/visual-edit`, {
        method: "POST",
        body: { elementId: el.id, kind, oldValue: kind === "text" ? el.directText : el.className, newValue: kind === "text" ? text : classes },
      });
      toast.success("Saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="absolute top-3 right-3 z-10 w-80 rounded-2xl border border-border bg-elevated shadow-2xl">
      <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
        <code className="rounded bg-accent-soft px-1.5 py-0.5 font-mono text-xs text-accent">&lt;{el.tag}&gt;</code>
        <span className="flex-1 truncate font-mono text-[11px] text-fg-subtle">{el.id.split(":").slice(0, 2).join(":")}</span>
        <button onClick={onClose} className="rounded p-1 text-fg-subtle hover:bg-muted hover:text-fg" aria-label="Close">
          <X className="size-3.5" />
        </button>
      </div>
      <div className="space-y-3 p-3.5">
        {el.directText && (
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-fg-muted">
              <Type className="size-3.5" /> Text
            </div>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className="text-[13px]" />
            <Button size="sm" variant="outline" className="mt-1.5 w-full" disabled={text === el.directText} loading={saving === "text"} onClick={() => save("text")}>
              Save text
            </Button>
          </div>
        )}
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-fg-muted">
            <Paintbrush className="size-3.5" /> Tailwind classes
          </div>
          <Textarea value={classes} onChange={(e) => setClasses(e.target.value)} rows={3} className="font-mono text-[11px]" />
          <Button size="sm" variant="outline" className="mt-1.5 w-full" disabled={classes === el.className} loading={saving === "class"} onClick={() => save("class")}>
            Save styles
          </Button>
        </div>
        <Button size="sm" variant="accent" className="w-full" onClick={onAsk}>
          <MessageSquarePlus /> Ask AI to change this element
        </Button>
        <p className="text-[11px] text-fg-subtle">Direct edits are free and instant. Each save creates a version.</p>
      </div>
    </div>
  );
}
