//! Persistence for job-ingestion state: configured sources, cached
//! postings, and bookmarks. Phase 6 of the job-ingestion sprint.
//!
//! Schema lives in `migrations/0002_job_ingestion.sql`.
//!
//! Uses runtime queries (not the `query!` / `query_as!` macros) so we
//! don't need a live DATABASE_URL or a checked-in sqlx-prepare cache —
//! matches the pattern in `src-tauri/src/db/job.rs` etc.

use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Row, SqlitePool};

use super::error::DbResult;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct IngestSourceRow {
    pub id: String,
    pub provider: String,
    pub identifier: String,
    pub label: String,
    /// SQLite stores BOOL as INTEGER 0/1. sqlx's FromRow handles bool
    /// conversion via the `Type` impl on the target column directly.
    pub enabled: bool,
    pub added_at: i64,
    pub last_synced_at: Option<i64>,
    pub last_error: Option<String>,
}

/// Frontend-shaped Job row. We don't crack the JSON — frontend reads
/// it as-is and merges into its store.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IngestedJobRow {
    pub id: String,
    /// Full Job object as JSON (matches `src/dashboard/store/types.ts::Job`).
    pub data: serde_json::Value,
}

// ─── Sources ────────────────────────────────────────────────────────

pub async fn load_ingest_sources(pool: &SqlitePool) -> DbResult<Vec<IngestSourceRow>> {
    let rows = sqlx::query_as::<_, IngestSourceRow>(
        "SELECT id, provider, identifier, label, enabled, added_at, \
                last_synced_at, last_error \
         FROM ingest_source \
         ORDER BY provider, identifier",
    )
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

pub async fn upsert_ingest_source(pool: &SqlitePool, src: &IngestSourceRow) -> DbResult<()> {
    sqlx::query(
        "INSERT INTO ingest_source \
            (id, provider, identifier, label, enabled, added_at, last_synced_at, last_error) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?) \
         ON CONFLICT(id) DO UPDATE SET \
            label = excluded.label, \
            enabled = excluded.enabled, \
            last_synced_at = excluded.last_synced_at, \
            last_error = excluded.last_error",
    )
    .bind(&src.id)
    .bind(&src.provider)
    .bind(&src.identifier)
    .bind(&src.label)
    .bind(src.enabled)
    .bind(src.added_at)
    .bind(src.last_synced_at)
    .bind(&src.last_error)
    .execute(pool)
    .await?;
    Ok(())
}

/// Sprint 5 PR-C (audit Performance P1 #6): bulk seed for first
/// install. The previous boot path looped `upsert_ingest_source`
/// 30× over IPC, paying 5-10ms per round trip. One transaction,
/// one IPC = ~150-300ms saved on the cold start of a fresh
/// install. Existing rows (re-runs) are upserted, not duplicated.
pub async fn save_ingest_sources(
    pool: &SqlitePool,
    sources: &[IngestSourceRow],
) -> DbResult<usize> {
    if sources.is_empty() {
        return Ok(0);
    }
    let mut tx = pool.begin().await?;
    for src in sources {
        sqlx::query(
            "INSERT INTO ingest_source \
                (id, provider, identifier, label, enabled, added_at, last_synced_at, last_error) \
             VALUES (?, ?, ?, ?, ?, ?, ?, ?) \
             ON CONFLICT(id) DO UPDATE SET \
                label = excluded.label, \
                enabled = excluded.enabled, \
                last_synced_at = excluded.last_synced_at, \
                last_error = excluded.last_error",
        )
        .bind(&src.id)
        .bind(&src.provider)
        .bind(&src.identifier)
        .bind(&src.label)
        .bind(src.enabled)
        .bind(src.added_at)
        .bind(src.last_synced_at)
        .bind(&src.last_error)
        .execute(&mut *tx)
        .await?;
    }
    tx.commit().await?;
    Ok(sources.len())
}

pub async fn delete_ingest_source(pool: &SqlitePool, id: &str) -> DbResult<()> {
    sqlx::query("DELETE FROM ingest_source WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

// ─── Jobs ───────────────────────────────────────────────────────────

/// Sprint 5 PR-C (audit Performance P1 #5): hard cap at the freshest
/// 1000 rows. The previous unbounded query loaded ALL ingested jobs
/// (5000 × ~12 KB = ~60 MB JSON) on every boot, blocking 400-800 ms.
/// 1000 covers ~99% of single-school JT users + a couple greenhouse
/// boards while keeping cold-start under 150 ms. Older postings stay
/// in SQLite — the next ingest run rotates the freshest 1000 in.
const LOAD_INGESTED_JOBS_LIMIT: i64 = 1000;

pub async fn load_ingested_jobs(pool: &SqlitePool) -> DbResult<Vec<IngestedJobRow>> {
    let rows = sqlx::query(
        "SELECT id, data FROM ingested_job ORDER BY fetched_at DESC LIMIT ?",
    )
    .bind(LOAD_INGESTED_JOBS_LIMIT)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .filter_map(|r| {
            let id: String = r.try_get("id").ok()?;
            let data_str: String = r.try_get("data").ok()?;
            let data = serde_json::from_str::<serde_json::Value>(&data_str).ok()?;
            Some(IngestedJobRow { id, data })
        })
        .collect())
}

/// Bulk upsert. Each entry's `data.source` (provider, identifier,
/// sourceId) determines the dedup key — same key replaces the prior
/// row in place. We do this in a single transaction so a partial
/// failure never leaves the DB half-updated.
pub async fn save_ingested_jobs(
    pool: &SqlitePool,
    jobs: &[IngestedJobRow],
) -> DbResult<usize> {
    if jobs.is_empty() {
        return Ok(0);
    }

    let mut tx = pool.begin().await?;
    let mut written = 0usize;
    let now = chrono::Utc::now().timestamp_millis();

    for job in jobs {
        // Pull the source / role / company out of the JSON blob — these
        // are the only fields we expose as columns for indexing.
        let source = job.data.get("source");
        let provider = source
            .and_then(|s| s.get("provider"))
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let identifier = source
            .and_then(|s| s.get("identifier"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
        let source_id = source
            .and_then(|s| s.get("sourceId"))
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let role = job
            .data
            .get("role")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let company = job
            .data
            .get("company")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        let data_str = serde_json::to_string(&job.data).unwrap_or_default();

        sqlx::query(
            "INSERT INTO ingested_job \
                (id, provider, identifier, source_id, role, company, data, fetched_at) \
             VALUES (?, ?, ?, ?, ?, ?, ?, ?) \
             ON CONFLICT(id) DO UPDATE SET \
                role = excluded.role, \
                company = excluded.company, \
                data = excluded.data, \
                fetched_at = excluded.fetched_at",
        )
        .bind(&job.id)
        .bind(provider)
        .bind(identifier)
        .bind(source_id)
        .bind(role)
        .bind(company)
        .bind(data_str)
        .bind(now)
        .execute(&mut *tx)
        .await?;
        written += 1;
    }

    tx.commit().await?;
    Ok(written)
}

// ─── Bookmarks ──────────────────────────────────────────────────────

pub async fn load_bookmarks(pool: &SqlitePool) -> DbResult<Vec<String>> {
    let rows = sqlx::query("SELECT job_id FROM ingested_job_bookmark ORDER BY bookmarked_at DESC")
        .fetch_all(pool)
        .await?;
    Ok(rows
        .into_iter()
        .filter_map(|r| r.try_get::<String, _>("job_id").ok())
        .collect())
}

pub async fn set_bookmark(pool: &SqlitePool, job_id: &str, bookmarked: bool) -> DbResult<()> {
    if bookmarked {
        let now = chrono::Utc::now().timestamp_millis();
        sqlx::query(
            "INSERT OR REPLACE INTO ingested_job_bookmark (job_id, bookmarked_at) VALUES (?, ?)",
        )
        .bind(job_id)
        .bind(now)
        .execute(pool)
        .await?;
    } else {
        sqlx::query("DELETE FROM ingested_job_bookmark WHERE job_id = ?")
            .bind(job_id)
            .execute(pool)
            .await?;
    }
    Ok(())
}
