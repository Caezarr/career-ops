/**
 * Thin D1 helpers — keeps the route handlers focused on flow, not
 * SQL string concatenation.
 *
 * Naming: every fn is named after the action (`upsertUserByEmail`,
 * `consumeMagicLink`) rather than the table — easier to grep when
 * debugging an auth flow.
 */
import type { UserRow } from "../types";

export async function findUserByEmail(
  db: D1Database,
  emailLower: string,
): Promise<UserRow | null> {
  const row = await db
    .prepare("SELECT * FROM users WHERE email_lower = ? LIMIT 1")
    .bind(emailLower)
    .first<UserRow>();
  return row ?? null;
}

export async function upsertUserByEmail(
  db: D1Database,
  args: { id: string; email: string; emailLower: string; nowMs: number },
): Promise<UserRow> {
  // First-time signup: insert. Returning user: we just touch
  // last_login_at later in the verify step.
  await db
    .prepare(
      `INSERT INTO users (id, email, email_lower, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(email_lower) DO NOTHING`,
    )
    .bind(args.id, args.email, args.emailLower, args.nowMs)
    .run();

  const row = await findUserByEmail(db, args.emailLower);
  if (!row) {
    // Should never happen — the row exists either via insert or
    // via the existing one — but if the DB is misconfigured we
    // surface the failure clearly instead of returning null.
    throw new Error("upsertUserByEmail: user row missing after insert");
  }
  return row;
}

export async function createMagicLink(
  db: D1Database,
  args: {
    token: string;
    userId: string;
    emailLower: string;
    nowMs: number;
    expiresAtMs: number;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO magic_links (token, user_id, email_lower, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(
      args.token,
      args.userId,
      args.emailLower,
      args.nowMs,
      args.expiresAtMs,
    )
    .run();
}

export interface MagicLinkRow {
  token: string;
  user_id: string;
  email_lower: string;
  created_at: number;
  expires_at: number;
  consumed_at: number | null;
}

/** Look up a magic link AND mark it consumed atomically (UPDATE
 *  with WHERE consumed_at IS NULL). Returns the row only if we
 *  successfully transitioned it from unconsumed → consumed; null
 *  in every other case (token unknown, expired, already used,
 *  replay attempt). */
export async function consumeMagicLink(
  db: D1Database,
  token: string,
  nowMs: number,
): Promise<MagicLinkRow | null> {
  // First fetch — we still need to inspect expires_at + consumed_at
  // to decide our return shape.
  const row = await db
    .prepare("SELECT * FROM magic_links WHERE token = ? LIMIT 1")
    .bind(token)
    .first<MagicLinkRow>();
  if (!row) return null;
  if (row.consumed_at !== null) return null;
  if (row.expires_at < nowMs) return null;

  // Atomic transition. The WHERE consumed_at IS NULL guards against a
  // concurrent /verify hitting the same token twice.
  const result = await db
    .prepare(
      `UPDATE magic_links SET consumed_at = ?
       WHERE token = ? AND consumed_at IS NULL`,
    )
    .bind(nowMs, token)
    .run();
  // D1's `meta.changes` tells us how many rows were updated.
  // 0 = lost the race; bail.
  if (!result.meta || result.meta.changes !== 1) return null;

  return { ...row, consumed_at: nowMs };
}

export async function touchLastLogin(
  db: D1Database,
  userId: string,
  nowMs: number,
): Promise<void> {
  await db
    .prepare("UPDATE users SET last_login_at = ? WHERE id = ?")
    .bind(nowMs, userId)
    .run();
}

export async function findUserById(
  db: D1Database,
  id: string,
): Promise<UserRow | null> {
  const row = await db
    .prepare("SELECT * FROM users WHERE id = ? LIMIT 1")
    .bind(id)
    .first<UserRow>();
  return row ?? null;
}
