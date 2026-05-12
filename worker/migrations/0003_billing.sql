-- Career OS — billing schema (Phase 3).
--
-- We pivoted away from the legacy recurring subscription (€15/mo,
-- `license_status` column on `users`) to the one-time lifetime
-- pricing model:
--
--   free            — no payment, beta access
--   lifetime        — 99€ one-time, full access for life, no refund
--   lifetime_pro    — 149€ one-time, full access for life, includes
--                     the 180-day "no interview = refund" guarantee
--
-- The new `plan` column is the canonical source of truth. The legacy
-- `license_status` column stays in place for migration safety but
-- isn't read anywhere new.
--
-- `purchased_at` is the Stripe `checkout.session.completed` event
-- timestamp (server-side, in unix ms). `refund_deadline_at` is
-- computed at write time as `purchased_at + 180 days` for the Pro
-- tier, NULL otherwise. We keep the value denormalised so a future
-- refund check is a single SELECT instead of a date-math join.

ALTER TABLE users
  ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';

ALTER TABLE users
  ADD COLUMN purchased_at INTEGER;

ALTER TABLE users
  ADD COLUMN refund_deadline_at INTEGER;

-- `1` = lifetime_pro (has the guarantee), `0` = lifetime or free.
ALTER TABLE users
  ADD COLUMN has_guarantee INTEGER NOT NULL DEFAULT 0;

-- Optional Stripe Checkout Session id — kept so we can correlate a
-- support request back to the payment on Stripe's side without
-- digging through their dashboard.
ALTER TABLE users
  ADD COLUMN stripe_session_id TEXT;

-- Optional Stripe PaymentIntent id — needed if/when we issue a refund
-- via the Stripe API (the refund endpoint takes the charge/PI id).
ALTER TABLE users
  ADD COLUMN stripe_payment_intent_id TEXT;

-- Refund tracking. Set when a refund request is processed.
-- `refund_requested_at` is set the moment the user clicks "Demander
-- un remboursement" in Settings → Billing; `refunded_at` is set when
-- the Stripe refund actually completes (or the support team marks
-- the request as resolved in admin tools later).
ALTER TABLE users
  ADD COLUMN refund_requested_at INTEGER;

ALTER TABLE users
  ADD COLUMN refunded_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);
