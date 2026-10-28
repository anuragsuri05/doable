"use client";
import * as React from "react";
import { GitCommitVertical, RotateCcw, X, FileDiff, Globe } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Badge, Spinner } from "@/components/ui/misc";
import { api, timeAgo } from "@/lib/api";
import { cn } from "@/lib/cn";

interface Version {
  sha: string;
  message: string;
  date: number;
  files: string[];
}

export function HistoryPanel({
  projectId,
  refreshKey,
  onClose,
  onRestore,
  disabled,
}: {
  projectId: string;
  refreshKey: number;
  onClose: () => void;
  onRestore: (sha: string) => void;
  disabled: boolean;
}) {
  const [versions, setVersions] = React.useState<Version[] | null>(null);
  const [published, setPublished] = React.useState<string | null>(null);
  const [diff, setDiff] = React.useState<{ sha: string; text: string | null } | null>(null);

  React.useEffect(() => {
    api<{ versions: Version[]; publishedCommit: string | null }>(`/api/projects/${projectId}/versions`).then((r) => {
      setVersions(r.versions);
      setPublished(r.publishedCommit);
    });
  }, [projectId, refreshKey]);

  const openDiff = async (sha: string) => {
    setDiff({ sha, text: null });
    const r = await api<{ diff: string }>(`/api/projects/${projectId}/versions/${sha}`);
    setDiff({ sha, text: r.diff });
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-elevated">
      <div className="flex h-12 items-center justify-between border-b border-border px-4">
        <span className="text-sm font-semibold text-fg">Version history</span>
        <button onClick={onClose} className="rounded-md p-1 text-fg-subtle hover:bg-muted hover:text-fg" aria-label="Close history">
          <X className="size-4" />
        </button>
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto p-2">
        {!versions ? (
          <Spinner className="m-4 text-fg-subtle" />
        ) : (
          versions.map((v, i) => (
            <div key={v.sha} className="group relative flex gap-3 rounded-xl px-2 py-2.5 hover:bg-subtle">
              <div className="flex flex-col items-center">
                <GitCommitVertical className={cn("size-4", i === 0 ? "text-accent" : "text-fg-subtle")} />
                {i < versions.length - 1 && <div className="mt-1 w-px flex-1 bg-border" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-medium text-fg">{v.message}</span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-fg-subtle">
                  <span>{timeAgo(v.date)}</span>
                  <span>·</span>
                  <code>{v.sha.slice(0, 7)}</code>
                  <span>·</span>
                  <span>
                    {v.files.length} file{v.files.length === 1 ? "" : "s"}
                  </span>
                  {i === 0 && <Badge tone="accent">Current</Badge>}
                  {published && v.sha === published && (
                    <Badge tone="success">
                      <Globe className="size-3" /> Published
                    </Badge>
                  )}
                </div>
                <div className="mt-1.5 flex gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => openDiff(v.sha)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[11px] text-fg-muted hover:bg-muted hover:text-fg"
                  >
                    <FileDiff className="size-3" /> Changes
                  </button>
                  {i > 0 && (
                    <button
                      disabled={disabled}
                      onClick={() => onRestore(v.sha)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[11px] text-fg-muted hover:bg-muted hover:text-fg disabled:opacity-50"
                    >
                      <RotateCcw className="size-3" /> Restore
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <Dialog open={!!diff} onClose={() => setDiff(null)} title={`Changes in ${diff?.sha.slice(0, 7)}`} className="max-w-4xl">
        {diff?.text == null ? (
          <Spinner className="text-fg-subtle" />
        ) : (
          <pre className="overflow-x-auto rounded-lg border border-border bg-subtle p-3 font-mono text-[11px] leading-relaxed">
            {diff.text.split("\n").map((l, i) => (
              <div
                key={i}
                className={cn(
                  l.startsWith("+") && !l.startsWith("+++") && "bg-success/10 text-success",
                  l.startsWith("-") && !l.startsWith("---") && "bg-danger/10 text-danger",
                  l.startsWith("diff --git") && "mt-3 font-semibold text-fg",
                  l.startsWith("@@") && "text-accent",
                )}
              >
                {l || " "}
              </div>
            ))}
          </pre>
        )}
      </Dialog>
    </div>
  );
}
