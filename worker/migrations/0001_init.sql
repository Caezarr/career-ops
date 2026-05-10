-- Career OS — auth + cloud-sync schema (Phase 1).
--
-- Three tables:
--   users         — one row per signed-up email
--   magic_links   — single-use tokens, 15-minute TTL
--   snapshots    — Phase 2 placeholder; user_id-keyed JSON blob
--
-- The Stripe columns on `users` are populated by the Stripe webhook
-- handler (Cloudflare Worker, deployed separately) when a checkout
-- completes. The auth flow only ever reads them.

CREATE TABLE IF NOT EXISTS users (
  id                       TEXT PRIMARY KEY,           -- uuidv4 minted at first sign-in
  email                    TEXT UNIQUE NOT NULL,
  email_lower              TEXT UNIQUE NOT NULL,        -- normalised for lookup
  created_at               INTEGER NOT NULL,            -- unix ms
  last_login_at            INTEGER,                     -- unix ms, set on /auth/verify
  -- Subscription mirror (Stripe webhook updates these — see
  -- Career OS desktop's own subscription table for the local mirror).
  stripe_customer_id       TEXT,
  license_status           TEXT NOT NULL DEFAULT 'free',-- free|active|past_due|cancelled
  current_period_end       INTEGER
);

CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(email_lower);

CREATE TABLE IF NOT EXISTS magic_links (
  -- The token itself is the PK. 32 bytes of random → base64url ≈ 43 chars.
  -- We never reuse a token, and a consumed row is kept for ~24h before a
  -- janitor sweep so we can detect replay attempts.
  token                    TEXT PRIMARY KEY,
  user_id                  TEXT NOT NULL,
  email_lower              TEXT NOT NULL,               -- denormalised for log clarity
  created_at               INTEGER NOT NULL,
  expires_at               INTEGER NOT NULL,
  consumed_at              INTEGER,                     -- nullable — once stamped, link is dead
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_magic_links_email ON magic_links(email_lower);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires ON magic_links(expires_at);

-- Snapshots — Phase 2 (cloud sync). Carrying the table now so the
-- migration count stays stable; the Phase 2 push/pull endpoints
-- start writing into it later. One row per user, last-write-wins.
CREATE TABLE IF NOT EXISTS snapshots (
  user_id                  TEXT PRIMARY KEY,
  blob_json                TEXT NOT NULL,
  version                  INTEGER NOT NULL DEFAULT 1,
  updated_at               INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
