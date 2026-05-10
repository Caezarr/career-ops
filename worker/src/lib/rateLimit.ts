/**
 * Per-user-per-day rate limit for server-managed AI endpoints.
 *
 * The subscription model is "Career OS hosts the Anthropic
 * credit" — that means we need to keep a lid on how many times
 * a single user can hit each AI endpoint per day. The bucket is
 * a simple `(user_id, day, kind) → count` row in D1; we
 * `INSERT … ON CONFLICT … UPDATE` to bump it atomically.
 *
 * Why D1 (relational) rather than KV: we need an exact counter
 * with strict consistency, and the volume is low (one row
 * upsert per AI call). KV's eventual consistency would let a
 * user briefly burst past their daily cap.
 */
import type { Env } from "../types";

export interface RateLimitConfig {
  /** Endpoint identifier — stored in the `kind` column so each
   *  endpoint can have its own quota independently. */
  kind: string;
  /** Max calls per UTC day. */
  limit: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Unix-seconds at which the bucket rolls over (next UTC midnight). */
  resetAt: number;
}

function utcDayKey(nowMs: number): string {
  const d = new Date(nowMs);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function nextUtcMidnightSeconds(nowMs: number): number {
  const d = new Date(nowMs);
  d.setUTCHours(24, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

/**
 * Check + bump the counter atomically. Returns whether the call
 * was allowed and how many remain. The increment happens before
 * the check so a parallel race produces a single denied call,
 * never a double-allowed one.
 */
export async function checkAndBumpAiUsage(
  db: D1Database,
  userId: string,
  cfg: RateLimitConfig,
  nowMs: number = Date.now(),
): Promise<RateLimitResult> {
  const day = utcDayKey(nowMs);

  // Atomic upsert: insert with count=1 if absent, otherwise
  // increment by 1. SQLite's ON CONFLICT clause runs in a single
  // statement — D1 serialises writes per database, so two
  // concurrent callers will see consistent ordering.
  const upserted = await db
    .prepare(
      `INSERT INTO ai_usage (user_id, day, kind, count)
       VALUES (?, ?, ?, 1)
       ON CONFLICT (user_id, day, kind)
       DO UPDATE SET count = count + 1
       RETURNING count`,
    )
    .bind(userId, day, cfg.kind)
    .first<{ count: number }>();

  const count = upserted?.count ?? 1;
  const remaining = Math.max(0, cfg.limit - count);
  const resetAt = nextUtcMidnightSeconds(nowMs);

  if (count > cfg.limit) {
    return { allowed: false, remaining: 0, resetAt };
  }
  return { allowed: true, remaining, resetAt };
}

/**
 * Per-endpoint defaults. Tune as real usage data comes in.
 *
 * Rough sizing logic for a €150/year subscription with ~$0.01-0.05
 * per call (depending on prompt size + model):
 *   - polish-profile  → 5/day  (onboarding-shaped, 1-2 calls realistic)
 *   - analyze-cv-ats  → 30/day (frequent — every CV variant × every JD)
 *   - next-steps      → 30/day (one per application, can re-roll)
 *   - optimize-cv     → 10/day (heavy — generates full LaTeX)
 *
 * Worst-case daily cost per user at the cap: ~$2-3 if every endpoint
 * is maxed. That's ~$600/year vs €150 revenue — but the cap is
 * deliberately above any honest use; abuse mitigation is the goal.
 */
export const RATE_LIMITS = {
  polishProfile: { kind: "polish-profile", limit: 5 } satisfies RateLimitConfig,
  analyzeCvAts: { kind: "analyze-cv-ats", limit: 30 } satisfies RateLimitConfig,
  nextSteps: { kind: "next-steps", limit: 30 } satisfies RateLimitConfig,
  optimizeCv: { kind: "optimize-cv", limit: 10 } satisfies RateLimitConfig,
} as const;

export type Env_ = Env; // re-export so callers don't need to dance around types
