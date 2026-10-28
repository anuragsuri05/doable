"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUp,
  Code2,
  GitBranch,
  Globe,
  History,
  KeyRound,
  ListChecks,
  MousePointerClick,
  Search,
  Sparkles,
} from "lucide-react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ProjectCard } from "@/components/dashboard/project-card";
import { Composer, type DraftImage } from "@/components/composer/composer";
import { Button } from "@/components/ui/button";
import { Logo, Segmented, Spinner } from "@/components/ui/misc";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { useMe, useModelChoice, useModels } from "@/lib/hooks";
import { STARTERS } from "@/lib/templates";
import type { Mode, ProjectSummary } from "@/lib/types";

const PENDING_KEY = "doable-pending-prompt";

export default function HomePage() {
  const me = useMe();
  if (me === undefined)
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="text-fg-subtle" />
      </div>
    );
  return me ? <Dashboard firstName={me.name.split(" ")[0]} /> : <Landing />;
}

function Dashboard({ firstName }: { firstName: string }) {
  const router = useRouter();
  const { data: models } = useModels();
  const [choice, setChoice] = useModelChoice(models);
  const [prompt, setPrompt] = React.useState("");
  const [mode, setMode] = React.useState<Mode>("build");
  const [images, setImages] = React.useState<DraftImage[]>([]);
  const [creating, setCreating] = React.useState(false);
  const [projects, setProjects] = React.useState<ProjectSummary[] | null>(null);
  const [tab, setTab] = React.useState<"recent" | "starred">("recent");
  const [q, setQ] = React.useState("");

  const load = React.useCallback(() => {
    api<{ projects: ProjectSummary[] }>("/api/projects").then((r) => setProjects(r.projects));
  }, []);
  React.useEffect(load, [load]);
  React.useEffect(() => {
    try {
      const pending = sessionStorage.getItem(PENDING_KEY);
      if (pending) {
        setPrompt(pending);
        sessionStorage.removeItem(PENDING_KEY);
      }
    } catch {}
  }, []);

  const noKeys = models && !Object.values(models).some((p) => p.available);

  const create = async () => {
    if (!choice) return;
    setCreating(true);
    try {
      const { id } = await api<{ id: string }>("/api/projects", {
        method: "POST",
        body: { prompt, mode, provider: choice.provider, model: choice.model, images: images.map(({ preview: _p, ...i }) => i) },
      });
      router.push(`/projects/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create project");
      setCreating(false);
    }
  };

  const shown = (projects ?? [])
    .filter((p) => (tab === "starred" ? p.starred : true))
    .filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="flex h-screen">
      <Sidebar projects={projects ?? undefined} />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <section className="brand-gradient relative px-6 pt-20 pb-16">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-fg sm:text-5xl">What should we build, {firstName}?</h1>
            <p className="mt-3 text-[15px] text-fg-muted">Describe an app or website. Doable writes the code, runs it live, and publishes it.</p>
          </div>
          <div className="mx-auto mt-8 max-w-3xl">
            {noKeys && (
              <Link
                href="/settings?tab=providers"
                className="mb-3 flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm text-fg hover:bg-warning/15"
              >
                <KeyRound className="size-4 text-warning" />
                Connect a Claude, OpenAI or Gemini API key to start building.
                <ArrowRight className="ml-auto size-4" />
              </Link>
            )}
            <Composer
              variant="hero"
              autoFocus
              value={prompt}
              onChange={setPrompt}
              onSubmit={create}
              busy={creating}
              mode={mode}
              onModeChange={setMode}
              model={choice}
              onModelChange={setChoice}
              images={images}
              onImagesChange={setImages}
              placeholder="Ask Doable to create a landing page for my coffee shop…"
            />
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {STARTERS.slice(0, 6).map((s) => (
                <button
                  key={s.title}
                  onClick={() => setPrompt(s.prompt)}
                  className="cursor-pointer rounded-full border border-border bg-elevated/80 px-3 py-1.5 text-[13px] text-fg-muted backdrop-blur hover:border-border-strong hover:text-fg"
                >
                  <span className="mr-1">{s.emoji}</span>
                  {s.title}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-16">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: "recent", label: "My projects" },
                { value: "starred", label: "Starred" },
              ]}
            />
            <div className="relative ml-auto">
              <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-fg-subtle" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search projects"
                className="h-8 w-56 rounded-lg border border-border bg-elevated pr-3 pl-8 text-[13px] outline-none focus:border-ring"
              />
            </div>
            <Link href="/projects" className="text-[13px] text-fg-muted hover:text-fg">
              View all →
            </Link>
          </div>
          {projects === null ? (
            <div className="py-16 text-center">
              <Spinner className="text-fg-subtle" />
            </div>
          ) : shown.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-fg-subtle">
              {tab === "starred" ? "Star a project to pin it here." : "No projects yet. Describe one above to get started."}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {shown.slice(0, 12).map((p) => (
                <ProjectCard key={p.id} project={p} onChanged={load} />
              ))}
            </div>
          )}

          <h2 className="mt-14 mb-4 text-lg font-semibold text-fg">Start from a template</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STARTERS.map((s) => (
              <button
                key={s.title}
                onClick={() => {
                  setPrompt(s.prompt);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="cursor-pointer rounded-2xl border border-border bg-elevated p-4 text-left transition-shadow hover:shadow-card"
              >
                <div className="text-2xl">{s.emoji}</div>
                <div className="mt-2 text-sm font-medium text-fg">{s.title}</div>
                <div className="mt-1 line-clamp-2 text-xs text-fg-subtle">{s.prompt}</div>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Landing() {
  const router = useRouter();
  const [prompt, setPrompt] = React.useState("");
  const go = () => {
    try {
      if (prompt.trim()) sessionStorage.setItem(PENDING_KEY, prompt);
    } catch {}
    router.push("/signup");
  };
  const features = [
    { icon: Sparkles, title: "Any frontier model", text: "Build with Claude, GPT or Gemini. Bring your own API key, or use the platform's." },
    { icon: ListChecks, title: "Build, Plan and Chat modes", text: "Plan big changes before writing code, or ask questions without touching anything." },
    { icon: MousePointerClick, title: "Visual edits", text: "Click any element in the live preview to change its text or style, or ask the AI about it." },
    { icon: Code2, title: "Real code you own", text: "React, TypeScript and Tailwind. Edit in the built-in code editor or download a zip." },
    { icon: History, title: "Every change versioned", text: "Each message is a commit. Diff, restore or remix any version." },
    { icon: Globe, title: "One-click publish", text: "Ship to your own subdomain in seconds, then push to GitHub." },
  ];
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-bg/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-6">
          <Logo />
          <nav className="ml-8 hidden gap-6 text-[13px] text-fg-muted sm:flex">
            <a href="#features" className="hover:text-fg">
              Features
            </a>
            <a href="#how" className="hover:text-fg">
              How it works
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>
      <section className="brand-gradient px-6 pt-24 pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-elevated/70 px-3 py-1 text-xs text-fg-muted backdrop-blur">
            <Sparkles className="size-3.5 text-accent" /> Claude · GPT · Gemini, in one builder
          </span>
          <h1 className="mt-6 text-5xl font-semibold tracking-tight text-fg sm:text-6xl">Build something people love</h1>
          <p className="mx-auto mt-4 max-w-xl text-[17px] text-fg-muted">
            Create apps and websites by chatting with AI. Doable writes real code, runs it live, and publishes it for you.
          </p>
        </div>
        <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-border bg-elevated p-2 shadow-card">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                go();
              }
            }}
            rows={3}
            placeholder="Ask Doable to create a booking site for my yoga studio…"
            className="block w-full resize-none bg-transparent px-3 pt-2 text-[16px] text-fg outline-none placeholder:text-fg-subtle"
          />
          <div className="flex justify-end p-1">
            <button onClick={go} className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full bg-fg text-bg hover:opacity-90" aria-label="Start building">
              <ArrowUp className="size-4" />
            </button>
          </div>
        </div>
        <div className="mx-auto mt-5 flex max-w-3xl flex-wrap justify-center gap-2">
          {STARTERS.slice(0, 5).map((s) => (
            <button
              key={s.title}
              onClick={() => setPrompt(s.prompt)}
              className="cursor-pointer rounded-full border border-border bg-elevated/80 px-3 py-1.5 text-[13px] text-fg-muted hover:text-fg"
            >
              {s.emoji} {s.title}
            </button>
          ))}
        </div>
      </section>
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-fg">Everything you need to go from idea to live app</h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-elevated p-6">
              <f.icon className="size-5 text-accent" />
              <h3 className="mt-4 font-medium text-fg">{f.title}</h3>
              <p className="mt-1.5 text-sm text-fg-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>
      <section id="how" className="border-t border-border bg-subtle px-6 py-20">
        <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-3">
          {[
            ["1", "Describe", "Tell Doable what you want in plain language. Attach screenshots or sketches."],
            ["2", "Refine", "Iterate in chat, click elements to edit them, or open the code."],
            ["3", "Publish", "Ship to a live URL in one click and sync to GitHub."],
          ].map(([n, t, d]) => (
            <div key={n}>
              <div className="flex size-8 items-center justify-center rounded-full bg-fg text-sm font-semibold text-bg">{n}</div>
              <h3 className="mt-4 font-medium text-fg">{t}</h3>
              <p className="mt-1 text-sm text-fg-muted">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link href="/signup">
            <Button size="lg">
              Start building for free <ArrowRight />
            </Button>
          </Link>
        </div>
      </section>
      <footer className="border-t border-border px-6 py-8 text-center text-xs text-fg-subtle">
        <div className="flex items-center justify-center gap-2">
          <Logo withText={false} className="[&_svg]:size-4" /> Doable · Build apps with Claude, GPT and Gemini
          <GitBranch className="size-3" />
        </div>
      </footer>
    </div>
  );
}
