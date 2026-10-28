import "server-only";
import type { AgentRunOptions, AgentRunResult } from "./types";

/**
 * Development-only scripted "model" (id: doable-mock) used to exercise the full agent
 * pipeline (streaming, tools, commits, preview, self-repair) without spending API credits.
 * Scenarios are picked from the last user message:
 * - "Automatic check" (the runner's repair prompt): creates the missing About page
 * - contains "break": adds an About route but "forgets" to create the page
 * - anything else: writes a landing page
 */
const LANDING = `import { Button } from "@/components/ui/button";

export default function Index() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8 text-center">
      <h1 className="text-5xl font-bold tracking-tight">Hello from Doable</h1>
      <p className="max-w-md text-lg text-muted-foreground">This page was written by the mock agent.</p>
      <Button size="lg">Get started</Button>
    </main>
  );
}
`;

const APP_WITH_ABOUT = `import { BrowserRouter, Route, Routes } from "react-router-dom";
import Index from "./pages/Index";
import About from "./pages/About";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
`;

const ABOUT = `export default function About() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <h1 className="text-4xl font-bold">About us</h1>
    </main>
  );
}
`;

export async function runMock(o: AgentRunOptions): Promise<AgentRunResult> {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const last = o.messages[o.messages.length - 1]?.text ?? "";
  const readOnly = o.tools.every((t) => t.readOnly);

  let intro: string;
  let outro: string;
  let calls: [string, Record<string, unknown>][];
  if (last.includes("Automatic check")) {
    intro = "The check found a missing file. Creating it.";
    calls = [["write_file", { path: "src/pages/About.tsx", contents: ABOUT }]];
    outro = "Created the missing About page, so the app compiles again.";
  } else if (/\bbreak\b/i.test(last)) {
    intro = "Adding an About route.";
    calls = [["write_file", { path: "src/App.tsx", contents: APP_WITH_ABOUT }]];
    outro = "Added the /about route.";
  } else {
    intro = readOnly ? "Here's my plan." : "I'll build a simple landing page.";
    calls = [
      ["read_file", { path: "src/pages/Index.tsx" }],
      ["write_file", { path: "src/pages/Index.tsx", contents: LANDING }],
      ["rename_project", { name: "Mock Landing" }],
    ];
    outro = readOnly
      ? "## Goal\nA landing page.\n\n## Steps\n1. Rewrite `src/pages/Index.tsx` with a hero.\n2. Name the project."
      : "Done: the home page now has a hero with a heading, a subtitle and a button.";
  }
  if (readOnly) calls = calls.filter(([name]) => o.tools.some((t) => t.name === name));

  o.emit({ type: "thinking", delta: "Working out the change…" });
  await sleep(150);
  o.emit({ type: "text", delta: intro });
  for (const [i, [name, input]] of calls.entries()) {
    const id = `mock_${Date.now()}_${i}`;
    o.emit({ type: "tool_start", id, name });
    if (input.path) o.emit({ type: "tool_input", id, input: { path: input.path } });
    await sleep(120);
    const r = await o.execute(name, input);
    o.emit({ type: "tool_end", id, ok: r.ok, summary: r.summary });
  }
  o.emit({ type: "text", delta: `\n\n${outro}` });
  return { text: `${intro}\n\n${outro}`, inputTokens: 1200, outputTokens: 300 };
}
