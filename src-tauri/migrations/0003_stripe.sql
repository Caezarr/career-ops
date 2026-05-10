-- Stripe subscription mirror.
--
-- Single-user local-first app: one row per local user, identified by
-- the same user_id used elsewhere (default: 'local-default'; see
-- `db::DEFAULT_USER_ID`). The desktop app never WRITES authoritative
-- subscription state — the source of truth is Stripe, fetched via
-- `billing::get_subscription` and mirrored here for offline display.
--
-- Future: a Cloudflare Worker webhook will push updates here too,
-- which is why the column shape mirrors Stripe's payload (status,
-- current_period_end, cancel_at_period_end). When that lands the
-- worker just upserts the same row.

CREATE TABLE IF NOT EXISTS subscription (
  user_id TEXT PRIMARY KEY,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  -- 'free' | 'active' | 'trialing' | 'past_due' | 'canceled'
  -- | 'incomplete' | 'unpaid' — strings match Stripe's vocabulary
  -- so the worker upsert is a direct copy.
  status TEXT NOT NULL,
  -- 'free' | 'pro' — internal plan id; Stripe's price_id stays
  -- server-side. The frontend only needs the human plan name.
  plan TEXT NOT NULL,
  -- Epoch seconds. Null on the free tier.
  current_period_end INTEGER,
  -- 0/1 boolean. When 1, the next renewal date is the cancellation
  -- date and we render "ends on X" instead of "renews on X".
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  -- Epoch seconds. Used for cache freshness — refresh from Stripe
  -- if older than ~24h on app boot.
  updated_at INTEGER NOT NULL
);
