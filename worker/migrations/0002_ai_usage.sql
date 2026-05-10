-- Career OS — server-managed AI usage tracking.
--
-- The whole subscription model is "150€ flat, we host the upstream
-- credit (Anthropic, Whisper, etc.)". To keep that economically
-- sane, every server-managed AI endpoint counts requests per user
-- per day in this table. The middleware checks the count BEFORE
-- forwarding to Anthropic and rejects with 429 once the daily
-- limit hits.
--
-- We deliberately don't track tokens — the daily request cap is
-- coarse but sufficient: a user who polishes 50 profile.md per
-- day is either testing or abusing, both of which we want to
-- throttle. Costs are bounded server-side by the Anthropic
-- max_tokens parameter on each route.

CREATE TABLE IF NOT EXISTS ai_usage (
  user_id     TEXT NOT NULL,
  -- "YYYY-MM-DD" in UTC. Cheap key; doesn't need a join.
  day         TEXT NOT NULL,
  -- Endpoint identifier ("polish-profile", "ats", etc.) so we
  -- can rate-limit each independently when more endpoints land.
  kind        TEXT NOT NULL,
  count       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day, kind),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_day ON ai_usage(user_id, day);
