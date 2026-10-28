import { handle, requireUser } from "@/server/auth";
import { db } from "@/server/db";

export const GET = handle(async (req: Request) => {
  const user = await requireUser();
  const days = Math.min(365, Number(new URL(req.url).searchParams.get("days")) || 30);
  const since = Date.now() - days * 86_400_000;
  const byModel = db
    .prepare(
      `SELECT provider, model, key_source AS source, COUNT(*) AS runs, SUM(input_tokens) AS inputTokens, SUM(output_tokens) AS outputTokens, SUM(cost_usd) AS costUsd
       FROM usage_events WHERE user_id = ? AND created_at > ? GROUP BY provider, model, key_source ORDER BY costUsd DESC`,
    )
    .all(user.id, since);
  const byDay = db
    .prepare(
      `SELECT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch') AS day, SUM(input_tokens) AS inputTokens, SUM(output_tokens) AS outputTokens, SUM(cost_usd) AS costUsd, COUNT(*) AS runs
       FROM usage_events WHERE user_id = ? AND created_at > ? GROUP BY day ORDER BY day`,
    )
    .all(user.id, since);
  const byProject = db
    .prepare(
      `SELECT p.name AS name, u.project_id AS projectId, COUNT(*) AS runs, SUM(u.cost_usd) AS costUsd, SUM(u.input_tokens + u.output_tokens) AS tokens
       FROM usage_events u LEFT JOIN projects p ON p.id = u.project_id WHERE u.user_id = ? AND u.created_at > ? GROUP BY u.project_id ORDER BY costUsd DESC LIMIT 20`,
    )
    .all(user.id, since);
  return Response.json({ byModel, byDay, byProject, days });
});
