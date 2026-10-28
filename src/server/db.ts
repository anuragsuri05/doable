import "server-only";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import crypto from "node:crypto";
import { DATA_DIR } from "./paths";

type G = typeof globalThis & { __doableDb?: DatabaseSync };
const g = globalThis as G;

function open() {
  const db = new DatabaseSync(path.join(DATA_DIR, "doable.db"), { timeout: 10_000 });
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS provider_keys (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      enc_key TEXT NOT NULL,
      hint TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, provider)
    );
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      json TEXT NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      slug TEXT UNIQUE NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'private',
      starred INTEGER NOT NULL DEFAULT 0,
      knowledge TEXT NOT NULL DEFAULT '',
      env_enc TEXT NOT NULL DEFAULT '',
      published_at INTEGER,
      published_commit TEXT,
      remixed_from TEXT,
      github_repo TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      parts_json TEXT NOT NULL DEFAULT '[]',
      attachments_json TEXT NOT NULL DEFAULT '[]',
      mode TEXT NOT NULL DEFAULT 'build',
      provider TEXT,
      model TEXT,
      status TEXT NOT NULL DEFAULT 'done',
      error TEXT,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      cost_usd REAL NOT NULL DEFAULT 0,
      commit_sha TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS messages_project ON messages(project_id, created_at);
    CREATE TABLE IF NOT EXISTS usage_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id TEXT,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      key_source TEXT NOT NULL,
      input_tokens INTEGER NOT NULL,
      output_tokens INTEGER NOT NULL,
      cost_usd REAL NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  return db;
}

export const db: DatabaseSync = g.__doableDb ?? (g.__doableDb = open());

export function newId(len = 14) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export const now = () => Date.now();

// ---- Row types ----
export interface UserRow { id: string; email: string; name: string; password_hash: string; created_at: number }
export interface ProjectRow {
  id: string; user_id: string; name: string; description: string; slug: string; visibility: string;
  starred: number; knowledge: string; env_enc: string; published_at: number | null; published_commit: string | null;
  remixed_from: string | null; github_repo: string | null; created_at: number; updated_at: number;
}
export interface MessageRow {
  id: string; project_id: string; role: "user" | "assistant"; content: string; parts_json: string; attachments_json: string;
  mode: string; provider: string | null; model: string | null; status: string; error: string | null;
  input_tokens: number; output_tokens: number; cost_usd: number; commit_sha: string | null; created_at: number;
}

export function getProject(id: string) {
  return db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as unknown as ProjectRow | undefined;
}

export function getProjectForUser(id: string, userId: string) {
  const p = getProject(id);
  return p && p.user_id === userId ? p : undefined;
}

export function touchProject(id: string) {
  db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(now(), id);
}

export function getUserSettings(userId: string): Record<string, unknown> {
  const row = db.prepare("SELECT json FROM user_settings WHERE user_id = ?").get(userId) as { json: string } | undefined;
  return row ? JSON.parse(row.json) : {};
}

export function setUserSettings(userId: string, patch: Record<string, unknown>) {
  const next = { ...getUserSettings(userId), ...patch };
  db.prepare("INSERT INTO user_settings (user_id, json) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET json = excluded.json")
    .run(userId, JSON.stringify(next));
  return next;
}
