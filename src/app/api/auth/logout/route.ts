import { destroySession, handle } from "@/server/auth";

export const POST = handle(async () => {
  await destroySession();
  return Response.json({ ok: true });
});
