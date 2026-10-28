import { z } from "zod";
import { db } from "@/server/db";
import { currentUser, handle, publicUser, requireUser } from "@/server/auth";
import { body } from "@/server/route-helpers";
import { hashPassword, verifyPassword } from "@/server/crypto";
import { HttpError } from "@/server/auth";
import { deleteProject } from "@/server/projects";

export const GET = handle(async () => {
  const user = await currentUser();
  return Response.json({ user: user ? publicUser(user) : null });
});

export const PATCH = handle(async (req: Request) => {
  const user = await requireUser();
  const data = await body(
    req,
    z.object({ name: z.string().min(1).max(80).optional(), currentPassword: z.string().optional(), newPassword: z.string().min(8).optional() }),
  );
  if (data.name) db.prepare("UPDATE users SET name = ? WHERE id = ?").run(data.name, user.id);
  if (data.newPassword) {
    if (!data.currentPassword || !verifyPassword(data.currentPassword, user.password_hash)) throw new HttpError(400, "Current password is wrong");
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(data.newPassword), user.id);
  }
  return Response.json({ ok: true });
});

export const DELETE = handle(async () => {
  const user = await requireUser();
  const ids = db.prepare("SELECT id FROM projects WHERE user_id = ?").all(user.id) as { id: string }[];
  for (const p of ids) deleteProject(p.id);
  db.prepare("DELETE FROM users WHERE id = ?").run(user.id);
  return Response.json({ ok: true });
});
