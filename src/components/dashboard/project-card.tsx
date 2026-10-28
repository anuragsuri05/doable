"use client";
import * as React from "react";
import Link from "next/link";
import { MoreHorizontal, Star, Pencil, Copy, Trash2, ExternalLink, Globe, Download } from "lucide-react";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/menu";
import { Badge } from "@/components/ui/misc";
import { api, timeAgo } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import type { ProjectSummary } from "@/lib/types";
import { cn } from "@/lib/cn";

const GRADIENTS = [
  "from-violet-500/80 via-fuchsia-500/70 to-orange-400/70",
  "from-sky-500/80 via-indigo-500/70 to-violet-500/70",
  "from-emerald-500/80 via-teal-500/70 to-sky-500/70",
  "from-rose-500/80 via-pink-500/70 to-amber-400/70",
  "from-amber-500/80 via-orange-500/70 to-rose-500/70",
];

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export function ProjectCard({ project, onChanged }: { project: ProjectSummary; onChanged: () => void }) {
  const [renaming, setRenaming] = React.useState(false);
  const [name, setName] = React.useState(project.name);
  const grad = GRADIENTS[hash(project.id) % GRADIENTS.length];

  const patch = async (body: Record<string, unknown>) => {
    await api(`/api/projects/${project.id}`, { method: "PATCH", body });
    onChanged();
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-elevated transition-shadow hover:shadow-card">
      <Link href={`/projects/${project.id}`} className="block">
        <div className={cn("relative flex aspect-[16/10] items-end bg-gradient-to-br p-4", grad)}>
          <div className="absolute inset-3 rounded-lg border border-white/30 bg-white/10 backdrop-blur-[1px]" />
          <span className="relative z-10 line-clamp-2 text-lg font-semibold text-white drop-shadow">{project.name}</span>
        </div>
      </Link>
      <div className="flex items-center gap-2 px-3.5 py-3">
        <div className="min-w-0 flex-1">
          {renaming ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                setRenaming(false);
                if (name.trim() && name !== project.name) patch({ name: name.trim() });
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="w-full rounded border border-ring bg-bg px-1 text-sm outline-none"
            />
          ) : (
            <Link href={`/projects/${project.id}`} className="block truncate text-sm font-medium text-fg">
              {project.name}
            </Link>
          )}
          <div className="mt-0.5 flex items-center gap-2 text-xs text-fg-subtle">
            Edited {timeAgo(project.updatedAt)}
            {project.publishedAt && (
              <Badge tone="success">
                <Globe className="size-3" /> Live
              </Badge>
            )}
          </div>
        </div>
        <button
          onClick={() => patch({ starred: !project.starred })}
          className={cn("rounded-md p-1.5 hover:bg-muted", project.starred ? "text-amber-500" : "text-fg-subtle opacity-0 group-hover:opacity-100")}
          title={project.starred ? "Unstar" : "Star"}
        >
          <Star className={cn("size-4", project.starred && "fill-current")} />
        </button>
        <Menu
          align="end"
          trigger={
            <button className="rounded-md p-1.5 text-fg-subtle hover:bg-muted hover:text-fg" title="More">
              <MoreHorizontal className="size-4" />
            </button>
          }
        >
          {(close) => (
            <>
              <MenuItem icon={<ExternalLink />} onClick={() => (close(), window.open(`/projects/${project.id}`, "_blank"))}>
                Open in new tab
              </MenuItem>
              <MenuItem icon={<Pencil />} onClick={() => (close(), setRenaming(true))}>
                Rename
              </MenuItem>
              <MenuItem
                icon={<Copy />}
                onClick={async () => {
                  close();
                  await api(`/api/projects/${project.id}/duplicate`, { method: "POST" });
                  toast.success("Project duplicated");
                  onChanged();
                }}
              >
                Duplicate (remix)
              </MenuItem>
              <MenuItem icon={<Download />} onClick={() => (close(), (window.location.href = `/api/projects/${project.id}/download`))}>
                Download code
              </MenuItem>
              <MenuSeparator />
              <MenuItem
                danger
                icon={<Trash2 />}
                onClick={async () => {
                  close();
                  if (!confirm(`Delete “${project.name}”? This cannot be undone.`)) return;
                  await api(`/api/projects/${project.id}`, { method: "DELETE" });
                  toast.success("Project deleted");
                  onChanged();
                }}
              >
                Delete
              </MenuItem>
            </>
          )}
        </Menu>
      </div>
    </div>
  );
}
