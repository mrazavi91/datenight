import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "fs";
import path from "path";
import * as schema from "../shared/schema";

const dataDir = path.resolve(import.meta.dirname, "..", "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(path.join(dataDir, "datenight.db"));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

export function migrate() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      google_id TEXT UNIQUE,
      auth_provider TEXT NOT NULL DEFAULT 'email',
      avatar_url TEXT,
      couple_id TEXT,
      email_verified_at INTEGER,
      verification_token TEXT UNIQUE,
      verification_token_expires_at INTEGER,
      one_time_credits INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS couples (
      id TEXT PRIMARY KEY,
      invite_code TEXT NOT NULL UNIQUE,
      user1_id TEXT NOT NULL,
      user2_id TEXT,
      credits INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invitations (
      id TEXT PRIMARY KEY,
      couple_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      recipient_id TEXT NOT NULL,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      location TEXT,
      note TEXT,
      emoji TEXT NOT NULL DEFAULT '💕',
      status TEXT NOT NULL DEFAULT 'pending',
      awaiting_response_from TEXT NOT NULL,
      proposed_date TEXT,
      proposed_time TEXT,
      proposed_note TEXT,
      proposed_by TEXT,
      paid_with_credit INTEGER NOT NULL DEFAULT 0,
      credit_awarded INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      responded_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      invitation_id TEXT NOT NULL UNIQUE,
      note TEXT,
      rating INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS memory_photos (
      id TEXT PRIMARY KEY,
      memory_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS support_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      invitation_id TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS one_time_invitations (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      recipient_name TEXT,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      location TEXT,
      note TEXT,
      emoji TEXT NOT NULL DEFAULT '💕',
      status TEXT NOT NULL DEFAULT 'pending',
      response_token TEXT NOT NULL UNIQUE,
      paid_with_credit INTEGER NOT NULL DEFAULT 0,
      credit_awarded INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      responded_at INTEGER,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS one_time_payments (
      id TEXT PRIMARY KEY,
      stripe_session_id TEXT UNIQUE,
      sender_id TEXT NOT NULL,
      pending_data TEXT NOT NULL,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'gbp',
      status TEXT NOT NULL DEFAULT 'pending',
      one_time_invitation_id TEXT,
      created_at INTEGER NOT NULL,
      fulfilled_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      stripe_session_id TEXT UNIQUE,
      couple_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      recipient_id TEXT NOT NULL,
      pending_data TEXT NOT NULL,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'gbp',
      status TEXT NOT NULL DEFAULT 'pending',
      invitation_id TEXT,
      created_at INTEGER NOT NULL,
      fulfilled_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_invitations_couple ON invitations(couple_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_payments_couple ON payments(couple_id);
    CREATE INDEX IF NOT EXISTS idx_memory_photos_memory ON memory_photos(memory_id);
    CREATE INDEX IF NOT EXISTS idx_one_time_invitations_sender ON one_time_invitations(sender_id);
  `);

  // SQLite has no "ADD COLUMN IF NOT EXISTS" — for databases created before a column
  // existed, add it by hand so upgrades don't require wiping data/.
  ensureColumn("couples", "credits", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("invitations", "paid_with_credit", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("invitations", "credit_awarded", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("users", "email_verified_at", "INTEGER");
  ensureColumn("users", "verification_token", "TEXT");
  ensureColumn("users", "verification_token_expires_at", "INTEGER");
  ensureColumn("users", "one_time_credits", "INTEGER NOT NULL DEFAULT 0");
}

function ensureColumn(table: string, column: string, definition: string) {
  const columns = sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!columns.some((c) => c.name === column)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
