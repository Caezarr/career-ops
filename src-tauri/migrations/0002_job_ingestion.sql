-- Phase 6: persist job ingestion to SQLite so jobs + sources +
-- bookmarks survive across restarts and don't blow localStorage.

-- ── Configured sources ────────────────────────────────────────────
-- One row per (provider, identifier) the user has registered. Seeded
-- on first launch from src-tauri/src/ingest/builtin_sources.rs;
-- afterwards the Settings → Job Sources panel owns this list.
CREATE TABLE ingest_source (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,                    -- 'greenhouse' | 'lever' | 'ashby' | 'ycombinator'
  identifier TEXT NOT NULL,                  -- slug, or '' for YC (all roles)
  label TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,        -- bool 0/1
  added_at INTEGER NOT NULL,                 -- epoch ms
  last_synced_at INTEGER,                    -- epoch ms, NULL until first sync
  last_error TEXT,                           -- last failure message, NULL when ok
  UNIQUE(provider, identifier)
);

-- ── Cached job postings ───────────────────────────────────────────
-- Bulk-replaced per source on each sync. The full enriched Job shape
-- (with avatar, seniority, sector, etc.) lives in `data` as JSON to
-- keep the schema compact and lossless. role + company are duplicated
-- as columns for cheap LIKE filtering before we hydrate.
CREATE TABLE ingested_job (
  id TEXT PRIMARY KEY,                       -- "ext:<provider>:<identifier>:<sourceId>"
  provider TEXT NOT NULL,
  identifier TEXT,                           -- NULL for YC postings
  source_id TEXT NOT NULL,                   -- provider's own job ID
  role TEXT NOT NULL,
  company TEXT NOT NULL,
  data TEXT NOT NULL,                        -- JSON: full Job (camelCase)
  fetched_at INTEGER NOT NULL,
  UNIQUE(provider, identifier, source_id)
);

CREATE INDEX idx_ingested_job_company ON ingested_job(company);
CREATE INDEX idx_ingested_job_role ON ingested_job(role);
CREATE INDEX idx_ingested_job_source ON ingested_job(provider, identifier);

-- ── Bookmarks ─────────────────────────────────────────────────────
-- Separate table so re-syncing a board (DELETE + INSERT for a given
-- source) never wipes a user's bookmark. Keys match the deterministic
-- ingested_job.id, so the bookmark survives even when the underlying
-- posting row is rewritten.
CREATE TABLE ingested_job_bookmark (
  job_id TEXT PRIMARY KEY,
  bookmarked_at INTEGER NOT NULL
);
