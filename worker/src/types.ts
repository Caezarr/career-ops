/**
 * Cloudflare Worker bindings — surfaced via Hono's `c.env`.
 *
 * Everything that's not a `D1Database` is a string. Cloudflare
 * exposes secrets and `[vars]` blocks identically at runtime; the
 * distinction matters only at config time (where you put the value).
 */

export interface Env {
  // D1 binding (configured in wrangler.toml).
  DB: D1Database;

  // Secrets (set via `wrangler secret put`).
  JWT_SECRET: string;
  LOOPS_API_KEY: string;
  LOOPS_TRANSACTIONAL_ID: string;

  // Public vars (set in wrangler.toml [vars] block).
  APP_DEEP_LINK: string;          // e.g. "careeros://auth/callback"
  WEB_BASE_URL: string;           // e.g. "https://api.careeros.app"
  MAGIC_LINK_TTL_SECONDS: string; // string per Cloudflare convention
  JWT_TTL_SECONDS: string;
}

/** What the JWT carries. Kept tight on purpose — every claim that
 *  ends up in here is hard to evolve without forcing all clients
 *  to re-auth. */
export interface JwtPayload {
  sub: string;     // user.id (uuid)
  email: string;
  iat: number;     // issued at, unix seconds
  exp: number;     // expires at, unix seconds
}

/** Row shape for the `users` table — must mirror migrations/0001_init.sql. */
export interface UserRow {
  id: string;
  email: string;
  email_lower: string;
  created_at: number;
  last_login_at: number | null;
  stripe_customer_id: string | null;
  license_status: "free" | "active" | "past_due" | "cancelled";
  current_period_end: number | null;
}
