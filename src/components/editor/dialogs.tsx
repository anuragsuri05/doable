"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, Globe, Plus, Trash2, Database, BookOpen, Settings2, KeyRound, AlertTriangle, Download, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Badge, Github, Switch } from "@/components/ui/misc";
import { api, timeAgo } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

export interface ProjectDetail {
  id: string;
  name: string;
  description: string;
  slug: string;
  visibility: string;
  starred: boolean;
  publishedAt: number | null;
  publishedCommit: string | null;
  knowledge: string;
  createdAt: number;
  updatedAt: number;
}

// ---------------- Publish ----------------

export function PublishDialog({
  open,
  onClose,
  project,
  siteUrl,
  onChanged,
  hasUnpublished,
}: {
  open: boolean;
  onClose: () => void;
  project: ProjectDetail;
  siteUrl: string;
  onChanged: () => void;
  hasUnpublished: boolean;
}) {
  const [busy, setBusy] = React.useState<"publish" | "unpublish" | "slug" | null>(null);
  const [slug, setSlug] = React.useState(project.slug);
  const [copied, setCopied] = React.useState(false);
  React.useEffect(() => setSlug(project.slug), [project.slug]);
  const base = siteUrl.replace(`${project.slug}.`, "");

  const publish = async () => {
    setBusy("publish");
    try {
      await api(`/api/projects/${project.id}/publish`, { method: "POST" });
      toast.success(project.publishedAt ? "Published update" : "Your app is live!");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Publish" description="Share your app with the world on its own URL." className="max-w-lg">
      <div className="space-y-5">
        <div className="rounded-xl border border-border p-3.5">
          <div className="flex items-center gap-2">
            <Globe className={cn("size-4", project.publishedAt ? "text-success" : "text-fg-subtle")} />
            <span className="text-sm font-medium text-fg">{project.publishedAt ? "Live" : "Not published yet"}</span>
            {project.publishedAt && <span className="text-xs text-fg-subtle">· updated {timeAgo(project.publishedAt)}</span>}
            {hasUnpublished && project.publishedAt && <Badge tone="warning">Unpublished changes</Badge>}
          </div>
          {project.publishedAt && (
            <div className="mt-3 flex items-center gap-2">
              <a href={siteUrl} target="_blank" rel="noreferrer" className="flex-1 truncate rounded-lg bg-subtle px-3 py-2 font-mono text-xs text-fg hover:underline">
                {siteUrl}
              </a>
              <Button
                size="icon"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(siteUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                title="Copy link"
              >
                {copied ? <Check /> : <Copy />}
              </Button>
              <a href={siteUrl} target="_blank" rel="noreferrer">
                <Button size="icon" variant="outline" title="Open">
                  <ExternalLink />
                </Button>
              </a>
            </div>
          )}
        </div>

        <Field label="Subdomain" hint={`Your app will be served at ${slug}.${base.replace(/^https?:\/\//, "")}`}>
          <div className="flex gap-2">
            <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} className="font-mono text-[13px]" />
            <Button
              variant="outline"
              disabled={slug === project.slug}
              loading={busy === "slug"}
              onClick={async () => {
                setBusy("slug");
                try {
                  await api(`/api/projects/${project.id}`, { method: "PATCH", body: { slug } });
                  toast.success("Subdomain updated");
                  onChanged();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not change subdomain");
                } finally {
                  setBusy(null);
                }
              }}
            >
              Save
            </Button>
          </div>
        </Field>

        <div className="flex items-center justify-between rounded-xl border border-border p-3.5">
          <div>
            <div className="text-sm font-medium text-fg">Show in community gallery</div>
            <div className="text-xs text-fg-subtle">Public projects can be viewed and remixed by others.</div>
          </div>
          <Switch
            checked={project.visibility === "public"}
            onChange={async (v) => {
              await api(`/api/projects/${project.id}`, { method: "PATCH", body: { visibility: v ? "public" : "private" } });
              onChanged();
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          {project.publishedAt ? (
            <Button
              variant="ghost"
              className="text-danger"
              loading={busy === "unpublish"}
              onClick={async () => {
                if (!confirm("Take this site offline?")) return;
                setBusy("unpublish");
                await api(`/api/projects/${project.id}/publish`, { method: "DELETE" });
                setBusy(null);
                toast.success("Site unpublished");
                onChanged();
              }}
            >
              Unpublish
            </Button>
          ) : (
            <span />
          )}
          <Button variant="accent" onClick={publish} loading={busy === "publish"} disabled={!!project.publishedAt && !hasUnpublished}>
            <Globe /> {project.publishedAt ? (hasUnpublished ? "Publish update" : "Up to date") : "Publish"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ---------------- Project settings ----------------

export type SettingsTab = "general" | "knowledge" | "env" | "github" | "danger";

export function ProjectSettingsDialog({
  open,
  onClose,
  project,
  tab,
  onTab,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  project: ProjectDetail;
  tab: SettingsTab;
  onTab: (t: SettingsTab) => void;
  onChanged: () => void;
}) {
  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "General", icon: <Settings2 /> },
    { id: "knowledge", label: "Knowledge", icon: <BookOpen /> },
    { id: "env", label: "Secrets & Supabase", icon: <Database /> },
    { id: "github", label: "GitHub", icon: <Github /> },
    { id: "danger", label: "Danger zone", icon: <AlertTriangle /> },
  ];
  return (
    <Dialog open={open} onClose={onClose} title="Project settings" className="max-w-3xl">
      <div className="flex min-h-[420px] gap-6">
        <nav className="w-44 shrink-0 space-y-0.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => onTab(t.id)}
              className={cn(
                "flex h-8 w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 text-[13px] text-fg-muted hover:bg-muted hover:text-fg [&_svg]:size-4",
                tab === t.id && "bg-muted text-fg",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>
        <div className="min-w-0 flex-1">
          {tab === "general" && <GeneralTab project={project} onChanged={onChanged} />}
          {tab === "knowledge" && <KnowledgeTab project={project} onChanged={onChanged} />}
          {tab === "env" && <EnvTab projectId={project.id} />}
          {tab === "github" && <GithubTab project={project} />}
          {tab === "danger" && <DangerTab project={project} />}
        </div>
      </div>
    </Dialog>
  );
}

function GeneralTab({ project, onChanged }: { project: ProjectDetail; onChanged: () => void }) {
  const [name, setName] = React.useState(project.name);
  const [description, setDescription] = React.useState(project.description);
  const [saving, setSaving] = React.useState(false);
  return (
    <div className="space-y-4">
      <Field label="Project name">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Description">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What is this app about?" />
      </Field>
      <div className="grid grid-cols-2 gap-3 text-xs text-fg-subtle">
        <div>Created {new Date(project.createdAt).toLocaleString()}</div>
        <div>Last edited {timeAgo(project.updatedAt)}</div>
      </div>
      <Button
        loading={saving}
        onClick={async () => {
          setSaving(true);
          await api(`/api/projects/${project.id}`, { method: "PATCH", body: { name, description } });
          setSaving(false);
          toast.success("Saved");
          onChanged();
        }}
      >
        Save changes
      </Button>
    </div>
  );
}

function KnowledgeTab({ project, onChanged }: { project: ProjectDetail; onChanged: () => void }) {
  const [text, setText] = React.useState(project.knowledge);
  const [saving, setSaving] = React.useState(false);
  return (
    <div className="space-y-3">
      <p className="text-sm text-fg-muted">
        Custom instructions Doable follows on every message in this project: product context, brand voice, design rules, coding conventions.
      </p>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={14}
        className="font-mono text-[12px]"
        placeholder={"Example:\n- This is a booking app for a yoga studio called Prana.\n- Brand colours: sage green #7A9E7E and cream #F7F3EA.\n- Use friendly, calm copy. Never use exclamation marks.\n- Every page must work on mobile."}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-fg-subtle">{text.length.toLocaleString()} / 20,000</span>
        <Button
          loading={saving}
          disabled={text === project.knowledge}
          onClick={async () => {
            setSaving(true);
            await api(`/api/projects/${project.id}`, { method: "PATCH", body: { knowledge: text } });
            setSaving(false);
            toast.success("Knowledge saved");
            onChanged();
          }}
        >
          Save knowledge
        </Button>
      </div>
    </div>
  );
}

function EnvTab({ projectId }: { projectId: string }) {
  const [rows, setRows] = React.useState<{ k: string; v: string }[] | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [supaUrl, setSupaUrl] = React.useState("");
  const [supaKey, setSupaKey] = React.useState("");
  React.useEffect(() => {
    api<{ env: Record<string, string> }>(`/api/projects/${projectId}/env`).then((r) => {
      setRows(Object.entries(r.env).map(([k, v]) => ({ k, v })));
      setSupaUrl(r.env.VITE_SUPABASE_URL ?? "");
      setSupaKey(r.env.VITE_SUPABASE_ANON_KEY ?? "");
    });
  }, [projectId]);
  const save = async (list: { k: string; v: string }[]) => {
    setSaving(true);
    try {
      const env = Object.fromEntries(list.filter((r) => r.k.trim()).map((r) => [r.k.trim(), r.v]));
      await api(`/api/projects/${projectId}/env`, { method: "PUT", body: { env } });
      setRows(Object.entries(env).map(([k, v]) => ({ k, v })));
      toast.success("Saved. The preview restarts automatically.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };
  if (!rows) return null;
  const connected = !!rows.find((r) => r.k === "VITE_SUPABASE_URL");
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border p-4">
        <div className="flex items-center gap-2">
          <Database className="size-4 text-emerald-500" />
          <span className="text-sm font-medium text-fg">Supabase backend</span>
          {connected && <Badge tone="success">Connected</Badge>}
        </div>
        <p className="mt-1 text-xs text-fg-muted">
          Add a database, auth and storage. Paste your project URL and anon key from Supabase → Project settings → API, then ask Doable to “add login with Supabase”.
        </p>
        <div className="mt-3 grid gap-2">
          <Input placeholder="https://xxxx.supabase.co" value={supaUrl} onChange={(e) => setSupaUrl(e.target.value)} className="font-mono text-xs" />
          <Input placeholder="anon public key" value={supaKey} onChange={(e) => setSupaKey(e.target.value)} className="font-mono text-xs" />
          <Button
            size="sm"
            variant="outline"
            className="justify-self-start"
            disabled={!supaUrl || !supaKey}
            onClick={() =>
              save([
                ...rows.filter((r) => !["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"].includes(r.k)),
                { k: "VITE_SUPABASE_URL", v: supaUrl },
                { k: "VITE_SUPABASE_ANON_KEY", v: supaKey },
              ])
            }
          >
            {connected ? "Update Supabase" : "Connect Supabase"}
          </Button>
        </div>
      </section>
      <section>
        <div className="mb-2 flex items-center gap-2">
          <KeyRound className="size-4 text-fg-muted" />
          <span className="text-sm font-medium text-fg">Environment variables</span>
        </div>
        <p className="mb-3 text-xs text-fg-muted">
          Stored encrypted. Only variables starting with <code className="font-mono">VITE_</code> are exposed to the browser. Never put private secrets in VITE_ variables.
        </p>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={r.k}
                onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, k: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_") } : x)))}
                placeholder="NAME"
                className="w-56 font-mono text-xs"
              />
              <Input
                value={r.v}
                type="password"
                onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)))}
                placeholder="value"
                className="flex-1 font-mono text-xs"
              />
              <Button size="icon" variant="ghost" onClick={() => setRows(rows.filter((_, j) => j !== i))} title="Remove">
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setRows([...rows, { k: "", v: "" }])}>
            <Plus /> Add variable
          </Button>
          <Button size="sm" loading={saving} onClick={() => save(rows)}>
            Save
          </Button>
        </div>
      </section>
    </div>
  );
}

function GithubTab({ project }: { project: ProjectDetail }) {
  const [state, setState] = React.useState<{ connected: boolean; repo: string | null } | null>(null);
  const [name, setName] = React.useState(project.slug);
  const [isPrivate, setPrivate] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const load = React.useCallback(() => {
    api<{ connected: boolean; repo: string | null }>(`/api/projects/${project.id}/github`).then(setState);
  }, [project.id]);
  React.useEffect(load, [load]);
  const act = async (action: "connect" | "push" | "pull" | "disconnect") => {
    setBusy(action);
    try {
      const r = await api<{ repo: string | null }>(`/api/projects/${project.id}/github`, { method: "POST", body: { action, name, private: isPrivate } });
      toast.success(action === "connect" ? `Created ${r.repo}` : action === "push" ? "Pushed to GitHub" : action === "pull" ? "Pulled latest changes" : "Disconnected");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "GitHub error");
    } finally {
      setBusy(null);
    }
  };
  if (!state) return null;
  if (!state.connected)
    return (
      <div className="space-y-3">
        <p className="text-sm text-fg-muted">Sync your code to a GitHub repository. First connect your GitHub account.</p>
        <Link href="/settings?tab=integrations">
          <Button>
            <Github /> Connect GitHub
          </Button>
        </Link>
      </div>
    );
  if (!state.repo)
    return (
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">Create a new repository and push this project to it. Every version is a commit.</p>
        <Field label="Repository name">
          <Input value={name} onChange={(e) => setName(e.target.value)} className="font-mono text-[13px]" />
        </Field>
        <label className="flex items-center gap-2 text-sm text-fg">
          <Switch checked={isPrivate} onChange={setPrivate} /> Private repository
        </label>
        <Button loading={busy === "connect"} onClick={() => act("connect")}>
          <Github /> Create repository & push
        </Button>
      </div>
    );
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-xl border border-border p-3.5">
        <Github className="size-4" />
        <a href={`https://github.com/${state.repo}`} target="_blank" rel="noreferrer" className="flex-1 truncate font-mono text-[13px] text-fg hover:underline">
          {state.repo}
        </a>
        <Badge tone="success">Connected</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button loading={busy === "push"} onClick={() => act("push")}>
          <ArrowUpFromLine /> Push latest version
        </Button>
        <Button variant="outline" loading={busy === "pull"} onClick={() => act("pull")}>
          <ArrowDownToLine /> Pull from GitHub
        </Button>
        <Button variant="ghost" loading={busy === "disconnect"} onClick={() => act("disconnect")}>
          Disconnect
        </Button>
      </div>
    </div>
  );
}

function DangerTab({ project }: { project: ProjectDetail }) {
  const router = useRouter();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-border p-4">
        <div>
          <div className="text-sm font-medium text-fg">Download source code</div>
          <div className="text-xs text-fg-subtle">A zip of every file in the current version.</div>
        </div>
        <a href={`/api/projects/${project.id}/download`}>
          <Button variant="outline" size="sm">
            <Download /> Download
          </Button>
        </a>
      </div>
      <div className="flex items-center justify-between rounded-xl border border-danger/30 p-4">
        <div>
          <div className="text-sm font-medium text-fg">Delete project</div>
          <div className="text-xs text-fg-subtle">Deletes the code, history, chat and published site. This cannot be undone.</div>
        </div>
        <Button
          variant="danger"
          size="sm"
          onClick={async () => {
            if (prompt(`Type “${project.name}” to confirm`) !== project.name) return;
            await api(`/api/projects/${project.id}`, { method: "DELETE" });
            router.push("/");
          }}
        >
          <Trash2 /> Delete
        </Button>
      </div>
    </div>
  );
}
