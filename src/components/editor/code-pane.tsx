"use client";
import * as React from "react";
import dynamic from "next/dynamic";
import { ChevronRight, File, FileCode2, FilePlus, Folder, FolderOpen, Search, Trash2, Pencil, Save, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

const Monaco = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center">
      <Spinner className="text-fg-subtle" />
    </div>
  ),
});

interface FileEntry {
  path: string;
  size: number;
}
interface TreeNode {
  name: string;
  path: string;
  children?: TreeNode[];
}

function buildTree(files: FileEntry[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", children: [] };
  for (const f of files) {
    const segs = f.path.split("/");
    let node = root;
    segs.forEach((seg, i) => {
      const path = segs.slice(0, i + 1).join("/");
      if (i === segs.length - 1) node.children!.push({ name: seg, path });
      else {
        let dir = node.children!.find((c) => c.children && c.name === seg);
        if (!dir) {
          dir = { name: seg, path, children: [] };
          node.children!.push(dir);
        }
        node = dir;
      }
    });
  }
  const sort = (n: TreeNode) => {
    n.children?.sort((a, b) => (!!b.children === !!a.children ? a.name.localeCompare(b.name) : b.children ? 1 : -1));
    n.children?.forEach(sort);
  };
  sort(root);
  return root.children!;
}

function language(path: string) {
  const ext = path.split(".").pop() ?? "";
  return (
    { ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript", json: "json", css: "css", html: "html", md: "markdown", svg: "xml" } as Record<string, string>
  )[ext] ?? "plaintext";
}

export function CodePane({ projectId, refreshKey, readOnly }: { projectId: string; refreshKey: number; readOnly: boolean }) {
  const [files, setFiles] = React.useState<FileEntry[] | null>(null);
  const [open, setOpen] = React.useState<Set<string>>(new Set(["src", "src/pages", "src/components"]));
  const [active, setActive] = React.useState<string>("src/App.tsx");
  const [content, setContent] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const dark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  const loadFiles = React.useCallback(() => {
    api<{ files: FileEntry[] }>(`/api/projects/${projectId}/files`).then((r) => setFiles(r.files));
  }, [projectId]);
  React.useEffect(loadFiles, [loadFiles, refreshKey]);

  React.useEffect(() => {
    let cancelled = false;
    setContent(null);
    api<{ content: string }>(`/api/projects/${projectId}/files/content?path=${encodeURIComponent(active)}`)
      .then((r) => {
        if (cancelled) return;
        setContent(r.content);
        setSaved(r.content);
      })
      .catch(() => !cancelled && (setContent(""), setSaved("")));
    return () => {
      cancelled = true;
    };
  }, [projectId, active, refreshKey]);

  const dirty = content !== null && content !== saved;
  const save = React.useCallback(async () => {
    if (!dirty || content === null) return;
    setSaving(true);
    try {
      await api(`/api/projects/${projectId}/files/content`, { method: "PUT", body: { path: active, content } });
      setSaved(content);
      toast.success(`Saved ${active}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [dirty, content, projectId, active]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  const newFile = async () => {
    const path = prompt("New file path", "src/components/NewComponent.tsx");
    if (!path) return;
    await api(`/api/projects/${projectId}/files/content`, { method: "PUT", body: { path, content: "" } });
    loadFiles();
    setActive(path);
  };
  const renameActive = async () => {
    const to = prompt("Rename to", active);
    if (!to || to === active) return;
    await api(`/api/projects/${projectId}/files`, { method: "POST", body: { action: "rename", from: active, to } });
    loadFiles();
    setActive(to);
  };
  const deleteActive = async () => {
    if (!confirm(`Delete ${active}?`)) return;
    await api(`/api/projects/${projectId}/files`, { method: "POST", body: { action: "delete", path: active } });
    loadFiles();
    setActive("src/App.tsx");
  };

  const filtered = files?.filter((f) => !filter || f.path.toLowerCase().includes(filter.toLowerCase()));
  const tree = filtered ? buildTree(filtered) : [];

  const renderNode = (n: TreeNode, depth: number): React.ReactNode => {
    if (n.children) {
      const isOpen = open.has(n.path) || !!filter;
      return (
        <div key={n.path}>
          <button
            onClick={() => setOpen((s) => (s.has(n.path) ? (s.delete(n.path), new Set(s)) : new Set(s.add(n.path))))}
            className="flex h-7 w-full cursor-pointer items-center gap-1 rounded-md pr-2 text-left text-[13px] text-fg-muted hover:bg-muted hover:text-fg"
            style={{ paddingLeft: 6 + depth * 12 }}
          >
            <ChevronRight className={cn("size-3 shrink-0 transition-transform", isOpen && "rotate-90")} />
            {isOpen ? <FolderOpen className="size-3.5 shrink-0" /> : <Folder className="size-3.5 shrink-0" />}
            <span className="truncate">{n.name}</span>
          </button>
          {isOpen && n.children.map((c) => renderNode(c, depth + 1))}
        </div>
      );
    }
    return (
      <button
        key={n.path}
        onClick={() => setActive(n.path)}
        className={cn(
          "flex h-7 w-full cursor-pointer items-center gap-1.5 rounded-md pr-2 text-left text-[13px] text-fg-muted hover:bg-muted hover:text-fg",
          active === n.path && "bg-muted text-fg",
        )}
        style={{ paddingLeft: 22 + depth * 12 }}
      >
        {/\.(tsx?|jsx?)$/.test(n.name) ? <FileCode2 className="size-3.5 shrink-0" /> : <File className="size-3.5 shrink-0" />}
        <span className="truncate">{n.name}</span>
      </button>
    );
  };

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex w-60 shrink-0 flex-col border-r border-border bg-subtle">
        <div className="flex items-center gap-1 border-b border-border p-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-fg-subtle" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search files"
              className="h-7 w-full rounded-md border border-border bg-elevated pr-2 pl-7 text-xs outline-none focus:border-ring"
            />
          </div>
          {!readOnly && (
            <button onClick={newFile} className="rounded-md p-1.5 text-fg-subtle hover:bg-muted hover:text-fg" title="New file">
              <FilePlus className="size-4" />
            </button>
          )}
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto p-1.5">{files ? tree.map((n) => renderNode(n, 0)) : <Spinner className="m-3 text-fg-subtle" />}</div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-10 items-center gap-2 border-b border-border px-3">
          <span className="truncate font-mono text-xs text-fg">{active}</span>
          {dirty && <span className="size-1.5 rounded-full bg-warning" title="Unsaved changes" />}
          <div className="ml-auto flex items-center gap-1">
            {readOnly ? (
              <span className="flex items-center gap-1 text-xs text-fg-subtle">
                <Lock className="size-3" /> Read-only while Doable is working
              </span>
            ) : (
              <>
                <button onClick={renameActive} className="rounded-md p-1.5 text-fg-subtle hover:bg-muted hover:text-fg" title="Rename">
                  <Pencil className="size-3.5" />
                </button>
                <button onClick={deleteActive} className="rounded-md p-1.5 text-fg-subtle hover:bg-muted hover:text-danger" title="Delete">
                  <Trash2 className="size-3.5" />
                </button>
                <Button size="sm" variant={dirty ? "primary" : "outline"} disabled={!dirty} loading={saving} onClick={save}>
                  <Save /> Save
                </Button>
              </>
            )}
          </div>
        </div>
        {content === null ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner className="text-fg-subtle" />
          </div>
        ) : (
          <Monaco
            path={active}
            value={content}
            language={language(active)}
            theme={dark ? "vs-dark" : "light"}
            onChange={(v) => setContent(v ?? "")}
            options={{
              readOnly,
              fontSize: 13,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              tabSize: 2,
              wordWrap: "on",
              fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
              padding: { top: 12 },
            }}
          />
        )}
      </div>
    </div>
  );
}
