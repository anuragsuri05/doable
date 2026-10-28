# Doable — Competitor Knowledge Base

Reference files on the two main AI app builders that "doable" is modeled on. Researched 2026-10-22 from official docs (full doc dumps), changelogs, pricing pages and third-party reviews.

| File | Covers |
|---|---|
| [lovable.md](lovable.md) | Lovable (lovable.dev): 38 sections, every screen/panel/button, Cloud backend, connectors, pricing, shortcuts, dated changelog, clone MVP plan |
| [v0.md](v0.md) | v0 (v0.app, Vercel): 23 sections, home composer, chat view, sandbox, Design Mode, Git/deploy, models, pricing, Platform API, clone checklist |

Tags used: Lovable marks unverified claims **(UNCERTAIN)**; v0 uses **[confirmed] / [uncertain] / [legacy]**.

---

## Side-by-side comparison

| Dimension | Lovable | v0 |
|---|---|---|
| Positioning | Full-stack AI app builder for non-devs → enterprises; "describe → refine → publish" | Chat-first agentic builder tightly bound to Vercel; dev-leaning |
| Generated stack | TanStack Start (SSR) since May 13 2026; earlier React + Vite SPA. TS, Tailwind, shadcn/ui, Bun, Drizzle | Next.js 16.2 App Router, React, TS, Tailwind 4.2, shadcn/ui, AI SDK v6 |
| Default backend | **Lovable Cloud** (Supabase-based Postgres, auth, storage, edge functions, secrets, logs) or BYO Supabase | Neon + Drizzle + Better Auth scaffold (Jun 2026); Vercel Marketplace (Supabase, Neon, Upstash, Blob…) |
| AI in generated apps | **Lovable AI** gateway (no key needed) | Vercel **AI Gateway** (zero-config) |
| Runtime / preview | Live preview iframe; device toggle, route picker | Per-chat cloud VM (Vercel Sandbox) with terminal + logs; 30 min keep-alive, 24h cap |
| Agent modes | **Build**, **Plan** (Plan view + Approve), **Chat**; `/goal` (up to 10h); subagents | Agent with plan review, clarifying questions, permission requests; instructions like "Plan Mode"; subagents |
| Model choice | Not user-selectable | **Model picker** (multiple providers, token-priced) |
| Visual editing | Preview toolbar: Select, inline Text, Draw, Comment (replaced Visual Edits Jun 2026) | **Design Mode** (select element → properties panel → apply as new version) |
| Code access | Code tab (Monaco-style editor), Files tab; paid only for edit/download | Code tab with tree/editor/search, Diff view, terminal; ZIP download |
| Versions / branching | Auto version per edit, bookmarks, restore; **Drafts** (branch-like, Sep 2026) | Version per assistant edit, restore/fork/duplicate; real Git branches + PRs |
| Git | Two-way sync: GitHub, GitLab, Bitbucket | GitHub: working branch, auto-commit, PR create/merge, CI status, import repo |
| Publishing | `*.lovable.app` + custom domains (buy in-app), visibility, SEO review, analytics | One-click **Publish** → Vercel deployment; domains via Vercel project |
| Integrations | Connector catalog (app + chat/MCP connectors), Stripe, Paddle, Shopify, emails | Marketplace, BYO MCP (4 auth types), Figma, Stripe, Shopify, Snowflake, Slack bot |
| Context / memory | Workspace + project Knowledge, Skills, Design systems | Instructions, Rules, Skills (`SKILL.md`), memories, Design Systems 2.0 |
| Collaboration | Workspaces, roles (Owner/Admin/Editor/Viewer), share dialog, comments, remix | Vercel teams (Owner/Billing/Builder/Creator/Viewer), Invite, templates community, fork |
| Pricing unit | **Credits per message** (usage-based; e.g. small edit 0.5, auth 1.2) | **USD credits metered by tokens** per model |
| Plans | Free (5/day), Pro $25+, Business $50+, Enterprise | Free (7 msgs/day), Plus $30/user, Business $100/user, Enterprise |
| Free fixes | 10 "Try to fix" / 24h | 10 "Fix with v0" / day (paid) |
| Security | Quick + deep security scans, browser testing, monitoring | Env-var warnings, permission rules engine; SOC 2 via Vercel |
| API / extensibility | Lovable API, MCP server, Build-with-URL, Sign in with Lovable | Platform API v2, SDKs, v0 MCP server, webhooks, embeddable preview |

## Takeaways for Doable

1. **Core loop both share:** prompt → streaming agent with visible tool steps → live preview → iterate (chat + visual edit + code) → one-click publish. Build this first.
2. **Pick a stack decision early:** Lovable's choice (Vite/TanStack Start + Supabase) is cheaper to host and easier for non-devs; v0's (Next.js + VM sandbox) is heavier but more flexible.
3. **Differentiators worth copying:** Lovable's Plan view with Approve, design-guidance question cards, built-in backend; v0's Design Mode, real Git branch/PR flow, Work Details footer (time/files/lines/credits), model picker.
4. **Common complaints to beat:** unpredictable credit burn, agent loops on bugs, lock-in to the host platform. Transparent per-message cost and stronger free fixes are easy wins.
5. Each source file ends with its own phased build plan: [lovable.md §37](lovable.md) and [v0.md §23](v0.md).
