# Lovable (lovable.dev): Reference Knowledge File for Building a Clone ("Doable")

> Compiled 2026-10-22. Primary source is the official docs at docs.lovable.dev (all ~290 non-API pages downloaded and read or skimmed on this date), the official changelog (Dec 2024 to Oct 21, 2026), the pricing page, and third-party coverage.
>
> Conventions in this file:
> - **[Docs]** means the official docs state it as of Oct 2026.
> - **[CL yyyy-mm-dd]** means the date the changelog announced it.
> - **(UNCERTAIN)** means inferred, from third-party sources, or from older material that may have changed.
> - UI labels are in **bold** exactly as the docs spell them, so a clone can mirror the copy.

---

## Table of contents

1. Product overview and positioning
2. Company facts
3. Tech stack of generated apps
4. Core concepts and data model
5. Marketing homepage and signup
6. Dashboard
7. Projects list, folders, search, sorting, bulk actions
8. Editor: overall layout
9. Project chat panel (modes, prompt box, Chat actions menu, attachments, message actions)
10. Agent behaviour (Build mode, Plan mode, Chat mode, Goals, Subagents, Questions, Design guidance)
11. Preview panel and preview toolbar (Visual Edits successor)
12. Code tab (code editor, formerly Dev Mode)
13. Files tab (generated files, uploads)
14. Version history, revert, bookmarks
15. Drafts (branches)
16. The **More** menu: Analytics, Database, Users, Storage, AI, Payments, Emails, Connectors, Security, Usage, Settings
17. Built-in backend (Lovable Cloud): database, auth, storage, edge functions, jobs, secrets, logs, regions, permissions
18. Lovable AI (AI gateway for generated apps)
19. Supabase (bring-your-own backend)
20. Connectors (App + chat, Chat/MCP, App user, Custom, MCP registries)
21. Git sync (GitHub, GitLab, Bitbucket)
22. Payments (Paddle, Stripe), Shopify, Emails
23. Publishing, hosting, domains, SEO, analytics, growth tools
24. Security (Quick scan, Deep scan, Security view, Security center)
25. Testing (browser testing, auto-written tests, project monitoring)
26. Knowledge, Skills, Design systems, Design templates, Themes
27. Collaboration: workspaces, roles, sharing, invites, comments, remix
28. Chats (outside projects)
29. Pricing, plans, credits, top-ups, limits
30. Account settings
31. Workspace settings
32. Other surfaces: desktop app, mobile app, Slack, Telegram, ChatGPT app, MCP server, Lovable API, Build with URL, Sign in with Lovable, Figma
33. Keyboard shortcuts
34. Prompting best practices
35. Known limitations and common complaints
36. Changelog highlights 2025 to 2026 (dated)
37. Clone-builder notes: MVP scope suggestions
38. Sources

---

## 1. Product overview and positioning

- Tagline-level positioning [Docs]: "a full-stack AI development platform for building, iterating on, and deploying web applications using natural language, with real code, security, and enterprise governance."
- User describes an app in plain language (any human language). Lovable generates a working app: frontend, backend, database, authentication, integrations, all as editable real code.
- Category: "vibe coding" / AI app builder. Direct competitors: Bolt.new, v0 (Vercel), Replit Agent, Base44, Manus (Lovable has importers for all of these).
- Core loop (Quick start doc): **describe → refine → publish**. Every change is auto-versioned; the published site is a snapshot that only updates on **Publish → Publish changes**.
- Target users [Docs]: PMs and designers (prototypes → internal tools), ops/sales/marketing/finance/HR teams replacing spreadsheets and per-seat SaaS, marketers (landing pages, campaign sites), developers (scaffolding), agencies, enterprises, founders, indie makers, students/educators.
- What you can build [Docs]: prototypes, SaaS, internal tools, dashboards, marketplaces/commerce, consumer apps, AI-powered apps, websites/landing pages, educational tools, simple games, presentations (as web apps or downloadable PDF/PPTX), generated images/videos/design assets.
- What it does NOT build: native mobile apps (no React Native). Path: PWA or wrap with Capacitor externally. No framework choice (no Next.js option).
- Pricing philosophy: priced by **credits**, not seats or projects. Unlimited workspace members on every plan.
- Compliance [Docs]: SOC 2 Type II, ISO 27001:2022, AIUC-1 (AI agent security standard), GDPR. Trust portal trust.lovable.dev.

## 2. Company facts

- Founded 2023 in Stockholm, Sweden, by **Anton Osika** (CEO) and **Fabian Hedin**. Originally the open-source project **GPT Engineer** (gptengineer.app), rebranded to Lovable (late 2024). [Docs FAQ]
- Lovable 2.0 launched Apr 25, 2025 (rebrand, multiplayer/Teams, security scan, Chat mode).
- Funding (third-party press, UNCERTAIN on exact figures):
  - Series A: ~$200M at $1.8B valuation (July 2025).
  - Dec 2025: $330M at $6.6B; ARR ~ $200M disclosed then.
  - **Series C, Aug 12, 2026: $400M at $13.3B valuation**, led by Menlo Ventures, co-led by EQT Scaleup Europe Fund; new investors include Tencent, Balderton, Kaszek, Regent.
  - ARR reportedly ~$500M run-rate in June 2026, tracking toward ~$600M by end of Aug 2026 (press projection). Over 60M projects created since launch (company-sourced claim, Aug 2026).
- Support channels: docs assistant, status.lovable.dev, Discord (discord.gg/lovable-dev), lovable.dev/support form (direct support on paid plans), Lovable Academy (academy.lovable.app).
- Localization: UI available in English, French, German, Spanish, Portuguese (Brazil), Italian, Hindi, Indonesian, Japanese, Korean, Thai [CL 2026-06-17].

## 3. Tech stack of generated apps

| Era | Stack |
|---|---|
| Projects created **before May 13, 2026** (before Jun 22, 2026 for Enterprise) | **React + Vite** SPA, **TypeScript**, **Tailwind CSS**, **shadcn/ui** (Radix UI primitives), lucide-react icons, React Router, TanStack (React) Query (UNCERTAIN on exact libs; these are the long-standing defaults widely reported). Builds to static files. Published pages are pre-rendered for verified crawlers/social bots only. |
| Projects created **from May 13, 2026** (default for Enterprise from Jun 22, 2026) | **TanStack Start** (React, SSR, file-based routing, server functions; runs on Vite). Server-side rendering for every visitor. Server logs exist ("deployed server worker"). Enables newer features (workspace identity reuse, live voice in apps, payments without Cloud, app emails without Cloud). |

Other stack facts [Docs]:
- Package manager: **Bun** (lockfile; "install dependencies with Bun so versions stay in sync"). Tailwind 4 in newer projects (docs mention Tailwind 3 vs 4 conflicts for design-system consumers).
- Database: **PostgreSQL** via built-in backend (Supabase-based) or user's own Supabase. Migrations recorded with **Drizzle** under `drizzle/migrations/`, plus `drizzle/schema.ts`, `drizzle.config.ts` (older projects: `supabase/migrations/`). Generated TS types updated on schema change.
- Backend code: Supabase **Edge Functions** (Deno) for older projects; TanStack Start server code for new ones.
- Lovable's own files: `.lovable/plan.md` (current plan), `.lovable/plan/` (archived approved plans, dated), `.lovable` folder in design-system projects.
- `robots.txt` created with every new project; sitemap not always.
- Upgrade path: **Migrate to TanStack Start** (slash command, Project settings → General → Project actions, or ask). Costs 10 to 35 credits typically; revertible via history [CL 2026-07-28].
- Agent models (the builder itself, not user-selectable): history in changelog — Claude 3.5/3.7 Sonnet era (2024-25), Claude 4 (May 2025), Sonnet 4.5 (Oct 2025), Opus 4.5 "as a core model" (Dec 2025), Opus 4.6 (Feb 2026), Opus 4.7 (Apr 2026), Opus 5 (Jul 30, 2026), plus GPT/Gemini models in the mix. FAQ: "Lovable chooses the model ... you cannot pick a specific model for building."

## 4. Core concepts and data model

- **Account**: personal identity; login via email/password, Google, GitHub, Apple, SSO. One account across many workspaces.
- **Workspace**: holds projects, members, billing, shared credit pool, settings, connectors, knowledge, skills. First personal workspace auto-created on Free plan. More via workspace switcher.
- **Organization** (Enterprise, Oct 2026): groups several Enterprise workspaces under shared SSO/SCIM/admin.
- **Project**: one app. Has project chat, preview, code, version history, settings, drafts, files. Lives in exactly one workspace. One owner.
- **Draft**: branch of a project with its own chat + preview; accept to merge.
- **Chat** (in "Chats"): personal conversation outside projects; can send work into projects.
- **Version**: every agent edit and every manual code save creates one.
- **Connection**: an authenticated instance of a connector, owned by workspace (app connectors) or a user (chat connectors).
- Roles: workspace (Owner, Admin, Editor, Viewer, + External collaborator), project (Owner, Admin, Editor, Viewer), folder (Owner, Admin, Can edit, Can view), group-level roles.
- Credits: one balance; usage types Build, Chat, Cloud, AI gateway, Connector.

Suggested entity list for the clone: User, Workspace, Membership(role), Group, Organization, Project, ProjectCollaborator, Folder, Draft, Message, Version/Commit, Bookmark, Plan(approved plans), File(generated/uploaded), Connector, Connection, Secret, Domain, Deployment, PreviewLink, Comment/Thread, Knowledge (workspace/project text), Skill, DesignSystem, Template, CreditLedger, UsageEvent, Limit/Alert, AuditLog, Invite, Notification.

## 5. Marketing homepage and signup

(lovable.dev is behind a Cloudflare challenge for scrapers; details below combine docs and long-standing UI knowledge. Visual specifics are UNCERTAIN.)

- Logged-out homepage: large centered prompt box (placeholder in docs: **"Ask Lovable to create…"**), headline in the "Build something Lovable" style (UNCERTAIN exact current copy), gradient/aurora background. You can type a prompt before signing up; on submit you're asked to sign up and the prompt is preserved through signup.
- A floating prompt bar follows you while scrolling the homepage [CL 2025-06-26].
- Below the hero: community/featured projects gallery with categories (introduced 2025: "categorization to community projects", "Lovable Launched" app discovery platform Feb 2025), templates, testimonials, pricing, footer (Docs, Changelog, Careers, Security, Platform rules, Terms, Privacy, Status). (UNCERTAIN on current section order.)
- Template gallery: **lovable.dev/templates** (browsable logged out; each card has **⋯** menu with **Preview** and **Remix**; Preview opens app in a window with **Use template**).
- Signup: email, Google, GitHub, Apple; SSO for Enterprise. Free workspace created on signup.
- Students page: **lovable.dev/students** (verification flow). Referral/invite links. Temporary education logins at lovable.dev/login/temp [CL 2025-11-26].
- Public user profiles: `lovable.dev/@username` (name, bio, location, website, avatar, banner, projects) [CL 2026-02-05 "New user profiles"].

## 6. Dashboard

The logged-in home. [Docs: Dashboard overview]

### 6.1 Prompt input (center)
- Text field + **microphone** (voice dictation; transcribes while you speak, removes filler words).
- **Mode picker** next to send button:
  - **Build** ("Make changes directly"): creates a new project and builds it. Default; remembered per browser.
  - **Chat** ("Ask anything, explore ideas"): starts a Chat (outside projects). Send button reads **Chat for free** while the workspace daily chat allowance lasts. A **waveform** button starts a live **voice conversation**. Project options hidden in this mode.
  - **Plan** ("Detailed spec for complex builds"): creates project and starts in Plan mode.
- **`+` menu** (left of input):
  - **Import project to Lovable** (ZIP import from Replit, Manus, Bolt, Base44, v0, any ZIP; or Import a website by URL you own).
  - **Attach**: upload images/files, or capture a screenshot.
  - **Design**: pick a **design template** (Business/Enterprise) or a **design system** (all paid plans). Workspace/group default design system is pre-selected.
  - **Connectors**: chat connectors (MCP) and app connectors.
  - **Databases**: connect built-in backend or a Supabase project (or **Add Supabase organization**).
- **Project access** selector before creation (Business/Enterprise; default "workspace").
- Drag and drop files into the prompt.

### 6.2 Sidebar (same sidebar is available inside editor)
- Toggle: button or `[` or `Cmd/Ctrl+B`. Tooltips when collapsed.
- **Workspace selector** (top): switch workspaces, **Workspace settings**; shows credit bar (remaining credits) and **Personal usage**/**Personal credits**.
- Nav items: **Dashboard**, **Chats** (appears after first chat), **Search** (command palette, `Cmd/Ctrl+K`), **Connectors**.
- **Projects** (opens full list), **Starred** (appears once something starred), **Recents** (filter **All / Chats / Projects**, **All projects** link). Mobile groups **Owned by me** / **Shared with me**.
- Referral card (**Share Lovable**, not on Enterprise): invite link + QR. Rewards: invitee +10 bonus credits on signup; referrer +100 bonus credits when invitee pays first Pro/Business subscription. Caps: 100 signups per workspace link total; 5/day Free, 15/day Pro, unlimited Business. Rejects disposable and plus-addressed emails. Referral credits expire after 12 months.
- Upgrade card (Free/lower tier).
- **User menu** (avatar, bottom-left; badge with notification count): **Profile**, **Inbox**, **Account settings** (`Cmd/Ctrl+.`), **Appearance** (Theme: System/Light/Dark; **Dashboard background** visual theme), **Support** (Help center, Report abuse, Status), **Documentation** (Docs, Prompts library, Terms & privacy, Changelog, Security, Platform rules), **Community**, **Download apps**, **Homepage**, **Log out**.

### 6.3 Inbox and notifications
- **Inbox** tab: workspace invitations, project invitations, project access requests, workspace access requests, general notifications (accept/decline/approve/deny).
- **What's new** tab: feature announcements, connector launches, changelog.
- Red dot + count badge for unread.

### 6.4 Project tabs bar on dashboard
- Tabs for project lists (e.g., recently viewed / my projects / shared with me / **Lovable templates** / workspace templates; exact tab names UNCERTAIN) plus a **Search** entry that turns tabs into a search box filtering across all lists [CL 2026-07-07].
- Workspace templates are separated from Lovable templates [CL ~2026].

### 6.5 Project cards
- Card: name, preview thumbnail, **Published** badge (links to live app). Redesigned cards [CL 2026-09-18].
- Hover: star icon, **⋯** menu (also right-click on desktop). Menu groups:
  - **Open in new tab** (desktop app: **Open project**), **Chat about this project** (opens prompt in Chat mode with project attached), **Star/Unstar**, **Remix**
  - **Copy → Project link / App link**
  - **Open → Published app / Analytics**
  - **Move → To folder / To workspace**
  - **Edit → Name / Thumbnail**
  - **Settings**, **Delete** (restorable 60 days)
  - Only actions allowed by your role show; single-item groups collapse into a direct item.

## 7. Projects list, folders, search, sorting, bulk actions

- **Projects page**: header with search field, **Filter**, **View**; **New project**, **New folder** buttons. Infinite scroll.
- **Filter** menu (searchable; applied filters shown as removable chips, **+** add, **Clear filters**): **Owner** (members, **Shared with me**), **Folder** (All folders / No folder / specific), **Visibility** (Any / Workspace / Restricted), **Publish status** (Any / All published / Internally published / Externally published / Not published), **Starred**, **Recent projects**.
- **View** menu: **Grid** (default, thumbnails) / **List** (compact, with Folder column; saved in browser); **Sort by**: Last edited, Last viewed, Created, Name (A–Z/Z–A), Relevance (only while searching), Visits (Popularity: last 24h/7d/30d); **Order**.
- Filter/sort/search state persisted in URL (shareable).
- **Bulk select**: click-drag on empty area (marquee), `Cmd/Ctrl+A`, long-press on touch. Toolbar actions: **Move to folder** / **Remove from folder**, **Transfer** (to workspace), **Change owner**, **⋯ → Unpublish** (shows included/excluded with reasons), **Delete** (only if you can delete all), **Unstar**; **Clear**, **Cancel (Esc)**.
- **Folders**: create (name ≤50 chars, no `/ \ : * ? " |`), color icon, visibility **Workspace** or **Personal** (Personal on Business/Enterprise, default there; share with people/groups at Owner/Admin/Can edit/Can view). Subfolders up to 3 levels; inherit top-level visibility. **More folder options** → New subfolder, **Manage access**/**View access**, **Leave folder**. Viewers view only; external collaborators no folder access.
- **Command palette** (`Cmd/Ctrl+K`): recent projects/folders before typing; grouped results **Projects**/**Folders** with hover preview panel; paste a project URL or ID to open; navigate to settings sections by name (e.g., "billing", "people"); connectors; theme switching; switch workspaces; **Drafts** group in editor (Main preview + drafts). Fuzzy project search since Jun 2025.

## 8. Editor: overall layout

Desktop browser layout [Docs: editor map]:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ☰ (sidebar)  ProjectName [▾ drafts] ⟲History  ⇤Hide chat │ Preview | Files | Code | More ▾ │ ✎toolbar 💬 (avatars) [Share] [Publish•] │
├───────────────────────────┬──────────────────────────────────────────────────┤
│ Project chat (left)       │ Preview bar: [Desktop|Tablet|Mobile] [ /page ▾ ] ⟳ ↗ │
│  messages, activity cards │                                                  │
│  question cards, plan card│          live app iframe                         │
│  suggestion chips         │      floating preview toolbar (Select/Text/      │
│ [+] prompt box 🎤 [Mode▾] ➤│       Draw/Comment) docked bottom-center          │
└───────────────────────────┴──────────────────────────────────────────────────┘
```

Top bar elements:
- **Menu icon** (top-left): hover to peek sidebar, click to pin. `[` toggles.
- **Project name**: click opens **draft switcher** (top row = main version with **Project settings** button; **New draft**; list of drafts; accept). Rename via settings or `Cmd/Ctrl+Shift+.`.
- **History** toggle (version history panel).
- **Hide chat panel / Show chat panel** toggle (`Cmd/Ctrl+B`).
- **Project toolbar tabs**: **Preview** (home), **Files**, **Code**, **More** (panel of tools). Overflow menu on narrow windows.
- Top-right (when Preview active): **Preview toolbar** toggle (when hidden), **Comments** (when toolbar hidden), **collaborator avatars** (presence + invite), **Share**, **Publish** (dot badge when unpublished changes exist).
- Browser tab title shows project status (e.g., working/done) [CL 2026-07-10].
- Mobile app: swipe between chat and preview instead.

## 9. Project chat panel

### 9.1 Prompt box
- Text field (Enter to send). Placeholder like "Ask Lovable…" (UNCERTAIN exact).
- **Microphone**: click or `Option/Alt+V`; live transcription; check to insert, X to discard.
- **Mode picker**: **Build / Chat / Plan**; `Option/Alt+P` cycles. Chat shows a **Free** badge while daily allowance lasts.
- **`+` button** = **Chat actions** menu (see 9.2).
- `@` opens mention menu at cursor (projects, connectors, code files, Figma designs, **Your files**); `/` opens skills list (incl. **Goal**, **Migrate to TanStack Start**).
- Mentions render as pills (e.g., `Button.tsx:42`, project names, connector names).
- Banner above input for goals, low credits ("running low on credits" with add-credits CTA for admins), and workspace announcements.
- Suggestion chips above input after responses (toggle **Chat suggestions** in account prefs).

### 9.2 Chat actions menu (`+`)
Grouped, with back arrow and search box:
- **Project**: **History**, **Knowledge**, **Design system** (paid), **Settings**, **GitHub**, **GitLab**.
- **Help & support** (Enterprise: Help center + **Contact support** which files a ticket with project context); other plans: **Help center** directly.
- **Add context**: **Skills** (workspace skills + **Built by Lovable**, incl. Goal), **Projects** (cross-project referencing), **Connectors**, **Code** (file reference), **Figma designs** (after first plugin export), **Project connectors** (opens More → Connectors), **Take a screenshot** (browser screen capture), **Attach files**.
- **Attach files**.
- Desktop: details panel shows skill/project/connector info on hover in list.

### 9.3 Attachments
- Via Attach files, drag-drop, paste. Reads images, PDF, Word, Excel, PowerPoint, audio, CSV/TSV, code, Markdown, ZIP, `.fig`.
- Limits: per file **20 MB Free / 256 MB paid / 1 GB Enterprise**; **10 files per message**; images total **15 MB/message** (auto-compressed).
- Preview viewer: code with syntax highlight; Markdown with **Preview/Source**; CSV/TSV as table (≤500 rows/50 cols shown); ZIP file list (first 100); PDF inline (desktop); images zoom/pan + **Draw** annotation → **Save**; **Add to chat** on images in conversation.
- `.fig` files parsed in browser: variables, colors, typography, frame structure, preview image (style matching, not full rebuild).

### 9.4 While Lovable works
- **Follow-ups**: send messages any time; picked up at the next natural stopping point; grayed out until picked up. Replaced the older **message queue** (deprecated; still toggleable in Preferences: pause/resume, reorder, edit, copy, remove, repeat up to 50x, **Send now**).
- Some messages run as their own request after the current one, labeled **Runs after the current task**: Try to fix, Security/SEO one-click fixes, inline text edits, comment threads sent to Lovable.
- **Activity cards**: file edits, commands, web searches, browser tests, subagents. Click → **Details view** (replaces preview area) with **Timeline** tab (every step/tool call) and **Changes** tab (file diffs); **Hide details** to return. Bigger tasks show a visible task list.
- **Stop button**: keeps finished work; charged for work done; not charged if no change was made.
- Runs server-side: closing the browser doesn't stop it. Up to **10 hours** per Build message (final 30 min = wrap-up).
- Browser notifications offered on desktop when done/needs input. **Generation complete sound** preference.

### 9.5 Question cards
- Up to 4 questions with options; choose or type own; navigate between questions; **Skip** / **Skip all** (continues with defaults, does not approve suggested extra work); drafts saved in browser. Design questions show swatches/font samples/wireframes (see 10.6).

### 9.6 Response actions
- **Undo latest edit** (latest response only, no confirm).
- **Revert to this version** (earlier responses, with confirm).
- **Copy**, **Helpful / Not helpful** (thumbs).
- **More options**: **Copy message link**, **Preview** (app as of that message), **Worked for / Working for** time, **Credits used** (live while running; "Free" when chat allowance covered it).
- Activity card of finished change: **Bookmark in history** toggle, **Details**.
- On user messages: **Edit message** → **Revert and resend** (reverts project to before that message, reruns).
- Build errors: **Try to fix** button on activity card. **10 free fixes** per account (shared with Security fixes), each regenerates 24h after use; afterwards billed as build usage.
- Chat-mode **Start building** card "(Uses credits)" with **Build** / **Skip**.
- Publish suggestion: when published project changes, reply ends with **Publish to update the live site** button.
- Credit check-in card (long-running messages over threshold, default 20 credits): **Continue** (optionally set new level), **Finish up**, **Don't ask again**.
- Out-of-credits pause card: **Add credits** / **Finish up** / (non-billing members) **Ask an admin**.
- Secret input card (secure form, name like `STRIPE_SECRET_KEY`, format hint, **Generate** for shared secrets, **Copy**, **Submit**, **Skip**).
- Connector approval card (**Allow**, **Always allow**, **Always allow all tools from this connection**).
- Confirmation cards for domains purchase/connect, project creation from chats (**Create a new project?**), edits from chats (**Edit [project]?**), TanStack migration (**Start migration** / **Cancel**).

## 10. Agent behaviour and modes

### 10.1 Build mode (formerly "Agent mode"; Agent Mode became default Aug 2025, renamed Build ~May 2026)
- Autonomous: explores codebase, edits across files, runs tools (search, web fetch, image/video gen, browser testing, logs, network inspection, frontend tests, edge function calls), verifies, summarizes.
- Pricing: usage-based; no upfront estimate. Examples: "Make the button gray" 0.50; "Remove the footer" 0.90; "Add authentication" 1.20; "Build a landing page with images" 2.00 (pricing page shows 1.70 for the last one).
- Credit check-ins (beta): default 20 credits per message, configurable 20 to 100,000.

### 10.2 Plan mode (Feb 5, 2026: old "Chat mode" renamed Plan mode)
- Investigates without code changes; asks clarifying questions; produces a structured plan in the **Plan view** (overview, decisions/assumptions, components/data models/APIs, step sequence, optional Mermaid diagrams).
- Plan view: edit directly, highlight a passage → **Comment** → "Describe the change..." (section-scoped revision), **Approve**, **Skip**, full-screen. Version arrows (undo/redo), banner "Viewing version 2 of 3", **Back to latest**, **Save**, **Cancel**, **Save & approve**.
- Approve → switches to Build and implements the plan.
- Storage: `.lovable/plan.md` → archived to `.lovable/plan/<date>-<name>.md` on approval.
- Cost: **1 credit per message + subagent research cost**.

### 10.3 Chat mode (Sep 21, 2026 reintroduced as a third mode)
- Discusses the open project; reads code, files, DB data (with Cloud), conversation, referenced projects, connectors. Never edits code/data, doesn't generate images, enable Cloud, publish, or create a Plan view.
- When you ask for a change: **Start building** card. Other build-triggering buttons prompt **Switch to Build mode?** (**Continue**/**Cancel**).
- Priced as chat usage (fraction of a credit), daily chat allowance first.

### 10.4 Goals (`/goal`, Aug 30, 2026)
- Type `/goal` or choose **Goal** skill; banner: "Lovable will work until your goal is achieved. This might take hours and use a large number of credits." Message marked **Goal**.
- Works up to 10h, no clarifying questions, still credit check-ins; follow-ups join the goal. Always runs in Build. Costs noticeably more.

### 10.5 Subagents (May 27, 2026)
- Read-only parallel researchers. Types: **generic** (card title = task) and **Explore** (most capable model, evidence-traced; card "Explore: How does …?"). Rows in activity card; click for files inspected, searches, findings.

### 10.6 Design guidance (May 18, 2026)
- For open-ended visual prompts, a question card before building with up to 3 design questions + 1 content question:
  - **Color palette** (swatches: dark/moody, light/clean, warm/earthy, bold/vibrant, soft pastel, nature, professional).
  - **Typography** (heading/body pairs rendered in their fonts).
  - **Layout** (wireframes: hero grid, single column, split screen, sidebar, masonry, bento grid, magazine, dashboard, full-width sections, zigzag, card grid, asymmetric, broken grid, feed, gallery).
- First option preselected; free-text override; **Skip all**. Skipped when prompt is specific or purely functional.
- (A "design directions before first build" feature was removed Oct 8, 2026.)

### 10.7 Other agent capabilities
- Image generation/editing (backgrounds transparent, combining images), short video generation — billed as build usage, labeled **Image generation** / **Video generation**. Generated images labeled as AI-generated [CL 2026-07-08].
- File generation/data analysis in isolated sandbox: CSV/PDF/XLSX/DOCX/PPTX, charts, Mermaid diagrams, image processing, DB queries, imports.
- Web search (cited sources shown as pills [CL 2026-09-25]); Perplexity managed search.
- Cross-project referencing via `@Project` (read-only; up to 10 in Chats).
- Signs in to test pages behind login (built-in backend).
- Publishes, buys/connects domains, resizes DB instance, rotates DB password, moves projects to folders — from chat.
- Reference other chats or send them tasks [CL 2026-10-09].
- "Security memory" [CL 2026-05-18].

## 11. Preview panel and preview toolbar

### 11.1 Preview bar
- **Device toggle**: **Desktop view / Tablet view / Mobile view**.
- **Page selector** (route dropdown): list pages, **Find page or enter path**; hover preview icon → **Social** card (OG preview) and **Search** card (SERP preview with favicon); **Ask Lovable to edit** drafts a chat message.
- **Refresh** (Shift+click = restart preview environment).
- **Open in new tab** (dev preview URL; requires Lovable login + access).
- Preview = staging; shares backend/data with published app.
- **Preview pause** after inactivity: "Still building?" with **Keep building**.
- **Live preview** setting (on by default); off = shows last completed version, no pause.
- Error states with **Try again**: "Live preview couldn't start" (+ **Dismiss**), "Live preview lost connection", "Live preview stopped responding". "Starting live preview…" while booting.

### 11.2 Preview toolbar (Jun 10, 2026; replaced Visual Edits)
Floating toolbar docked bottom-center inside preview; draggable with corner snapping; options menu **Dock / Minimize / Hide**; theme **Auto / Light / Dark**; remembers position.

| Mode | Shortcut | Behaviour | Cost |
|---|---|---|---|
| **Select elements** | `S` | Click element(s); `Cmd/Ctrl+click` multi-select; each attaches as a reference pill in chat; describe change | Build credits |
| **Edit text inline** | `T` | Click text, edit in place, **Send** | 100 free edits/account (24h rolling) + 2,000/workspace/24h, then credits |
| **Draw annotation** | `D` | Freehand, lines, arrows, rectangles, circles, ovals; shape recognition cleans rough shapes; screenshot attached | Build credits |
| **Add a comment** | `C` | Drop a pin on element, thread; replies; red unread badge | Free; sending thread to Lovable costs |

- Cannot switch modes with unsent work.
- History: Visual Edits (2025, "Edit" button, floating combo box controls; v2 Aug 2025; "All new Visual edits" in a Design view panel Nov 2025 with Themes and free AI image generation) → "AI-powered visual edits" (Apr 2026) → Preview toolbar (Jun 2026). For a clone, a direct-manipulation style panel (font, color, spacing, padding, margin, alignment) was the old Visual Edits UX; the current product routes everything through the AI except inline text.

## 12. Code tab (code editor; "Dev Mode" since Mar 2025)

- Left file tree (**Expand all / Collapse all**, collapsible), tabs (drag reorder, close), right-click **Open** / **Reference in chat**.
- **Search code** (`Cmd/Ctrl+Shift+F`): results grouped **Files** / **In files**; replace on paid plans. `Cmd/Ctrl+F` find in file.
- File toolbar: **Preview markdown** (eye icon), **Copy file content**, **Download**, **Reference file in chat**, format button.
- Editing: paid plans only (Free shows **Read only** + **Upgrade**). **Save** (`Cmd/Ctrl+S`) / **Discard**; unsaved-changes guard; Save disabled while agent works; every save = a version; not credit-consuming; agent doesn't review manual edits.
- Line references: hover line number → **+** chip (drag for range), or `Cmd/Ctrl+Shift+L`; pill like `Button.tsx:42` navigates back.
- **Download codebase** (.zip) at bottom of file panel (paid plans, edit access); also in Project settings → Git. Enterprise can restrict downloads to admins/owners.
- Viewers can't open the Code tab.
- Files > 10 MB can't be committed ("exceed the 10 MB per-file commit limit"); fix: "Migrate large files to CDN assets."

## 13. Files tab

- Holds files Lovable generates (reports, exports, decks) and files you upload; separate from source code.
- **Collections** for grouping [CL 2026-09-20]; image gallery; image editing (draw, comment, erase, remove background) [CL 2026-10-12]; formatted Markdown previews and larger document previews; multi-select and sorting [CL 2026-10-15/16].
- Files no longer copied automatically during remix [CL 2026-09-08] (opt-in switch).

## 14. Version history

- Open via **History** toggle or Chat actions → Project → History. Tabs: **History**, **Bookmarks**.
- Click a version → snapshot view; **Back to latest**.
- Per version: **More actions** (**Open preview in new tab**, **View code changes** diff, **Go to message in chat**), **Revert** (confirm dialog with date; **View in chat**), **Bookmark** toggle. **Published** badge on the live version. Accepted drafts appear as named groups. Screenshot previews on hover (2025).
- Revert restores **code only** (and redeploys edge functions), not database data. No partial revert. Credits not refunded. Very old versions: "Cannot revert this far back in history." Disabled for pre-remix versions of Cloud projects.
- Edit message → **Revert and resend**.
- (History: "Versioning 2.0" Mar 2025 added bookmarks; "Restore" renamed "Revert" Nov 2025.)

## 15. Drafts (Sep 9, 2026)

- Git-branch-like copies with own chat and preview (own URL). Terms: **Main**, **Draft**, **Update** (pull main into draft), **Accept** (merge; draft becomes read-only), **Delete**, **Publish** (only Main can be published).
- Create via draft switcher → **New draft** (named "Draft 1", auto-renamed from first prompt; rename ≤80 chars via ⋮ menu).
- Drafts share the real backend/data; schema changes prepared in a draft apply on accept. Can't enable Cloud inside a draft.
- No extra credit cost for create/update/accept/delete. All plans; edit access required. Available in mobile app.

## 16. The **More** menu (project toolbar)

| Section | Contents |
|---|---|
| **Analytics** | Visits by channel; **SEO & AI** tab (search/AI traffic, Google searches via Search Console, SEO & AI search review, Get more search traffic); ads results |
| **Database** | Tables & records; **Manage** → Jobs, SQL editor, Edge functions, Backups, Policies (RLS), Settings |
| **Users** | Signups chart, user list, Add user, auth Settings |
| **Storage** | Buckets, files, upload size limit, settings |
| **AI** | AI activity dashboard; **Agent integrations** (publish app as MCP server) |
| **Payments** | Paddle/Stripe built-in payments; test/live toggle |
| **Emails** | Auth + app emails from own domain (paid plans) |
| **Connectors** | **Project connections**, **MCP connectors**, **All connectors** |
| **Security** | Quick/Deep scan cards, findings; **Sensitive data** (if enabled) |
| **SEO & AI search** | Notice redirecting to Analytics (**Open Analytics**) |
| **Usage** | Project cost with **Build**/**Run** filters |
| **Settings** | **General**, **Knowledge**, **Domains**, **Git** (+ **Secrets**, **Logs** with built-in backend) |

- With own Supabase, **Supabase** replaces backend sections. Sections appear once relevant.
- Redesigned More menu (Database, Users, Storage, Emails, Usage) [CL 2026-10-20]. Earlier (late 2025 to early 2026) these lived under a **Cloud** tab/view in the editor (Cloud view with Database, Users, Storage, Edge Functions, AI, Secrets, Logs, Usage). (Clone note: either a "Cloud" tab or a "More" panel works.)

## 17. Built-in backend ("Lovable Cloud", launched Oct 6, 2025)

- Managed Supabase-based backend: Postgres DB, auth, storage, realtime, edge functions, jobs, secrets, logs. Enabling any of DB/users/storage provisions all three. Enabled by default per workspace; Lovable enables automatically or asks (permission **Enable Cloud**).
- **Backend permissions** (Always allow / Ask each time / Never allow) — defaults: Enable Cloud, Read database, Read analytics, Run security checks, Modify database (SQL migrations), Change data, Read project info, Configure auth, Read backend logs = **Always allow**; **Execute backward incompatible database migrations** = **Never allow**. Managed in Account settings → Preferences → Agent permissions.
- **Regions**: Americas, Europe, Asia Pacific (country-specific for Enterprise on request); workspace default region (Business/Enterprise); fixed after creation.
- **Database view**: table list with approximate row counts (views read-only); table grid: double-click inline edit, **Filter** (type-aware operators), **Add row** (form), **Edit row** (single PK), **Delete** (count shown, confirm), **Export CSV** (respects filters), **Refresh**; page size 10/25/50/100. No import UI (ask agent).
- **SQL editor**: autocomplete tables/columns, **Run** (`Cmd/Ctrl+Enter`), **Clear**, confirmation for DELETE/DROP/TRUNCATE/ALTER/UPDATE.
- Migrations: Drizzle files; agent refuses breaking changes (drop/rename/type change/required column without default) unless permitted; uses additive patterns.
- Supported extensions: `pg_cron`, `pg_net`, `supabase_vault`, `pg_trgm`, `vector`, `btree_gist`, `btree_gin`, `unaccent`, `fuzzystrmatch`, `postgis`, `pgmq`; preinstalled `plpgsql`, `pg_graphql`, `pg_stat_statements`, `pgcrypto`, `uuid-ossp`, `pgsodium`.
- Settings: **Database location** (region + Postgres version), **Manage instance** (instance sizes with estimated monthly cost), storage add, backups (daily; restore), export, **pause/remove**, rotate password, high-load warnings with **Review project setup → Resolve**.
- **Users** (auth): Signups chart (7/30/90 days), searchable list, **Add user** (**Send invitation** / **Create new user**), user details (ID, timestamps, providers, **Raw JSON**), **Delete user**. **Settings → Sign in methods** with Enabled/Disabled badges: Email (default; confirmation, password rules, OTP, rate limits), Phone (SMS via Twilio/Twilio Verify/TextLocal/Vonage/MessageBird), Google (managed or own OAuth), Apple, Microsoft, **Lovable** (Sign in with Lovable), SAML SSO, OIDC. Default when you ask for login: email+password, Google, Sign in with Lovable. **Disable sign-up**, **Enable anonymous users**. **Advanced**: Site URL, Redirect URLs (≤50, custom schemes) auto-maintained on publish/custom domain.
- **Storage**: buckets (Private default / Public; names lowercase 3–63 chars, immutable; delete only when empty), folders, upload (drag/drop), rename, delete, download (multi → zip; private via signed links), file detail with preview and **Copy URL** (private signed URL expires in 1h). Upload size limit default 2 GB, max 5 GB.
- **Edge functions**: list with status, invocations, success rate, last updated; time ranges (Relative 15 min–5 days / Absolute); detail chart Succeeded/Failed, **Copy URL**, **View logs**, **View code**.
- **Jobs** (pg_cron): list; detail with schedule in plain language, Last run, run history (Succeeded/Failed/Running); **Enable/Disable**; **Refresh**. Created via chat/SQL.
- **Secrets**: list name + created date; write-only; **Add secret** (multiple pairs), **Delete**; whitespace trimming; not copied on remix. Pasting an API key in chat offers to create a connector and saves it as a secret.
- **Logs**: types Server (TanStack), Function edge, Authentication, PostgreSQL, Realtime, Storage, Edge (default), Function; **Search events**, time range, status filter; **Refresh**, **Show more**, **Download** (JSON), **Copy**.
- **Usage**: Build vs Run; Cloud categories Database, Network, Storage, Compute (formerly Functions), Realtime.
- Workspace out of credits → backend pauses (**Wake up** after topping up); published static pages keep serving.
- Test and Live environments (Beta, Feb 2026) discontinued for new projects Mar 24, 2026.

## 18. Lovable AI (AI gateway for generated apps; launched Oct 6, 2025)

- Built-in AI connector: no provider keys. Per-project `LOVABLE_API_KEY` auto-generated (regenerated on remix). Calls through backend function; SSE streaming; live voice streams browser→model directly.
- Preference: Connectors → **AI** → "Adding AI capabilities to your projects": Always allow / Ask each time / Never allow. Admin can disable workspace-wide (stops all apps' AI calls).
- Model catalog (Oct 2026, defaults first): Chat — GPT-6 Astra (default), Gemini 3.8 Flash, Gemini 4 Argon, GPT-6.1 Sol, Claude models (since Sep 23, 2026); light text — Gemini 3.1 Flash Lite, GPT-6 Luna; images — GPT Image 2.5 Sunburst/Flare, Gemini 3.1 Flash Lite Image (Nano Banana family), Seedream 5 Pro; video — Gemini Omni 1.1 Flash, Veo 3.1, Seedance 2.5; music — Lyria 3 Clip/Pro; embeddings — Gemini Embedding 2, text-embedding-3-small; classification — Jev 1.13 / "Jev Latest"; TTS — Gemini 3.1 Flash TTS, Gemini 2.5 Pro TTS; STT — GPT Transcribe, Gemini 3.5 Transcribe; live voice — GPT-Live 1. Deprecations listed with retirement dates. (Model names are as stated in Oct 2026 docs; they change monthly.)
- **More → AI** dashboard: cards **Credits used**, **AI requests**, **Success rate**, **Avg. time**; **AI activity** list (runs grouped, status, model, credits, time). Retention: Free 24h, paid 90 days. **AI app context** setting (store full request/response, secrets scrubbed, 90 days; default on Free/Pro, off Business/Enterprise).
- Billing: AI gateway usage → monthly AI grant (4 credits) then general credits; priority processing costs more; live voice billed per connected second (15s minimum).
- Rate limits per workspace (requests/min); video concurrency 1 Free / 10 paid per project; live voice 5 Free / 20 paid concurrent; HTTP 429 rate limited, 402 out of credits.
- Agent integrations: publish app as MCP server (ChatGPT/Claude can call its tools); WebMCP tools for browser agents [CL 2026-10-13].

## 19. Supabase (bring your own)

- Available all plans. Comparison: built-in = automatic, billed in credits, managed in Lovable; own Supabase = your account/billing, Supabase dashboard.
- Two-step: workspace owner/admin links a **Supabase organization** (OAuth) → anyone with edit access connects a project (from `+` → Databases at creation, or Settings → General → **External Supabase** → **Connect**). Lovable can now create the Supabase project for you [CL 2026-10-20]. Warning if one Supabase project is shared across projects.
- Agent designs schema, runs migrations (`supabase/migrations/`), deploys edge functions, regenerates TS types, stores secrets in Supabase.
- No automatic switching between built-in and Supabase.
- Historical: Supabase integration was the original backend path (2024–2025); Lovable Cloud (Oct 2025) made it optional.

## 20. Connectors

- Catalog at `lovable.dev/dashboard?connectors` (sidebar **Connectors**, `+` menu, Chat actions → Add context → Connectors). Sort **Popular / A to Z / Z to A**; **+** button: **MCP server**, **Custom connector** (admins), **MCP registry** (admins). Typo-tolerant search ("Showing results for").
- Connection types:
  - **App + chat connector**: shared workspace connection usable by the published app AND in chat.
  - **Chat connector (MCP server)**: personal, chat-only context; approval cards for non-read-only tools (**Always allow**, **Always allow all tools from this connection**).
  - **App user connector**: each end user of the app connects their own account (OAuth), app acts with their permissions.
  - **Custom connector**: admin-defined REST API added to catalog (Aug 31, 2026).
  - **Custom MCP server** (all plans; Lovable static IPs option Enterprise-only), **MCP registries**.
  - **Any API**: agent writes integration code directly.
- Connector gateway stores credentials encrypted, handles token refresh. **Managed by Lovable** option (Perplexity, Firecrawl, Parallel) bills through credits (monthly connector grant 1 credit).
- Admin settings (Business/Enterprise): who can create connections per connector; enable/disable chat connectors.
- Catalog (docs pages, Oct 2026) grouped:
  - AI & data tools: Algolia, Apify, ElevenLabs, Firecrawl, Fireworks, Gemini Enterprise, LlamaParse, Parallel, Perplexity, Replicate.
  - Databases/BI: Supabase, Amazon Redshift, AWS Athena, AWS S3, BigQuery, ClickHouse, Cube, Databricks, dbt Semantic Layer, GoodData, IBM Db2, Looker, Metabase, Microsoft Fabric, MotherDuck, Neon, Omni, Oracle Autonomous AI Database, Power BI, Qlik Cloud, Snowflake.
  - Messaging/email: Brevo, Discord, Firebase Cloud Messaging, GatewayAPI, Mailgun, Resend, Slack, Telegram, Twilio, WhatsApp Business.
  - Sales/CRM/support: Apollo, Attention, Clay, Gong, HubSpot, KLIPY, Pipedrive, Salesforce, Zendesk, Zoho CRM.
  - Dev/cloud: AWS, Azure, Azure Graph & Entra, Cloudflare API, GitHub API, GitLab API, Google Cloud, Inngest, Linear, Logo.dev, Lovable API, n8n.
  - Commerce: Lightspeed, PrestaShop, Shopify, WooCommerce. Accounting: Lexware, sevDesk, Wave, Xero, Zoho Books.
  - Maps: Google Maps Platform, Mapbox.
  - Marketing/analytics: beehiiv, Bing Webmaster Tools, Google Analytics, Google Business Profile, Google Search Console, Klaviyo, LinkedIn, Loops, PostHog, Semrush, TikTok, Twitch, X.
  - Payments/finance: Chargebee, Pledge, Ramp, Stripe.
  - Productivity: Airtable, Asana, Ashby, Calendly, Fireflies, Google Workspace, Granola, incident.io, Microsoft 365 (incl. SharePoint), Microsoft Copilot managed runtime, Notion, Tally, Workday.
  - Security: Aikido (pentesting), Wiz.
  - CMS: Contentful, Storyblok, Wix, WordPress (self-hosted), WordPress.com.
  - Chat-only MCP connectors mentioned in changelog: Atlassian (Jira/Confluence), Notion, Linear, Miro, n8n, Sentry, Hex, Confidence, PostHog, Amplitude, Granola, HeyGen, Polar, Sanity, Canva, Wispr Flow, Excalidraw+, Loom, Figma (desktop MCP).

## 21. Git sync

- Providers: **GitHub** (github.com all plans; GHE Cloud data residency and GHE Server on Enterprise), **GitLab** (GitLab.com + self-managed, OAuth), **Bitbucket Cloud** (OAuth, Sep 10, 2026).
- Two layers: **workspace connection** (owner/admin installs Lovable GitHub App: All repositories / Only select repositories → **Install & Authorize**) and **project repository link** (Lovable creates a NEW repo; cannot attach an existing repo; cannot import a repo by Git sync).
- Two-way sync on one active branch; switch/create branches from Lovable. Lovable commits every change with descriptive messages; pushes to the synced branch flow back.
- **Sync status card** (Project settings → Git): "In sync with GitHub", "Lovable is N commits ahead", "GitHub is N commits ahead", "Lovable and GitHub have diverged" (pushes to `lovable-sync` branch), "Couldn't check…", **Re-check**; compares last 50 commits ("50+").
- Protected branches → pushes go to `lovable-sync`. Force-push protection: backup + "A repository push replaced your Lovable work" notice → **Review restore** → **Restore Lovable work** / **Keep repository version** (project owner only; 24h notice, later **Check for saved Lovable work**).
- Commit attribution with member emails (Business/Enterprise). Disconnect project from GitHub (Nov 2025). Repository renames followed (GitHub/Bitbucket), break sync on GitLab.
- Workflow guidance: keep Lovable on `main`, work locally on feature branches, merge with merge commits (no squash/rebase on synced branch). README + package.json describe local run.

## 22. Payments, Shopify, Emails

### Built-in payments (Apr 24, 2026)
- Providers: **Paddle** (Merchant of Record, 5% + 50¢, no monthly fee) and **Stripe** (PSP, optional MoR "Managed Payments", standard rates). Lovable recommends based on what you sell.
- Requires Pro+; project/workspace admins/owners set up. Auth recommended.
- **Test mode** in preview (test cards, test banner only in preview) vs **Live mode** on published app; products/prices sync test→live on publish; go-live checklist (provider verification, readiness check, publish). **Payments tab** with test/live data toggle.
- Free plan: connect your own Stripe (API key via secret form; checkout, subscriptions, customer portal; webhooks via edge functions).

### Shopify (Nov 5, 2025)
- Create a new Shopify store (choose location, claim flow) or connect existing (email must match store owner). Storefront built in Lovable; only connecting user has write access to products/variants/discounts; collaborators read-only. Bulk catalog edits with one approval; pick store from list.

### Emails (Mar–Apr 2026)
- **More → Emails**: auth emails (signup confirmation, password reset, invites, magic links, email change, reauth) and app emails (transactional) from own domain/subdomain (e.g., `noreply@notify.yourdomain.com`). Lovable manages DNS verification, SPF, DKIM, DMARC, unsubscribe handling, branded templates. Paid plans. Or use Resend/Mailgun/Brevo connectors.

## 23. Publishing, hosting, domains, SEO, analytics, growth

### Publish dialog
1. **Publish** button (top right) → dialog runs **Quick scan** (~10s) automatically.
2. **Website URL** field: `<subdomain>.lovable.app` (editable on first publish; later via Project settings → URL subdomain). Business/Enterprise branded URLs `app-name.workspace-subdomain.lovable.app`. Enterprise publishing domain. Custom domain "still being set up" note.
3. Visibility row → **Who can view your site?** picker:
   - Free/Pro: **Public** (default) / **Invite only** (≤10 people per project; workspace members by name or external by email).
   - Business/Enterprise: **Public** / **Workspace** / **Custom** (workspace, groups, individuals, organization, external emails) / **Organization** (Enterprise orgs).
   - External invitees marked **EXT**; invite emails sent on publish.
4. Security line: "Running quick security scan", "No security issues found", "2 critical security issues found", "3 security findings", "Run security scan" → opens Security view. Doesn't block by default.
5. **Publish** → "Your website is live" with copy link, visit, SERP preview, **Edit** next to title (opens Social/Search cards).
- Notices: **Build errors need fixing** (shows **Try to fix** instead of Publish), **Your app is under high load**.
- **⋮** menu in dialog: **Social & search appearance**, **Unpublish**. Favicon next to URL opens social/search cards.
- Later changes: **Publish changes**; dot on Publish button when unpublished changes exist.
- Enterprise policies: **Publish requires approval** → **Request approval** (note + screenshot to approvers) → **Send request** → "Publish request pending" / "Request approved" / "Publish request denied" (**Request again**) / "Publish request expired" (30 days); or "Publishing is blocked by workspace policy".
- Publish from chat: "Publish my app", "Deploy this project", "Ship it", "Go live", "Publish to my-todos.lovable.app" (asks approval unless auto-approved; billed as build usage).
- Unpublish: Project settings → Publishing → **Unpublish project**; dialog ⋮ → Unpublish; bulk from dashboard. Free workspaces' sites may be unpublished after 12 months without visits/owner logins.
- **Metadata**: title, meta description, favicon generated during build; OG image = image you set or latest app screenshot (not for non-public sites). Change via chat.
- **"Edit with Lovable" badge** on published apps; **Hide Lovable badge** in Project settings (Pro+), instant without republish.

### Hosting
- Free on all plans at `*.lovable.app`; HTTPS automatic (incl. custom domains); global edge delivery; static pages don't consume credits; Run credits for backend/AI.
- CDN/reverse proxy support for custom domains (reintroduced Apr 2026); custom domain proxying (Feb 2026).
- PWA support ("Smarter PWA support" Jun 2026).

### Custom domains (paid plans; since Mar 14, 2025)
- Entry points: Project → Settings → **Domains**, Publish dialog → **Add domain**, Workspace settings → Workspace domains, or chat ("find me a domain for my bakery").
- **Buy a new domain** (registered via Lovable, belongs to workspace; partner historically IONOS [CL 2025-04-11]; WHOIS privacy toggle; nameserver changes; transfer in/out; .si etc.) or **Connect existing domain** (DNS records: A/TXT verification; status states; issue detection). **Primary domain** (others redirect) set only in Domains tab.
- Guide: "Launch your site on a custom domain".

### SEO & AI search (May 18, 2026)
- Analytics → **SEO & AI** tab: search/AI traffic, **Google searches** (Google Search Console), **SEO and AI search review** (sitemap, robots.txt, metadata, structured data, page structure, alt text, canonical tags, indexing, AI readiness / AI markdown rendering) with **Run SEO scan**, **Scan again**, **Try to fix**, **Try to fix all**; **Get more search traffic** (keyword research via Semrush data, no Semrush account needed).
- Only public apps indexable; branded workspace URLs never indexed.

### Analytics (real-time analytics since Aug 2025)
- Built-in, no tracking code; toggle **Visitor analytics** in settings.
- Channels: **All, SEO & AI, Social, Referral, Direct, Ads** (UTM/gclid classification).
- Period: last 7 days default, presets, custom ≤90 days (UTC); **Current visits** (last 5 min).
- Metrics: **Visits, Page views, Views per visit, Visit duration, Bounce rate** with % change (≥30 visits); drag to zoom; **Show anyway** for sparse data. Top pages/sources breakdowns.
- Lovable API exposes analytics.

### Growth tools (Oct 14, 2026)
- Growth plan advice, SEO/AI search, outreach and communities, Google Business Profile, **Google Ads** and **Meta (Facebook/Instagram) ads** created and launched from Lovable (creative generation, tracking setup, imports existing campaigns). No Lovable fee on ad spend.

## 24. Security

- **Quick scan** (automatic on every publish; free): database review (RLS missing/permissive, leaked-password protection), dependency audit (npm vulns), MCP server exposure; plus Wiz if connected.
- **Deep scan** (free, 3–13 min, max 15; phases "Getting to know your app", "Reading through your code", "Double-checking what we found", "Wrapping up"): access control/authorization, unauthenticated/abusable endpoints, unsafe input/injection, leaked secrets, payments/billing tampering, authentication bypass, exposed personal data.
- **Security view** (More → Security): two cards (**Deep security scan** *Recommended*, **Quick security scan** *Automatic*) with states "Not scanned yet", "Last scan … Up to date", **Run deep scan**/**Run quick scan**; findings grouped by area with **Critical / Warning / Info**; stale findings show clock icon; **Try to fix** (counts toward 10 free fixes); **Auto-fix security issues** setting for low-risk findings.
- Optional connectors: **Wiz** (policy selection), **Aikido** (penetration testing, all plans since Jun 2026).
- API key detection in chat (warns before sharing secrets); leaked API keys auto-revoked [CL 2026-07-25]; sensitive data scanning (PII labels, Enterprise); Security center + Security insights (Business+); scheduled scans (Enterprise); security scan profiles; Trust Center page for published apps (disabled by default since Aug 2026).
- Historical context: CVE-2025-48757 (RLS misconfiguration exposing data in 170+ Lovable apps, 2025, disputed by Lovable) drove security scan investment.

## 25. Testing and monitoring

- Lovable auto-writes small tests for business rules (prices, limits, permissions, dates) and runs them before finishing; not for copy/styling. Backend logic tests for TanStack apps; edge tests only on request.
- **Browser testing** (Feb 5, 2026): remote virtual browser; screenshots, clicks, forms, navigation, console logs, network requests, runtime errors, device sizes; triggered by "verify it works", "test this", etc.; signs in to test pages behind login (single user → that user; otherwise per request).
- Browser performance tools (Apr 2026).
- **Project monitoring** (Beta Jun 30, 2026; Pro+): daily/weekly scans of code and visitor errors; brief posted in chat with fix/ignore; email alerts; job failure alerts.

## 26. Knowledge, Skills, Design systems, Templates

- **Knowledge** (formerly "Custom knowledge"/project knowledge since 2024; workspace knowledge Mar 2026): plain-text always-in-context instructions. Workspace knowledge ≤10,000 chars (owners/admins only). Project knowledge (anyone with edit access). Locations: Workspace settings → Knowledge (Customization), Project settings → Knowledge tab, Chat actions → Project → Knowledge.
- **Skills** (May 18, 2026): named markdown playbooks (name, description for auto-trigger, instructions); `/skill` invocation or auto-apply; **Workspace skills** (create in chat, write manually, import from GitHub or ZIP, download) and **Skills built by Lovable** (accessibility checks, redesigns, SEO reviews, skill creation, video creation, Goal). Name `goal` reserved.
- **Design systems** (all paid plans since Aug 19, 2026; Enterprise for npm-package wrapping): a dedicated Lovable project with components, machine-readable schema/guidelines (tokens, catalog, constraints), installation; released versions; connected projects get **Update available** prompt; setup verification; adherence enforcement (flags raw colors, custom components). Workspace/group default. Attach/Manage/Detach in project settings.
- **Design templates** (Business/Enterprise): any workspace-visible project with **Use as a template** toggle; copies whole codebase; default workspace template; appears in Workspace settings → Templates and `+` → Design.
- **Lovable templates**: curated remixable apps (any plan).
- **Themes** (Nov 2025, Design view): brand colors/typography/spacing reusable across projects (UNCERTAIN whether still a distinct UI in Oct 2026; superseded by design systems).
- Other: custom fonts guide, 21st.dev component copy-paste workflow.

## 27. Collaboration

### Roles matrix (project)
| Action | Viewer | Editor | Admin | Owner |
|---|---|---|---|---|
| Magic link / add/remove viewer | Y | Y | Y | Y |
| Add/remove editor | N | Y | Y | Y |
| Add/remove admin | N | N | Y | Y |
| Remix | Y | Y | Y | Y |
| Edit, custom domain, badge, access, GitHub, settings, publish | N | Y | Y | Y |
| Disconnect Supabase | N | N | Y | Y |
| Transfer / delete / restore | N | N | N | Y |

Admin and Viewer project roles are paid-plan only; Free has editors only (no admin roles).

### Workspace
- Roles Owner/Admin/Editor/Viewer (viewer role Pro+ since Sep 2025) + External collaborators (project-only). Workspace owners have access to all projects including Restricted.
- **People** tab: invite by email (unlimited on paid), change roles, remove (choose who inherits projects), approve access requests, CSV export, per-member credit usage and limits, request higher role. Workspace invitations expire after 30 days; invite links; verified-domain auto-join; bulk member management.
- **Groups** (Business/Enterprise; SCIM-synced possible).
- Real-time multiplayer: presence avatars; everyone sees changes live (since Lovable 2.0, Apr 2025). Drafts for parallel work.

### Share dialog
- **Invite people** (emails, groups) with role (Admin/Editor/Viewer) → **Invite**.
- Workspace access row: **Can edit** / **Can view** (Business+) / **No access**→Restricted (Business+).
- **Invite link**: **Edit access** (all plans) / **View access** (paid) / **Disabled**; **Copy invite link**; expires in 5 days; one active link.
- **Project access** list (change role, Remove).
- **Share preview**: multiple named view-only links, guest comments on/off; Free/Pro expire after 7 days; Business/Enterprise password + expiry 24h/7d/30d/never; Enterprise can disable.
- Request access to view-only/private projects (Nov 2025; edit access requests Oct 2026).

### Comments (Apr 2, 2026)
- Pins on elements, threads, replies, `@Lovable` or **Send to chat**, **Resolve**/unresolve, show resolved toggle, edit/delete; comments in shared previews.

### Remix
- Remix dialog switches: **Include project history**, **Copy project files to new project** (edit access only); background progress; secrets not copied; fresh AI key. **Public remixing** toggle (default off; not on Enterprise): logged-out visitors see app preview + **Remix** → **Log in to remix**.

## 28. Chats (outside projects; "Chat before you build" Dec 2025, reworked Sep 21, 2026)

- `lovable.dev/chats`; sidebar **Chats**; **New chat**; private to the user.
- Uses: ideation, workspace Q&A (projects, credits), app traffic/DB checks, cross-project work, connected tools actions (summarize inbox, draft Notion page, open Linear issue), use your own published apps as tools, content creation (briefs, tables, images, short videos), reports from attachments, web research with sources.
- Sends work to projects with **Create a new project?** / **Edit [project]?** cards (**Always allow** options).
- Typed, dictated, and live **voice conversations** (waveform button) in one history; rename chats; star; chat history search.
- Daily chat allowance covers chats; created files available as **Your files** via `@`.
- Also available in Slack (@Lovable, DMs; Enterprise), Telegram bot, ChatGPT app (@Lovable), mobile app Chats tab.

## 29. Pricing, plans, credits

### Plans
| Plan | Price | Notes |
|---|---|---|
| **Free** | $0 | 5 daily build credits (cap 30/month), daily chat allowance, 20 Cloud + 4 AI + 1 connector credits/month; public or invite-only (≤10) publishing; Git sync; no code editing/download; no custom domain; badge shown |
| **Pro** | from **$25/mo** (100 credits) or $250/yr ($21/mo) | Tiers 100 → 10,000 credits/mo; + 5 daily credits (no monthly cap); rollover; top-ups $15/50 credits; code edit/download, custom domains, hide badge, design systems, roles, usage limits |
| **Business** | from **$50/mo** (100 credits) or $500/yr ($42/mo) | Everything in Pro + SSO, design templates, personal projects, workspace publishing, Lovable API, preview link passwords, role-based access, Security center/insights, Insights, commit attribution, data excluded from training by default; top-ups $30/50 credits |
| **Enterprise** | custom, volume-based | SCIM, organizations, audit logs, data exports, scheduled scans, EU inference, publishing controls/policies, publishing domain, build secrets, managed registry, dedicated support; no daily/monthly grants |

Pro tier table (monthly / annual): 100 $25/$250; 200 $50/$500; 400 $100/$1,000; 800 $200/$2,000; 1,200 $294/$2,940; 2,000 $480/$4,800; 3,000 $705/$7,050; 4,000 $920/$9,200; 5,000 $1,125/$11,250; 7,500 $1,688/$16,880; 10,000 $2,250/$22,500.
Business: exactly 2x Pro at low tiers (100 $50, 200 $100, 400 $200, 800 $400, 1,200 $588, 2,000 $960, 3,000 $1,410, 4,000 $1,840, 5,000 $2,250, 7,500 $3,300, 10,000 $4,300).
Annual = 2 months free. Students/teachers: 50% off Pro 100 monthly for up to 12 months (lovable.dev/students). Gift cards available (Dec 2025).

History: 2024 message-based plans → Apr 2025 Pro $25 / Teams $30 → Jun 2025 Teams folded into Pro (20% cheaper), free collaboration up to 20 members → Aug 2025 Business plan → Oct 2025 Cloud & AI usage-based → Jan 2026 build credit top-ups → Jun 18, 2026 "One credit balance".

### Credit mechanics
- Usage types: **Build** (Plan/Build messages, chat→project work, image/video gen), **Chat** (Chats, Chat mode, Slack, Telegram, voice), **Cloud**, **AI gateway**, **Connector**. Usage details split **Build credits** (build+chat) and **Run credits** (cloud+AI+connector).
- Grant order: usage-specific grants first (daily chat allowance → daily build credits → general credits for chat; monthly Cloud/AI/connector grants), then general credits closest to expiry.
- General credits: monthly plan credits (expire 2 months after issue on monthly; 1 month after annual period), top-ups (12 months), bonus (referrals 12 months). Rollover automatic while subscribed. Downgrade to Free freezes paid credits.
- Daily grants reset 00:00 UTC.
- Credit check-ins at 20 credits default per message.
- Free fixes: 10 per account rolling 24h; free inline text edits 100/account + 2,000/workspace per 24h; security scans free.
- **Usage limits & alerts** (paid): thresholds on workspace/projects/members/groups/access tokens; per day or month; credit type; action notify/block/both; default member limit with overrides; increase requests; low-balance alerts. Bulk CSV limits (Enterprise).
- **Credit balance** dialog: **Breakdown** (Monthly, Rollover, Bonus, Top-up credits with expiry) and **History** (granted/expired events, 12 months). "Free usage included" info tooltip; **Daily chat credits** % row.
- Auto top-up: **Top-up amount**, **When my balance falls below**, **Monthly spend limit**.
- Out of credits: building blocked (dialog with top-up/upgrade or **Send a ping** to owners), work paused (**Add credits/Finish up**), chats continue on allowance, AI calls fail, Cloud pauses (data kept), static site stays live.
- "Optimize your usage" button and credit usage investigation [CL 2026-10-14]; ask Lovable about credit usage.

## 30. Account settings (dialog; `Cmd/Ctrl+.`; lovable.dev/settings/account)

Sections:
- **Account** (labeled with name/email): Showcase **skills** (Beta: 12 LinkedIn-postable skills unlocked by category + 20 visits; Free/Pro only), **Profile** (open profile editor), **Username** (3–20 chars, lowercase/numbers/underscore), **Email** (immutable), **Profile visibility** (Public/Private), **Login methods** (unlink; **Link company account**), **Recently deleted workspaces**, **Danger zone → Delete account** (30-day recovery).
- **Preferences**: **Agent permissions** (**Manage**: New projects from chat, Project edits from chat, per-connector permissions, **Manage all permissions**), **Language**, **Chat suggestions**, **Message queue**, **Long-running credit check-ins** + **Check-in level**, **Generation complete sound** (First generation / Always / Never), **Auto-accept invitations**, **AI model training** toggle ("Use my Lovable content for model training"), **Where project data is stored** (region preference).
- **Security**: 2FA (authenticator app and/or SMS), **Log out everywhere**, new device/country sign-in email alerts.
- **Devices & apps**: Slack, Telegram, desktop downloads, mobile QR codes.
- **This device** (desktop app only).
- Search for individual settings [CL 2026-10-13].

## 31. Workspace settings (lovable.dev/settings; owners/admins)

Sidebar sections (as documented):
- **Workspace / General**: Avatar, Name (≤50), Workspace handle, **Enable branded app URLs**, **Transfer primary ownership**, **Leave workspace**, **Recently deleted projects**, **Delete workspace** (60-day restore on non-Enterprise), Workspace domains.
- **Plans & credit usage**: plan card with credits dropdown, **Manage** (**Downgrade to free**, **Invoices & payments** → Stripe portal), **Add credits** (one-time / **Auto top-up**), credit bar, **Details** (Credit balance dialog), **Usage details** (Build credits / Run credits charts by project/person, time range), gift cards.
- **Usage limits & alerts**.
- **Insights** (Business+): active apps/builders, visits, top apps, top contributors, CSV export, department breakdown.
- Access: **People**, **Groups**, **Identity** (SAML/OIDC SSO, enforce SSO, session duration incl. 8h option, verified domains, JIT provisioning, **User provisioning**: SSO login, Verified email sign-up, Add existing users; SCIM Enterprise), **API keys & OAuth** (Workspace access tokens with scopes/expiry/credit limits/IP allowlists — Business+; OAuth clients — all plans).
- Customization: **Knowledge**, **Skills**, **Templates**, **Design systems**, **Announcements** (banner with formatting, links, countdown, color, dismissible; Business+), **Connector settings** (incl. Custom connectors, MCP registries).
- Build & deploy: **Git** (GitHub/GitLab/Bitbucket connections; **Include member email addresses in commits**), **Build secrets** (Enterprise), **Managed registry** (private npm packages, Enterprise).
- Security: **Privacy & security** (Default project access, Default website access, Invite links, Preview link sharing, Public member profiles, Restrict workspace invitations, External project collaborators policy, Default data hosting region, Auto-fix default, code download restriction, 2FA required, SSO-locked membership, etc.), **Security center**, **Security insights**, **Audit logs** (Enterprise; scheduled exports to S3/GCS/Azure Blob/Splunk/Azure Log Analytics), **Data exports**, **Sensitive data scanning**, **Workspace policies** + **Action center** (Enterprise), **EU inference** (Enterprise).
- Historical "Labs" settings page (2025) held experimental toggles like Dev Mode and Chat mode; saved to account since Mar 2025. No current Labs page in docs (UNCERTAIN whether still exists).

## 32. Other surfaces

- **Desktop app** (macOS Apr 2026; Windows Jul 6, 2026): local MCP servers (e.g., Figma desktop MCP), shortcuts, project link copy via right-click, open links via command palette paste, background tabs (tabs removed in 1.9, Oct 2026).
- **Mobile app** (iOS/Android, Apr–May 2026): swipe chat/preview, voice with waveform, camera attachments, native Google/Apple login, push notifications, drafts, Chats tab; iOS purchases via App Store (one-month non-renewing plans for Free workspaces; credits for Pro/Business).
- **Lovable MCP server** `https://mcp.lovable.dev` (OAuth; ChatGPT, Claude/Claude Code, Cursor, VS Code, Codex plugin, Grok, Muse by Meta, Strawberry Browser): create projects, send messages, inspect code, deploy. All plans since Jun 2026.
- **Lovable API** (Business/Enterprise; Sep 17, 2026): REST for projects, deployments (publish/unpublish/status), embed (1-hour preview embed URL), workspace/members/groups, analytics, security scans, PII labels; Postman collection; Lovable API connector for apps.
- **Build with URL**: `https://lovable.dev/#prompt=...&images=...&html=...` (prompt ≤50,000 chars; ≤10 refs; JPEG/PNG/WebP); prefill an existing project's chat with `?prompt=`; Link Generator.
- **Sign in with Lovable** (Oct 14, 2026): OAuth/OIDC provider for any site (SDK script tag or OIDC; scopes openid, profile, email, offline), default on generated apps' login pages.
- **Figma**: Lovable Figma plugin "Lovable: Import from Figma" (pairing code; Aug 21, 2026 export), `.fig` upload, Figma MCP via desktop app. (Earlier Builder.io "Figma to Lovable" plugin in 2025; Figma import removed Nov 2025 for quality, then returned via plugin.)
- **Slack**: @Lovable in channels/DMs; add apps to Slack as agents (Aug 26, 2026).
- **Telegram** bot (May 18, 2026). **ChatGPT app** (Dec 23, 2025).

## 33. Keyboard shortcuts

| Shortcut (Mac / Win) | Action |
|---|---|
| `Cmd+K` / `Ctrl+K` | Command palette (search projects, folders, settings, theme, workspaces, drafts) |
| `Cmd+.` / `Ctrl+.` | Account settings (dashboard); Project settings (in editor) |
| `Cmd+Shift+.` / `Ctrl+Shift+.` | Rename project (editor) |
| `[` or `Cmd+B` / `Ctrl+B` | Toggle sidebar (dashboard) |
| `Cmd+B` / `Ctrl+B` | Hide/show chat panel (editor) |
| `Option+P` / `Alt+P` | Cycle Build/Chat/Plan |
| `Option+V` / `Alt+V` | Start dictation |
| `Enter` | Send message |
| `S` / `T` / `D` / `C` | Preview toolbar: Select / Edit text / Draw / Comment |
| `Cmd+click` / `Ctrl+click` | Multi-select elements |
| `Cmd+S` / `Ctrl+S` | Save file in code editor |
| `Cmd+F` / `Ctrl+F` | Find in file |
| `Cmd+Shift+F` / `Ctrl+Shift+F` | Search code |
| `Cmd+Shift+L` / `Ctrl+Shift+L` | Reference current line/selection in chat |
| `Cmd+Enter` / `Ctrl+Enter` | Run SQL |
| `Cmd+A` / `Ctrl+A` | Select all projects |
| `Esc` | Cancel selection / close |
| Shift+click Refresh | Restart preview environment |
| Desktop: `Cmd+N`, `Ctrl+Tab`, `Cmd+Option+←/→`, `Cmd+1..8`, `Cmd+9`, `Cmd+[`/`]`, `Cmd+Shift+O`, `Cmd+G`, zoom `Cmd+=/-/0` | New chat, switch chats, prev/next chat, go to chat N, last chat, back/forward, open in browser, find next, zoom |
| (2025) `Alt+S` | Old Visual edits select hotkey |

## 34. Prompting best practices (official "Prompting best practices")

- Make Lovable ask clarifying questions; use Plan mode for big/unclear work.
- Phase 1, foundation: plan before you prompt, map the user journey, get the design right first.
- Phase 2, systems: prompt by component not page; design with real content; speak atomic (buttons, cards, modals); use aesthetic buzzwords ("minimal Swiss typography").
- Phase 3, precision: layout prompt patterns; add visuals via URL; say what to change and what to leave alone; point with the preview toolbar.
- Phase 4, iterate and ship: build with backend in mind (auth states, dynamic data, empty/loading/error states); bookmark milestones; preview before risky changes; revert freely.
- First prompt tip: keep v1 free of login/database ("No login or database yet").
- Debugging flow: ask Lovable to investigate (describe expected vs actual) → revert and re-prompt → plan before rebuilding. Use **Try to fix** first (free).
- Send several changes as one list rather than rapid separate messages.
- Prompt library at docs (prompting-library) and Knowledge examples (TypeScript strict, shadcn/ui, React Query, Zustand, service layer, etc.).

## 35. Known limitations and common complaints

Official:
- Web apps only; no native mobile; single fixed stack; no framework choice.
- Git sync creates new repos only; can't import an existing repo via sync (use ZIP import).
- Revert does not roll back DB data; no partial revert; very old versions not restorable.
- Code editing/download require paid plan.
- 10 MB per-file commit limit; attachments limits per plan.
- Backend region immutable; can't switch between built-in and Supabase automatically.
- Unsupported Postgres extensions refused.
- Preview pauses when idle; preview and production share data (no staging DB since Test/Live beta was discontinued).
- Free sites can be unpublished after 12 months idle.
- Model for building not selectable.

Third-party (UNCERTAIN, review blogs 2025–2026):
- Credit burn on bug-fix loops (agent re-introduces bugs, claims fixes that don't work); stubborn bugs 10–20+ credits.
- Large-file rewrites causing regressions; quality degrades as projects grow complex (RBAC, many integrations).
- Best for MVPs/prototypes; production hardening often needs developers.
- Security: RLS misconfigurations (CVE-2025-48757); verify RLS before shipping.
- Pricing complexity (many credit types and grants).

## 36. Changelog highlights (dated)

### 2024 to early 2025
- Dec 2024: Supabase integration matured; GitHub sync; Visual edits (Jan 2025 "Select & edit"). (UNCERTAIN exact dates pre-Dec 2024.)
- Feb 2025: "Lovable Launched" app discovery platform.
- Mar 7, 2025: Versioning 2.0 (bookmarks); Dev Mode (edit code in Lovable, paid).
- Mar 14, 2025: Custom domains; project settings moved to top-left.
- Mar 21, 2025: SEO/OG image support; custom domains backend rewrite; Labs settings saved to account.
- Apr 4, 2025: New editor nav bar (pages dropdown moved to nav bar); Dev Mode GA.
- Apr 11, 2025: Buy domains in Lovable (IONOS partnership); favicon updates.
- **Apr 25, 2025: Lovable 2.0** — rebrand, Teams/multiplayer, Pro $25 / Teams $30, Security Scan on publish, smarter Chat mode.
- May 2025: workspace project transfers; Claude 4 (25% fewer errors, 40% faster).
- Jun 2025: Mermaid diagrams in chat mode; auto Supabase redirect URLs; security review AI; collaboration free (≤20 members); Teams merged into Pro; fuzzy project search; floating homepage prompt bar.
- **Aug 11, 2025**: Agent Mode default; real-time analytics; **Business plan**; Visual edits v2; code search; unified credits bar.
- Sep 1, 2025: Student/teacher discount; Inbox; workspace viewer role; edit streaks.
- **Oct 6, 2025: Lovable Cloud + Lovable AI**, voice mode, files-to-apps, Sonnet 4.5, Stripe integration upgrade.
- Nov 5, 2025: Shopify integration; workspace-only publishing; desktop notifications; request access to private projects.
- Nov 26, 2025: MCP servers (Jira/Confluence/Notion/Linear/n8n), Design view, Themes, new Visual edits, private projects for everyone, Questions, Integrations hub, chat suggestions, "Restore"→"Revert" + edit-and-revert messages, project URL/display name changes.
- Dec 10, 2025: New dashboard, **Chat before you build**, Opus 4.5 core model, Connectors hub (formerly Integrations), unauthenticated MCP support.
- Dec 23, 2025: ElevenLabs/Perplexity/Firecrawl connectors, ChatGPT app, gift cards, Tasks, @-mention code files, project credit usage.

### 2026
- Jan 16: Build credit top-ups, GPT-5.2/Gemini 3 Flash, 2FA, Security center v0.1, redesigned People.
- **Feb 5: Plan mode** (old Chat mode renamed), prompt queue, **Browser testing**, Test/Live envs (beta, later discontinued), Google/Apple auth, new agent & chat UI, new profiles, custom domain proxying, default templates.
- Feb 23: Cross-project referencing, Slack app connector, Opus 4.6, SCIM, guided publishing flow, folder visibility, ownership transfer.
- Mar 16: Twilio/Linear/Telegram/Contentful connectors, auth emails, **workspace knowledge**, audit logs, invite links, Nano Banana 2.
- Apr 2: Generate files & analyze data, **App emails**, AI-powered visual edits, **Project comments**, redesigned domain purchasing, command palette, CDN/reverse proxy.
- **Apr 24: Built-in payments (Paddle/Stripe)**, **desktop app** (macOS), Opus 4.7, chat history search, group-based access, big connector wave (Google Workspace, Microsoft 365, BigQuery, Databricks, Snowflake, HubSpot, Resend, etc.), SAML SSO for apps.
- **May 18**: SEO & AI search, Design guidance, Telegram, Lovable MCP server (preview), **mobile app**, workspace skills, Wiz, **TanStack Start default for new apps** (May 13), DB backup restore, draw on images, Build/Plan mode switch, security memory.
- May 27: **Subagents**, sensitive data scanning. Jun 1: scan profiles, scheduled scans.
- Jun 3: MCP server all plans. **Jun 9: Publish from chat**, workspace view-only sharing. **Jun 10: Preview toolbar**, line references. Jun 16–18: 11 connectors, unpublished-changes indicator, "Build in Lovable from Claude", interface language, refreshed palette, **one credit balance**, TTS/STT in apps, private npm packages.
- Jun 22: TanStack Start default for Enterprise; browser testing more integrated; Aikido all plans. Jun 30: **Project monitoring**.
- Jul: Desktop on Windows (Jul 6), pause Cloud, resize instance from chat, search settings, approve connector actions, redesigned settings, app user connectors (Jul 13), agent integrations / MCP for published apps (Jul 15), workspace identity reuse, auto-delete abandoned projects, **upgrade to TanStack Start** (Jul 28), **Opus 5** (Jul 30).
- Aug: Trust Center, turn off live preview, Veo 3.1, unlimited email invites, free-fix limit, design systems on all paid plans (Aug 19), simpler Publish dialog, messages pause when out of credits, 10-hour messages + Slack chat (Aug 26), `/goal` (Aug 30), custom connectors (Aug 31). Series C $400M at $13.3B (Aug 12).
- Sep: buy domains from chat, preview links with passwords/expiration (Sep 4), follow-ups replace queue (Sep 8), **Drafts** (Sep 9), Bitbucket (Sep 10), 2FA-required workspaces, **Lovable API** (Sep 17), redesigned project cards, **Chats + Chat mode** (Sep 21), Claude models for apps (Sep 23), account settings dialog (Sep 25).
- Oct: GPT Live voice in apps, EU inference, IP allowlists (Oct 1); announcements (Oct 2); workspace usage limits, Drizzle migrations (Oct 7); invite-only publishing on Free/Pro (Oct 8); WebMCP, Gemini 4 Argon (Oct 13); growth tools/ads, **Sign in with Lovable**, restore deleted projects/workspaces 60 days (Oct 14); GPT-6.1 Sol, audit log exports (Oct 15); workspace publishing policies + Action center, OIDC for apps (Oct 16); request higher role (Oct 17); faster dictation (Oct 19); **Organizations**, Lovable-created Supabase projects, redesigned More menu (Oct 20); department adoption Insights (Oct 21).

## 37. Clone-builder notes ("Doable" MVP scope)

Recommended phased scope to mirror Lovable:

1. **MVP**: auth (email + Google/GitHub), personal workspace, dashboard prompt box with Build/Plan toggle, attach images, project creation; editor with chat (streaming agent with activity cards, stop, undo/revert, edit-and-resend), live preview iframe (WebContainer or remote sandbox running Vite/TanStack Start), device toggle, route selector, refresh, open-in-new-tab; code tab (Monaco, read/write, file tree, search); version history with bookmarks; publish to `*.yourdomain.app` subdomain; credits ledger with per-message cost display.
2. **V1**: Supabase/Postgres backend provisioning (DB view, SQL editor, auth users, storage buckets, secrets, logs, edge functions), AI gateway for generated apps, GitHub two-way sync, preview toolbar (select element → chat reference, inline text edit, draw annotation, comments), knowledge (workspace/project), question cards, design guidance swatches, Plan view with approve.
3. **V2**: workspaces/roles/sharing/invite links/preview links, folders/filters/sort, drafts, custom domains, security scans (RLS lint + npm audit + LLM deep scan), analytics, SEO review, connectors catalog (MCP chat connectors + app connectors), Stripe payments, templates/remix, Chats outside projects, skills, usage limits.
- Agent architecture hints from Lovable's design: tool-using loop (gather context → act → verify), subagents for read-only research, browser-testing tool, plan file in repo (`.lovable/plan.md`), per-message credit metering, follow-up injection at step boundaries, 10-hour cap with wrap-up phase, credit check-in pauses, permission model per tool (Always allow / Ask each time / Never allow).

## 38. Sources

Official docs (fetched 2026-10-22 via docs.lovable.dev/llms.txt index; key pages):
- https://docs.lovable.dev/llms.txt
- https://docs.lovable.dev/introduction/welcome
- https://docs.lovable.dev/introduction/getting-started
- https://docs.lovable.dev/introduction/dashboard-overview
- https://docs.lovable.dev/introduction/project-search-and-find
- https://docs.lovable.dev/introduction/project-folders
- https://docs.lovable.dev/features/projects/overview
- https://docs.lovable.dev/features/projects/editor
- https://docs.lovable.dev/features/projects/chat
- https://docs.lovable.dev/features/projects/preview
- https://docs.lovable.dev/features/preview-toolbar
- https://docs.lovable.dev/features/code-mode
- https://docs.lovable.dev/features/projects/history
- https://docs.lovable.dev/features/projects/settings
- https://docs.lovable.dev/features/projects/remix
- https://docs.lovable.dev/features/projects/import-project
- https://docs.lovable.dev/features/drafts
- https://docs.lovable.dev/features/agent-mode
- https://docs.lovable.dev/features/plan-mode
- https://docs.lovable.dev/features/chat-mode
- https://docs.lovable.dev/features/goal-runs
- https://docs.lovable.dev/features/subagents
- https://docs.lovable.dev/features/chats
- https://docs.lovable.dev/features/knowledge
- https://docs.lovable.dev/features/skills
- https://docs.lovable.dev/features/design-guidance
- https://docs.lovable.dev/features/design-systems
- https://docs.lovable.dev/features/business/design-templates
- https://docs.lovable.dev/features/generate-files
- https://docs.lovable.dev/features/upgrade-to-tanstack-start
- https://docs.lovable.dev/features/cloud
- https://docs.lovable.dev/features/database
- https://docs.lovable.dev/features/authentication
- https://docs.lovable.dev/features/storage
- https://docs.lovable.dev/features/secrets
- https://docs.lovable.dev/features/edge-functions
- https://docs.lovable.dev/features/jobs
- https://docs.lovable.dev/features/logs
- https://docs.lovable.dev/features/ai
- https://docs.lovable.dev/features/security
- https://docs.lovable.dev/features/security-view
- https://docs.lovable.dev/features/testing
- https://docs.lovable.dev/features/browser-testing
- https://docs.lovable.dev/features/project-monitoring
- https://docs.lovable.dev/features/publish
- https://docs.lovable.dev/features/hosting
- https://docs.lovable.dev/features/custom-domain
- https://docs.lovable.dev/features/seo-aeo
- https://docs.lovable.dev/features/analytics
- https://docs.lovable.dev/features/growth-tools
- https://docs.lovable.dev/features/ads
- https://docs.lovable.dev/features/payments
- https://docs.lovable.dev/features/custom-emails
- https://docs.lovable.dev/features/agent-integrations
- https://docs.lovable.dev/features/collaboration
- https://docs.lovable.dev/features/share-project
- https://docs.lovable.dev/features/project-visibility
- https://docs.lovable.dev/features/project-comments
- https://docs.lovable.dev/features/cross-project-referencing
- https://docs.lovable.dev/features/workspace
- https://docs.lovable.dev/features/workspace-admin-settings
- https://docs.lovable.dev/features/people
- https://docs.lovable.dev/features/usage-limits-and-alerts
- https://docs.lovable.dev/introduction/lovable-account-settings
- https://docs.lovable.dev/introduction/subscription-plans
- https://docs.lovable.dev/introduction/credits-and-usage
- https://docs.lovable.dev/introduction/credit-top-ups
- https://docs.lovable.dev/introduction/out-of-credits
- https://docs.lovable.dev/introduction/faq
- https://docs.lovable.dev/prompting/prompting-one
- https://docs.lovable.dev/integrations/introduction
- https://docs.lovable.dev/integrations/chat-connectors
- https://docs.lovable.dev/integrations/any-api
- https://docs.lovable.dev/integrations/git-sync-overview
- https://docs.lovable.dev/integrations/github
- https://docs.lovable.dev/integrations/supabase
- https://docs.lovable.dev/integrations/stripe
- https://docs.lovable.dev/integrations/shopify
- https://docs.lovable.dev/integrations/resend
- https://docs.lovable.dev/integrations/figma
- https://docs.lovable.dev/integrations/desktop-app
- https://docs.lovable.dev/integrations/lovable-mobile-app
- https://docs.lovable.dev/integrations/lovable-mcp-server
- https://docs.lovable.dev/integrations/lovable-api
- https://docs.lovable.dev/integrations/build-with-url
- https://docs.lovable.dev/integrations/sign-in-with-lovable
- https://docs.lovable.dev/tips-tricks/deployment-hosting-ownership
- https://docs.lovable.dev/tips-tricks/21stdev
- https://docs.lovable.dev/changelog (Dec 2024 – Oct 21, 2026)
- https://lovable.dev/pricing

Third-party:
- https://www.vktr.com/ai-platforms/lovable-raises-400-million-at-133-billion-valuation/
- https://technode.com/2026/08/13/tencent-backs-lovable-in-400-million-series-c-at-13-3-billion-valuation/
- https://northeasttimes.com/2026/08/13/lovable-the-app-building-startup-just-doubled-its-value-to-13-3-billion/
- https://vestbee.com/insights/articles/lovable-secures-400-m
- https://komo.ai/directory/lovable-funding
- https://eesel.ai/blog/lovable-review
- https://thectoclub.com/tools/lovable-review/
- https://skillscouter.com/lovable-review/
- https://www.superdesign.dev/blog/lovable-review
- https://www.brilworks.com/blog/lovable-dev-limitations/
- https://rapidevelopers.com/lovable-issues/lovable-limitations-and-production-readiness
- https://www.forasoft.com/blog/article/lovable-app-bugs-fix-cost
- https://zoftwarehub.com/en-ae/products/lovable/reviews
- https://alternativeto.net/news/2025/2/lovable-announces-lovable-launched--a-platform-for-lovable-apps-discovery
- https://muz.li/blog/lovable-for-designers-the-complete-guide-to-building-apps-with-ai-2026/
