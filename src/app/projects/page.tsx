"use client";
import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, LayoutGrid, List, Star, Globe } from "lucide-react";
import Link from "next/link";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ProjectCard } from "@/components/dashboard/project-card";
import { Segmented, Spinner, Badge } from "@/components/ui/misc";
import { api, timeAgo } from "@/lib/api";
import type { ProjectSummary } from "@/lib/types";

type Sort = "updated" | "created" | "name";

function ProjectsInner() {
  const params = useSearchParams();
  const [projects, setProjects] = React.useState<ProjectSummary[] | null>(null);
  const [q, setQ] = React.useState("");
  const [sort, setSort] = React.useState<Sort>("updated");
  const [view, setView] = React.useState<"grid" | "list">("grid");
  const [filter, setFilter] = React.useState<"all" | "starred" | "published">((params.get("filter") as "starred") || "all");

  const load = React.useCallback(() => {
    api<{ projects: ProjectSummary[] }>("/api/projects").then((r) => setProjects(r.projects));
  }, []);
  React.useEffect(load, [load]);
  React.useEffect(() => {
    setFilter((params.get("filter") as "starred") || "all");
  }, [params]);

  const shown = (projects ?? [])
    .filter((p) => (filter === "starred" ? p.starred : filter === "published" ? !!p.publishedAt : true))
    .filter((p) => !q || `${p.name} ${p.description}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : sort === "created" ? b.createdAt - a.createdAt : b.updatedAt - a.updatedAt));

  return (
    <div className="flex h-screen">
      <Sidebar projects={projects ?? undefined} />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Projects</h1>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All" },
                { value: "starred", label: "Starred" },
                { value: "published", label: "Published" },
              ]}
            />
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-fg-subtle" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search projects"
                className="h-8 w-64 rounded-lg border border-border bg-elevated pr-3 pl-8 text-[13px] outline-none focus:border-ring"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="h-8 rounded-lg border border-border bg-elevated px-2 text-[13px] text-fg outline-none"
            >
              <option value="updated">Last edited</option>
              <option value="created">Date created</option>
              <option value="name">Name</option>
            </select>
            <div className="ml-auto">
              <Segmented
                size="sm"
                value={view}
                onChange={setView}
                options={[
                  { value: "grid", label: <LayoutGrid />, title: "Grid" },
                  { value: "list", label: <List />, title: "List" },
                ]}
              />
            </div>
          </div>
          <div className="mt-6">
            {projects === null ? (
              <div className="py-16 text-center">
                <Spinner className="text-fg-subtle" />
              </div>
            ) : shown.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-fg-subtle">No projects match.</div>
            ) : view === "grid" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {shown.map((p) => (
                  <ProjectCard key={p.id} project={p} onChanged={load} />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-elevated">
                {shown.map((p) => (
                  <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-subtle">
                    <span className="size-2 rounded-full bg-gradient-to-br from-violet-500 to-pink-500" />
                    <span className="flex-1 truncate font-medium text-fg">{p.name}</span>
                    {p.starred && <Star className="size-3.5 fill-amber-500 text-amber-500" />}
                    {p.publishedAt && (
                      <Badge tone="success">
                        <Globe className="size-3" /> Live
                      </Badge>
                    )}
                    <span className="w-28 text-right text-xs text-fg-subtle">{timeAgo(p.updatedAt)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense>
      <ProjectsInner />
    </Suspense>
  );
}
