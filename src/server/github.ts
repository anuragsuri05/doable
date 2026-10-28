import "server-only";
import { db } from "./db";
import { decrypt } from "./crypto";

/** GitHub personal access token stored (encrypted) alongside AI provider keys. */
export function getGithubToken(userId: string): string | null {
  const row = db.prepare("SELECT enc_key FROM provider_keys WHERE user_id = ? AND provider = 'github'").get(userId) as { enc_key: string } | undefined;
  return row ? decrypt(row.enc_key) : null;
}
