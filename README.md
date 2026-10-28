# Doable

An AI app builder in the style of Lovable, v0 and Emergent. Describe an app in chat, and Doable writes a real React + Vite + Tailwind codebase, runs it in a live preview, versions every change with git, and publishes it to its own subdomain. You can build with **Claude, GPT or Gemini**, using each user's own API key or the platform's.

## Run it

```bash
npm install
cp .env.example .env.local      # optional: add platform keys / DOABLE_SECRET
npm run dev -- -p 3000          # pick a free port
```

Open the app, sign up, and add an API key under **Settings → AI providers**.

Requirements: Node 22.5+ (uses the built-in `node:sqlite`), git, and [bun](https://bun.sh) (recommended for fast installs; npm is the fallback).

## What's built

| Area | Features |
|---|---|
| Models | Claude / OpenAI / Gemini adapters behind one agent loop. You can bring your own key (verified, AES-256-GCM encrypted) or use a platform key. The live model list is fetched from each provider with the user's key. Claude runs with adaptive thinking, an effort setting and server-side refusal fallbacks |
| Agent | Streaming tool-use loop with list/read/write/edit/delete/rename/search files, add npm packages, read console logs and name project. Its steps show as live activity cards with thinking summaries. Stop at any time. Has a max-step limit |
| Modes | **Build** (edits code), **Plan** (read-only, gives a plan with an *Approve & build* button), **Chat** (read-only Q&A with *Implement this*) |
| Home | Hero prompt box with attachments (paste/drop images), mode picker, model picker and voice dictation. Starter templates, a project grid with star/rename/remix/download/delete, and search |
| Editor | Resizable chat and preview layout. Preview / Code tabs. Desktop/tablet/mobile preview, route bar, reload, open in new tab, and restart or reinstall the dev server |
| Visual edits | **Select** mode: click any element in the preview, then edit its text or Tailwind classes directly (free, instant) or *Ask AI to change this element* |
| Code | File tree, Monaco editor, ⌘S save (each save is a version), new/rename/delete file |
| Versions | Every agent turn and manual edit is a git commit. History panel with diffs, restore any version, and "Restore" on each chat message |
| Errors | Build and runtime errors from the preview are captured and shown with a **Try to fix** button. The agent can read them with `read_console_logs` |
| Publish | Builds with Vite and serves at `http://<slug>.localhost:<port>`. Editable subdomain, update/unpublish, and an unpublished-changes badge |
| Project settings | Name/description, **Knowledge** (custom instructions), encrypted env vars/secrets, **Supabase** connect, GitHub (create repo, push, pull), download zip, delete |
| Account | Email/password auth, a usage dashboard (tokens and estimated cost by day/model), agent settings (effort, max steps), theme |

## Architecture

```
src/
  app/                 Next.js App Router pages + /api route handlers
  components/          composer, dashboard, editor (chat, preview, code, history, dialogs), ui
  server/
    ai/                runner (background runs + SSE), tools, prompt, models, keys
      providers/       anthropic.ts · openai.ts · google.ts · mock.ts (dev only: model "doable-mock")
    sandbox.ts         per-project Vite dev server (child process) — swap for Docker/E2B/Vercel Sandbox in prod
    projects.ts        project files + git versioning + zip export
    publish.ts         vite build → .data/sites/<slug>, served via proxy.ts subdomain rewrite
    db.ts              SQLite (node:sqlite): users, sessions, keys, projects, messages, usage
templates/react-vite/  starter for every new app (doable.plugin.ts tags JSX for visual edits)
knowledge/             research notes on Lovable and v0
```

## Production notes

- **Sandbox**: previews run as local Vite processes on `127.0.0.1`, so the editor must be used on the same machine. For multi-user hosting, put `src/server/sandbox.ts` behind container sandboxes (Docker, E2B, Daytona or Vercel Sandbox) and proxy the preview through your domain.
- **Published sites**: set `DOABLE_SITES_HOST` and point a wildcard DNS record (`*.yourdomain`) at the server.
- **Secrets**: set `DOABLE_SECRET`. Without it, a key is generated in `.data/.secret`.
- **Subscriptions**: consumer chat plans (Claude Pro/Max, ChatGPT Plus, Gemini Advanced) can't be used by third-party apps. Users connect developer API keys instead.

## Not built yet (Lovable/v0 features still to add)

Managed backend (Lovable Cloud-style DB/auth/storage provisioning), workspaces and team roles, real-time collaboration and comments, Drafts/branches, custom domains with TLS, a credit/billing system (Stripe), the community gallery, Figma import, a security scanner, analytics, Stripe/Shopify connectors, MCP connectors, mobile apps, and an in-app OAuth GitHub app (it currently uses a personal access token).
