import { z } from "zod";
import { db, newId, now } from "@/server/db";
import { hashPassword } from "@/server/crypto";
import { createSession, handle, HttpError, publicUser } from "@/server/auth";
import { body } from "@/server/route-helpers";

export const POST = handle(async (req: Request) => {
  const { email, password, name } = await body(
    req,
    z.object({ email: z.email(), password: z.string().min(8, "Use at least 8 characters"), name: z.string().min(1).max(80) }),
  );
  const normalized = email.toLowerCase().trim();
  if (db.prepare("SELECT id FROM users WHERE email = ?").get(normalized)) throw new HttpError(409, "An account with this email already exists");
  const id = newId();
  db.prepare("INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)").run(
    id, normalized, name.trim(), hashPassword(password), now(),
  );
  await createSession(id);
  return Response.json({ user: publicUser({ id, email: normalized, name, password_hash: "", created_at: now() }) });
});
