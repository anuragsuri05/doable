import "server-only";
import { cookies } from "next/headers";
import { db, newId, now, type UserRow } from "./db";

export const SESSION_COOKIE = "doable_session";
const SESSION_TTL = 1000 * 60 * 60 * 24 * 30;

export async function createSession(userId: string) {
  const id = newId(32);
  db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(id, userId, now() + SESSION_TTL);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL / 1000,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (id) db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
  jar.delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<UserRow | null> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const row = db
    .prepare("SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.expires_at > ?")
    .get(id, now()) as unknown as UserRow | undefined;
  return row ?? null;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireUser(): Promise<UserRow> {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Not signed in");
  return user;
}

/** Wrap a route handler so HttpErrors become JSON responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) return Response.json({ error: err.message }, { status: err.status });
      console.error(err);
      return Response.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
    }
  };
}

export function publicUser(u: UserRow) {
  return { id: u.id, email: u.email, name: u.name, createdAt: u.created_at };
}
