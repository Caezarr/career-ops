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
  /** Magic-link sign-in template (the original Loops use-case). */
  LOOPS_TRANSACTIONAL_ID: string;
  /** Welcome email — Lifetime (no guarantee). Fires from the Stripe
   *  webhook on `checkout.session.completed` when plan === "lifetime".
   *  Loops MJML template (`welcome-lifetime/index.mjml`), data vars:
   *   - userEmail (Loops syntax: {DATA_VARIABLE:userEmail}) */
  LOOPS_TEMPLATE_WELCOME_LIFETIME: string;
  /** Welcome email — Lifetime + Garantie. Fires from the Stripe
   *  webhook on `checkout.session.completed` when plan === "lifetime_pro".
   *  Loops MJML template (`welcome-lifetime-pro/index.mjml`), data vars:
   *   - userEmail
   *   - refundDeadline (formatted FR date, e.g. "13 novembre 2026")
   *  Split into a dedicated template (instead of a conditional block on
   *  one template) because Loops' MJML upload path doesn't support
   *  Handlebars `{{#if}}` conditionals. */
  LOOPS_TEMPLATE_WELCOME_PRO: string;
  /** "Demande de remboursement reçue" — fires from
   *  `POST /v1/billing/refund`. Loops MJML template
   *  (`refund-requested/index.mjml`), data vars (Loops syntax):
   *   - userEmail
   *   - daysSincePurchase (number)
   *   - deadlineAt (formatted FR date) */
  LOOPS_TEMPLATE_REFUND_REQUESTED: string;
  /** Anthropic API key — used by the server-managed AI endpoints
   *  (e.g. `/v1/ai/polish-profile`). The whole point of the
   *  Career OS subscription is that users don't bring their own
   *  keys; we host the upstream credit. Set with
   *  `wrangler secret put ANTHROPIC_API_KEY`. */
  ANTHROPIC_API_KEY: string;
  /** AssemblyAI API key — used by `/v1/copilot/transcription-token`
   *  to mint short-lived realtime-streaming tokens for the desktop
   *  Copilot session. The desktop app never sees the real key; it
   *  only ever holds 60-second one-shot tokens it uses to connect
   *  to `wss://streaming.assemblyai.com/v3/ws?token=…`. Set with
   *  `wrangler secret put ASSEMBLYAI_API_KEY`. */
  ASSEMBLYAI_API_KEY: string;
  /** Stripe secret key (sk_test_… in dev, sk_live_… in prod). Used
   *  by /v1/billing/checkout to create Checkout Sessions server-side.
   *  Set with `wrangler secret put STRIPE_SECRET_KEY`. */
  STRIPE_SECRET_KEY: string;
  /** Webhook signing secret (whsec_…) — registered against the
   *  /v1/billing/webhook endpoint on the Stripe dashboard. We verify
   *  every incoming webhook against this before mutating state, so
   *  anyone POSTing fake events at us gets a 400. Set with
   *  `wrangler secret put STRIPE_WEBHOOK_SECRET`. */
  STRIPE_WEBHOOK_SECRET: string;

  // Public vars (set in wrangler.toml [vars] block).
  APP_DEEP_LINK: string;          // e.g. "careeros://auth/callback"
  WEB_BASE_URL: string;           // e.g. "https://api.careeros.app"
  MAGIC_LINK_TTL_SECONDS: string; // string per Cloudflare convention
  JWT_TTL_SECONDS: string;
  /** GitHub `<owner>/<repo>` the auto-updater proxies. When unset
   *  the /v1/updates endpoint responds 204 (no update check). */
  GITHUB_REPO?: string;
  /** Stripe Price IDs for the two paid tiers. Created in the Stripe
   *  dashboard ("Products → New product → Price"). Format `price_…`.
   *  We require both at runtime — the checkout endpoint rejects a
   *  plan whose price ID isn't configured. */
  STRIPE_PRICE_LIFETIME: string;     // 99€ one-time, no guarantee
  STRIPE_PRICE_LIFETIME_PRO: string; // 149€ one-time, with guarantee
  /** Where Stripe redirects after Checkout completes. Deep-links
   *  back into the desktop app (or a web page for the future web
   *  version). Use a stable URL — Stripe caches the value on the
   *  Checkout Session. */
  STRIPE_SUCCESS_URL: string;        // e.g. "careeros://billing/success"
  STRIPE_CANCEL_URL: string;         // e.g. "careeros://billing/cancel"
}

/** Refund window for lifetime_pro. 180 days from purchase. Hardcoded
 *  intentionally — we don't want this to drift via env config since
 *  it's a contractual promise in CGU §7. */
export const REFUND_WINDOW_DAYS = 180;
export const REFUND_WINDOW_MS = REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/** Plan tiers — must match `users.plan` enum values. */
export type Plan = "free" | "lifetime" | "lifetime_pro";

/** What the JWT carries. Kept tight on purpose — every claim that
 *  ends up in here is hard to evolve without forcing all clients
 *  to re-auth. */
export interface JwtPayload {
  sub: string;     // user.id (uuid)
  email: string;
  iat: number;     // issued at, unix seconds
  exp: number;     // expires at, unix seconds
}

/** Row shape for the `users` table.
 *  Mirrors migrations 0001_init.sql + 0003_billing.sql. */
export interface UserRow {
  id: string;
  email: string;
  email_lower: string;
  created_at: number;
  last_login_at: number | null;
  // Stripe / billing (0003_billing.sql)
  stripe_customer_id: string | null;
  /** Legacy column — keep for backwards-compat, do not write to.
   *  The canonical source of truth is `plan` below. */
  license_status: "free" | "active" | "past_due" | "cancelled";
  current_period_end: number | null;
  /** Canonical plan tier — single source of truth post-pivot. */
  plan: Plan;
  /** Unix ms of `checkout.session.completed`. NULL for free users. */
  purchased_at: number | null;
  /** Unix ms of `purchased_at + 180 days` for lifetime_pro, else NULL. */
  refund_deadline_at: number | null;
  /** SQLite stores booleans as 0/1 integers. */
  has_guarantee: 0 | 1;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  refund_requested_at: number | null;
  refunded_at: number | null;
}
