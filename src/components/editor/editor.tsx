"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Globe,
  History,
  Laptop,
  MousePointerClick,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Settings,
  Smartphone,
  Tablet,
  BookOpen,
  Database,
  Trash2,
  Star,
  Home,
  RotateCw,
} from "lucide-react";
import { Composer, type DraftImage } from "@/components/composer/composer";
import { Button } from "@/components/ui/button";
import { Github, Logo, Segmented, Spinner } from "@/components/ui/misc";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/menu";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { useModelChoice, useModels } from "@/lib/hooks";
import { applyEvent, type AgentEvent, type ChatMessage, type Mode, type SelectedElement } from "@/lib/types";
import { MessageView } from "./message";
import { PreviewPane, previewOrigin, type Device, type PreviewError, type PreviewStatus } from "./preview-pane";
import { CodePane } from "./code-pane";
import { HistoryPanel } from "./history-panel";
import { ProjectSettingsDialog, PublishDialog, type ProjectDetail, type SettingsTab } from "./dialogs";
import { cn } from "@/lib/cn";

export function Editor({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = React.useState<ProjectDetail | null>(null);
  const [siteUrl, setSiteUrl] = React.useState("");
  const [messages, setMessages] = React.useState<ChatMessage[] | null>(null);
  const [running, setRunning] = React.useState(false);
  const [headSha, setHeadSha] = React.useState<string | null>(null);

  const [view, setView] = React.useState<"preview" | "code">("preview");
  const [device, setDevice] = React.useState<Device>("desktop");
  const [route, setRoute] = React.useState("/");
  const [routeInput, setRouteInput] = React.useState("/");
  const [reloadKey, setReloadKey] = React.useState(0);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [preview, setPreview] = React.useState<PreviewStatus | null>(null);
  const [errors, setErrors] = React.useState<PreviewError[]>([]);
  const [selectMode, setSelectMode] = React.useState(false);
  const [selected, setSelected] = React.useState<SelectedElement | null>(null);
  const [chatOpen, setChatOpen] = React.useState(true);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [settingsTab, setSettingsTab] = React.useState<SettingsTab | null>(null);

  const [text, setText] = React.useState("");
  const [mode, setMode] = React.useState<Mode>("build");
  const [images, setImages] = React.useState<DraftImage[]>([]);
  const { data: models } = useModels();
  const [choice, setChoice] = useModelChoice(models);

  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const esRef = React.useRef<EventSource | null>(null);

  // ---------- loading ----------
  const loadProject = React.useCallback(async () => {
    try {
      const r = await api<{ project: ProjectDetail; siteUrl: string }>(`/api/projects/${projectId}`);
      setProject(r.project);
      setSiteUrl(r.siteUrl);
    } catch {
      router.replace("/");
    }
  }, [projectId, router]);

  const loadHead = React.useCallback(() => {
    api<{ versions: { sha: string }[] }>(`/api/projects/${projectId}/versions`).then((r) => setHeadSha(r.versions[0]?.sha ?? null));
  }, [projectId]);

  const connectStream = React.useCallback(() => {
    esRef.current?.close();
    const es = new EventSource(`/api/projects/${projectId}/stream`);
    esRef.current = es;
    setRunning(true);
    const finish = () => {
      es.close();
      if (esRef.current === es) esRef.current = null;
      setRunning(false);
    };
    // The stream replays the run from its first event, so the first event resets
    // whatever partial progress was already loaded from the database.
    let fresh = true;
    es.onmessage = (e) => {
      const ev = JSON.parse(e.data) as AgentEvent | { type: "idle" };
      if (ev.type === "idle") {
        finish();
        return;
      }
      const reset = fresh;
      fresh = false;
      setMessages((ms) => {
        if (!ms) return ms;
        const idx = ms.map((m) => m.role).lastIndexOf("assistant");
        if (idx < 0) return ms;
        const m = ms[idx];
        const next = { ...m, parts: applyEvent(reset ? [] : m.parts, ev as AgentEvent) };
        if (ev.type === "error") next.error = ev.message;
        return [...ms.slice(0, idx), next, ...ms.slice(idx + 1)];
      });
      if (ev.type === "done") {
        finish();
        // Errors seen mid-run are usually transient (a file imported before it was written).
        // Reload the preview so only errors that survive the finished run are reported.
        setErrors([]);
        setReloadKey((k) => k + 1);
        loadMessages();
        loadProject();
        loadHead();
        setRefreshKey((k) => k + 1);
      }
    };
    es.onerror = () => {
      finish();
      setTimeout(loadMessages, 1000);
    };
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMessages = React.useCallback(async () => {
    const r = await api<{ messages: ChatMessage[]; running: boolean }>(`/api/projects/${projectId}/messages`);
    setMessages(r.messages);
    if (r.running && !esRef.current) connectStream();
    return r;
  }, [projectId, connectStream]);

  React.useEffect(() => {
    loadProject();
    loadHead();
    loadMessages();
    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [loadProject, loadMessages, loadHead]);

  // ---------- preview server lifecycle ----------
  React.useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    api<PreviewStatus>(`/api/projects/${projectId}/preview`, { method: "POST", body: { action: "start" } }).catch(() => {});
    const poll = async () => {
      try {
        const s = await api<PreviewStatus>(`/api/projects/${projectId}/preview`);
        if (!stop) setPreview(s);
        timer = setTimeout(poll, s.status === "running" ? 15000 : 1200);
      } catch {
        timer = setTimeout(poll, 3000);
      }
    };
    poll();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [projectId]);

  // Report browser errors to the server so the agent can read them.
  React.useEffect(() => {
    if (!errors.length) return;
    const t = setTimeout(() => {
      api(`/api/projects/${projectId}/client-errors`, { method: "POST", body: { errors: errors.slice(-5).map((e) => ({ kind: e.kind, message: e.message })) } }).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [errors, projectId]);

  // Auto-scroll chat.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 240) el.scrollTop = el.scrollHeight;
  }, [messages]);
  React.useEffect(() => {
    if (messages && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages === null]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "b") {
        e.preventDefault();
        setChatOpen((v) => !v);
      }
      if (mod && e.key === "j") {
        e.preventDefault();
        setView((v) => (v === "preview" ? "code" : "preview"));
      }
      if (e.key === "Escape" && selectMode) {
        setSelectMode(false);
        setSelected(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectMode]);

  // ---------- actions ----------
  const send = async (opts?: { text?: string; mode?: Mode }) => {
    const body = (opts?.text ?? text).trim();
    const m = opts?.mode ?? mode;
    if (!body || !choice || running) return;
    const now = Date.now();
    const optimisticUser: ChatMessage = {
      id: `tmp-u-${now}`,
      role: "user",
      content: body,
      parts: [],
      attachments: images.map((i) => ({ name: i.name, mediaType: i.mediaType, url: i.preview })),
      mode: m,
      provider: choice.provider,
      model: choice.model,
      status: "done",
      error: null,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      commitSha: null,
      createdAt: now,
    };
    const optimisticAssistant: ChatMessage = { ...optimisticUser, id: `tmp-a-${now}`, role: "assistant", content: "", attachments: [], status: "streaming" };
    setMessages((ms) => [...(ms ?? []), optimisticUser, optimisticAssistant]);
    if (!opts?.text) setText("");
    const sentImages = images;
    setImages([]);
    const sel = selected;
    setSelected(null);
    setSelectMode(false);
    setErrors([]);
    try {
      await api(`/api/projects/${projectId}/messages`, {
        method: "POST",
        body: {
          text: body,
          mode: m,
          provider: choice.provider,
          model: choice.model,
          images: sentImages.map(({ preview: _p, ...i }) => i),
          selected: sel,
          route,
        },
      });
      connectStream();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send");
      setMessages((ms) => (ms ?? []).filter((x) => x.id !== optimisticUser.id && x.id !== optimisticAssistant.id));
      if (!opts?.text) setText(body);
    }
  };

  const stop = () => api(`/api/projects/${projectId}/stop`, { method: "POST" });

  const restore = async (sha: string) => {
    if (!confirm("Restore the app to this version? Your current version stays in history.")) return;
    try {
      await api(`/api/projects/${projectId}/versions/restore`, { method: "POST", body: { sha } });
      toast.success(`Restored to ${sha.slice(0, 7)}`);
      loadHead();
      setRefreshKey((k) => k + 1);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Restore failed");
    }
  };

  const fix = (errs: PreviewError[]) => {
    const detail = errs
      .slice(-3)
      .map((e) => `[${e.kind}] ${e.message}`)
      .join("\n\n")
      .slice(0, 6000);
    send({ text: `Fix this error in the preview:\n\n${detail}`, mode: "build" });
  };

  const navigate = (path: string) => {
    // Accept "about", "/about", "//about" or a full URL; always navigate to a same-origin path.
    let p = path.trim().replace(/^https?:\/\/[^/]+/i, "");
    p = `/${p.replace(/^\/+/, "")}`;
    setRoute(p);
    setRouteInput(p);
    iframeRef.current?.contentWindow?.postMessage({ source: "doable-editor", type: "navigate", path: p }, "*");
  };

  const onRoute = React.useCallback((r: string) => {
    setRoute(r);
    setRouteInput(r);
  }, []);
  const onSelect = React.useCallback((el: SelectedElement | null) => setSelected(el), []);
  // The preview rendered nothing: compile-check the app to find out why.
  const onBlank = React.useCallback(async () => {
    try {
      const r = await api<{ ok: boolean; errors: string[] }>(`/api/projects/${projectId}/check`);
      setErrors(
        r.ok
          ? [{ kind: "blank-screen", message: "The app rendered a blank page, but every module compiles. Likely a runtime error or a component that returns nothing on this route." }]
          : r.errors.map((message) => ({ kind: "compile", message })),
      );
    } catch {}
  }, [projectId]);

  if (!project || !messages) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="text-fg-subtle" />
      </div>
    );
  }

  const lastAssistantIdx = messages.map((m) => m.role).lastIndexOf("assistant");
  const previewUrl = preview?.port ? `${previewOrigin(preview.port)}${route}` : null;
  const hasUnpublished = !!headSha && headSha !== project.publishedCommit;

  return (
    <div className="flex h-screen flex-col bg-bg">
      {/* ---------- Top bar ---------- */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-2">
        <div className={cn("flex items-center gap-1", chatOpen && "w-[min(420px,36vw)] shrink-0")}>
          <Link href="/" className="rounded-lg p-1.5 hover:bg-muted" title="Back to dashboard">
            <Logo withText={false} />
          </Link>
          <Menu
            className="w-64"
            trigger={
              <button className="flex max-w-56 cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[14px] font-medium text-fg hover:bg-muted">
                <span className="truncate">{project.name}</span>
                <ChevronDown className="size-3.5 shrink-0 text-fg-subtle" />
              </button>
            }
          >
            {(close) => (
              <>
                <MenuItem icon={<Home />} onClick={() => (close(), router.push("/"))}>
                  Go to dashboard
                </MenuItem>
                <MenuSeparator />
                <MenuItem icon={<Settings />} onClick={() => (close(), setSettingsTab("general"))}>
                  Settings
                </MenuItem>
                <MenuItem icon={<BookOpen />} onClick={() => (close(), setSettingsTab("knowledge"))}>
                  Knowledge
                </MenuItem>
                <MenuItem icon={<Database />} onClick={() => (close(), setSettingsTab("env"))}>
                  Secrets & Supabase
                </MenuItem>
                <MenuItem icon={<History />} onClick={() => (close(), setHistoryOpen(true), setChatOpen(true))}>
                  Version history
                </MenuItem>
                <MenuSeparator />
                <MenuItem
                  icon={<Star />}
                  onClick={async () => {
                    close();
                    await api(`/api/projects/${projectId}`, { method: "PATCH", body: { starred: !project.starred } });
                    loadProject();
                  }}
                >
                  {project.starred ? "Unstar" : "Star"} project
                </MenuItem>
                <MenuItem
                  icon={<Copy />}
                  onClick={async () => {
                    close();
                    const r = await api<{ id: string }>(`/api/projects/${projectId}/duplicate`, { method: "POST" });
                    toast.success("Remixed into a new project");
                    router.push(`/projects/${r.id}`);
                  }}
                >
                  Remix (duplicate)
                </MenuItem>
                <MenuItem icon={<Download />} onClick={() => (close(), (window.location.href = `/api/projects/${projectId}/download`))}>
                  Download code
                </MenuItem>
                <MenuSeparator />
                <MenuItem danger icon={<Trash2 />} onClick={() => (close(), setSettingsTab("danger"))}>
                  Delete project
                </MenuItem>
              </>
            )}
          </Menu>
          <div className="flex-1" />
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            className={cn("rounded-lg p-1.5 text-fg-muted hover:bg-muted hover:text-fg", historyOpen && "bg-muted text-fg")}
            title="Version history"
            hidden={!chatOpen}
          >
            <History className="size-4" />
          </button>
          <button onClick={() => setChatOpen((v) => !v)} className="rounded-lg p-1.5 text-fg-muted hover:bg-muted hover:text-fg" title="Toggle chat (⌘B)">
            {chatOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
          </button>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: "preview", label: <><Eye /> Preview</>, title: "Preview (⌘J)" },
              { value: "code", label: <><Code2 /> Code</>, title: "Code (⌘J)" },
            ]}
          />
          {view === "preview" && (
            <>
              <Segmented
                size="sm"
                value={device}
                onChange={setDevice}
                options={[
                  { value: "desktop", label: <Laptop />, title: "Desktop" },
                  { value: "tablet", label: <Tablet />, title: "Tablet" },
                  { value: "mobile", label: <Smartphone />, title: "Mobile" },
                ]}
              />
              <div className="hidden min-w-0 flex-1 items-center gap-1 rounded-lg border border-border bg-elevated px-1 lg:flex">
                <button onClick={() => setReloadKey((k) => k + 1)} className="rounded p-1 text-fg-subtle hover:bg-muted hover:text-fg" title="Reload preview">
                  <RefreshCw className="size-3.5" />
                </button>
                <input
                  value={routeInput}
                  onChange={(e) => setRouteInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && navigate(routeInput)}
                  className="h-7 min-w-0 flex-1 bg-transparent font-mono text-xs text-fg outline-none"
                  aria-label="Route"
                />
                {previewUrl && (
                  <a href={previewUrl} target="_blank" rel="noreferrer" className="rounded p-1 text-fg-subtle hover:bg-muted hover:text-fg" title="Open preview in new tab">
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectMode((v) => !v);
                  if (selectMode) setSelected(null);
                }}
                className={cn(
                  "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-fg-muted hover:bg-muted hover:text-fg",
                  selectMode && "bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent",
                )}
                title="Select an element to edit it visually"
              >
                <MousePointerClick className="size-4" /> <span className="hidden xl:inline">Select</span>
              </button>
            </>
          )}
          {view === "code" && <div className="flex-1" />}
          <Menu
            align="end"
            className="w-56"
            trigger={
              <Button variant="ghost" size="icon-sm" title="Preview server">
                <RotateCw />
              </Button>
            }
          >
            {(close) => (
              <>
                <MenuItem
                  icon={<RefreshCw />}
                  onClick={async () => {
                    close();
                    setPreview(await api<PreviewStatus>(`/api/projects/${projectId}/preview`, { method: "POST", body: { action: "restart" } }));
                    setReloadKey((k) => k + 1);
                  }}
                >
                  Restart dev server
                </MenuItem>
                <MenuItem
                  icon={<Download />}
                  onClick={async () => {
                    close();
                    toast.info("Reinstalling dependencies…");
                    setPreview(await api<PreviewStatus>(`/api/projects/${projectId}/preview`, { method: "POST", body: { action: "reinstall" } }));
                    setReloadKey((k) => k + 1);
                  }}
                >
                  Reinstall dependencies
                </MenuItem>
              </>
            )}
          </Menu>
          <Button variant="ghost" size="icon-sm" title="GitHub" onClick={() => setSettingsTab("github")}>
            <Github />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!project.publishedAt) {
                setPublishOpen(true);
                return;
              }
              navigator.clipboard.writeText(siteUrl);
              toast.success("Live link copied");
            }}
          >
            Share
          </Button>
          <Button variant="accent" size="sm" onClick={() => setPublishOpen(true)} className="relative">
            <Globe /> Publish
            {hasUnpublished && project.publishedAt && <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-warning ring-2 ring-bg" />}
          </Button>
        </div>
      </header>

      {/* ---------- Body ---------- */}
      <div className="flex min-h-0 flex-1">
        {chatOpen && (
          <aside className="relative flex w-[min(420px,36vw)] shrink-0 flex-col border-r border-border">
            {historyOpen && (
              <HistoryPanel projectId={projectId} refreshKey={refreshKey} onClose={() => setHistoryOpen(false)} onRestore={restore} disabled={running} />
            )}
            <div ref={scrollRef} className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-4 py-5">
              {messages.length === 0 && (
                <div className="mt-10 text-center">
                  <div className="text-sm font-medium text-fg">What do you want to build?</div>
                  <p className="mt-1 text-[13px] text-fg-muted">Describe the app, attach a screenshot, or pick a mode below.</p>
                </div>
              )}
              {messages.map((m, i) => (
                <MessageView
                  key={m.id}
                  message={m}
                  live={running && i === lastAssistantIdx}
                  isLatestAssistant={i === lastAssistantIdx}
                  isCurrentVersion={!!m.commitSha && m.commitSha === headSha}
                  onRestore={restore}
                  onApprovePlan={() => send({ text: "Approved. Implement the plan above.", mode: "build" })}
                  onImplement={() => send({ text: "Implement what you described above.", mode: "build" })}
                  onRetry={() => {
                    const lastUser = [...messages].reverse().find((x) => x.role === "user");
                    if (lastUser) send({ text: lastUser.content, mode: lastUser.mode });
                  }}
                />
              ))}
            </div>
            <div className="p-3 pt-0">
              <Composer
                value={text}
                onChange={setText}
                onSubmit={() => send()}
                onStop={stop}
                busy={running}
                mode={mode}
                onModeChange={setMode}
                model={choice}
                onModelChange={setChoice}
                images={images}
                onImagesChange={setImages}
                selected={selected}
                onClearSelected={() => setSelected(null)}
              />
            </div>
          </aside>
        )}
        <section className="flex min-w-0 flex-1 flex-col">
          {view === "preview" ? (
            <PreviewPane
              ref={iframeRef}
              projectId={projectId}
              status={preview}
              device={device}
              route={route}
              reloadKey={reloadKey}
              selectMode={selectMode}
              selected={selected}
              errors={errors}
              agentRunning={running}
              onSelect={onSelect}
              onRoute={onRoute}
              onErrors={setErrors}
              onBlank={onBlank}
              onFix={fix}
              onAskAboutSelection={() => {
                setChatOpen(true);
                setMode("build");
                document.querySelector<HTMLTextAreaElement>("aside textarea")?.focus();
              }}
              onRestart={async () => {
                setPreview(await api<PreviewStatus>(`/api/projects/${projectId}/preview`, { method: "POST", body: { action: "restart" } }));
              }}
            />
          ) : (
            <CodePane projectId={projectId} refreshKey={refreshKey} readOnly={running} />
          )}
        </section>
      </div>

      <PublishDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        project={project}
        siteUrl={siteUrl}
        hasUnpublished={hasUnpublished}
        onChanged={() => {
          loadProject();
          loadHead();
        }}
      />
      {settingsTab && (
        <ProjectSettingsDialog
          open
          onClose={() => setSettingsTab(null)}
          project={project}
          tab={settingsTab}
          onTab={setSettingsTab}
          onChanged={loadProject}
        />
      )}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-4 left-4 z-30 inline-flex items-center gap-2 rounded-full border border-border bg-elevated px-3 py-2 text-[13px] text-fg shadow-xl hover:bg-subtle"
        >
          <ArrowLeft className="size-4" /> Open chat
        </button>
      )}
    </div>
  );
}
