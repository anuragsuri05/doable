import { z } from "zod";
import { db } from "@/server/db";
import { handle, HttpError } from "@/server/auth";
import { body, projectFor, type Ctx } from "@/server/route-helpers";
import { gitAsync, headSha } from "@/server/projects";
import { getGithubToken } from "@/server/github";

async function gh(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", ...init?.headers },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(res.status === 401 ? 400 : res.status, `GitHub: ${json.message ?? res.statusText}`);
  return json;
}

function authHeader(token: string) {
  return `http.extraHeader=Authorization: Basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`;
}

export const GET = handle(async (_req: Request, ctx: Ctx<{ id: string }>) => {
  const { user, project } = await projectFor(ctx);
  return Response.json({ connected: !!getGithubToken(user.id), repo: project.github_repo });
});

/** Connect (create repo), push the current version, or pull changes made on GitHub. */
export const POST = handle(async (req: Request, ctx: Ctx<{ id: string }>) => {
  const { user, project } = await projectFor(ctx);
  const token = getGithubToken(user.id);
  if (!token) throw new HttpError(400, "Connect GitHub in Settings → Integrations first.");
  const data = await body(
    req,
    z.object({ action: z.enum(["connect", "push", "pull", "disconnect"]), name: z.string().regex(/^[\w.-]+$/).optional(), private: z.boolean().default(true) }),
  );
  if (data.action === "disconnect") {
    db.prepare("UPDATE projects SET github_repo = NULL WHERE id = ?").run(project.id);
    return Response.json({ ok: true, repo: null });
  }
  let repo = project.github_repo;
  if (data.action === "connect") {
    const created = await gh(token, "/user/repos", {
      method: "POST",
      body: JSON.stringify({ name: data.name || project.slug, private: data.private, description: project.description || `Built with Doable` }),
    });
    repo = created.full_name as string;
    db.prepare("UPDATE projects SET github_repo = ? WHERE id = ?").run(repo, project.id);
  }
  if (!repo) throw new HttpError(400, "No repository connected.");
  const remote = `https://github.com/${repo}.git`;
  try {
    if (data.action === "pull") {
      await gitAsync(project.id, ["-c", authHeader(token), "pull", "--ff-only", remote, "main"]);
    } else {
      await gitAsync(project.id, ["-c", authHeader(token), "push", remote, "HEAD:main"]);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message.replace(/Basic [A-Za-z0-9+/=]+/g, "Basic ***") : String(err);
    throw new HttpError(400, /rejected|non-fast-forward/.test(msg) ? "GitHub has newer commits. Pull first." : msg.slice(0, 500));
  }
  return Response.json({ ok: true, repo, sha: headSha(project.id), url: `https://github.com/${repo}` });
});
