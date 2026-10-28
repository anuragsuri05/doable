import { z } from "zod";
import { db, type UserRow } from "@/server/db";
import { verifyPassword } from "@/server/crypto";
import { createSession, handle, HttpError, publicUser } from "@/server/auth";
import { body } from "@/server/route-helpers";

export const POST = handle(async (req: Request) => {
  const { email, password } = await body(req, z.object({ email: z.string(), password: z.string() }));
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase().trim()) as unknown as UserRow | undefined;
  if (!user || !verifyPassword(password, user.password_hash)) throw new HttpError(401, "Wrong email or password");
  await createSession(user.id);
  return Response.json({ user: publicUser(user) });
});
