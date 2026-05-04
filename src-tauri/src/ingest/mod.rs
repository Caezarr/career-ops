//! Job ingestion from external boards (Greenhouse, Lever, Ashby, Y Combinator).
//!
//! Each provider lives in its own submodule and implements the `IngestSource`
//! trait defined in `traits.rs`. The Tauri layer (in `lib.rs`) exposes the
//! `ingest_run_source` and `ingest_run_all` commands that the React frontend
//! calls — those commands dispatch on the provider name and route to the
//! right submodule.
//!
//! Frontend contract (must stay in sync with `src/dashboard/store/types.ts`):
//!
//! - The `IngestedJob` struct serialises with camelCase keys, matching the
//!   TypeScript `Job` shape (with `source` populated).
//! - Each provider's `fetch` returns `Vec<RawJob>` — `normalize::to_ingested`
//!   converts those to frontend-shaped `IngestedJob` instances.
//!
//! Privacy posture (PRIV-01): every outbound call SHOULD go through
//! `cloud::Client`. Today the existing modules each build their own
//! `reqwest::Client::builder()` — `ingest/*` matches that pattern until the
//! single-egress refactor lands (tracked separately).

pub mod ashby;
pub mod builtin_sources;
pub mod greenhouse;
pub mod lever;
pub mod normalize;
pub mod traits;
pub mod ycombinator;

pub use normalize::IngestedJob;
pub use traits::{IngestError, IngestProvider};

use builtin_sources::BUILTIN_SOURCES;
use futures_util::stream::{self, StreamExt};
use serde::{Deserialize, Serialize};

/// Result returned to the frontend after an ingestion run.
///
/// `fetched` is the total count of jobs returned by the provider this call —
/// not the count of "new" jobs. The frontend's `setIngestedJobs` slice
/// computes the new count (because dedup is a frontend-state concern at
/// this stage; will move to SQLite in a later task).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IngestRunResult {
    pub provider: IngestProvider,
    pub identifier: Option<String>,
    pub jobs: Vec<IngestedJob>,
    /// Wall-clock millis between request and response, for debugging.
    pub elapsed_ms: u128,
}

/// Run a single provider ingestion. Dispatched from the Tauri command.
pub async fn run_source(
    provider: IngestProvider,
    identifier: &str,
) -> Result<IngestRunResult, IngestError> {
    let started = std::time::Instant::now();

    let raw_jobs = match provider {
        IngestProvider::Greenhouse => greenhouse::fetch(identifier).await?,
        IngestProvider::Lever => {
            // Lever postings don't carry a company name — backfill
            // from the slug the user provided (capitalised).
            let mut jobs = lever::fetch(identifier).await?;
            lever::fill_company(&mut jobs, identifier);
            jobs
        }
        IngestProvider::Ashby => {
            let mut jobs = ashby::fetch(identifier).await?;
            ashby::fill_company(&mut jobs, identifier);
            jobs
        }
        IngestProvider::YCombinator => ycombinator::fetch(identifier).await?,
    };

    let jobs: Vec<IngestedJob> = raw_jobs
        .into_iter()
        .map(|raw| normalize::to_ingested(raw, provider, identifier))
        .collect();

    Ok(IngestRunResult {
        provider,
        identifier: if identifier.is_empty() {
            None
        } else {
            Some(identifier.to_string())
        },
        jobs,
        elapsed_ms: started.elapsed().as_millis(),
    })
}

// ─── Run-all (curated builtin sources) ─────────────────────────────────────

/// Per-source error in a `run_all` batch. Sent back to the frontend so
/// the UI can show "synced 4847 jobs · 2 sources unreachable".
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IngestRunAllError {
    pub provider: IngestProvider,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub identifier: Option<String>,
    pub message: String,
}

/// Aggregate result of running every built-in source. The `jobs` field
/// is the flattened list across providers — frontend dedup handles
/// duplicates if the same posting appears in two sources.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IngestRunAllResult {
    pub jobs: Vec<IngestedJob>,
    /// Number of sources that returned at least one job.
    pub successful_sources: usize,
    /// Number of sources that errored.
    pub failed_sources: usize,
    pub errors: Vec<IngestRunAllError>,
    pub elapsed_ms: u128,
}

/// Pull every built-in source in parallel (capped at 8 in flight at
/// once to avoid blasting any single provider). Per-source failures
/// are collected into `errors` — they never abort the run.
///
/// `keyword` is a free-text filter applied AFTER fetch — when present,
/// only jobs whose role (or description, as fallback) contain every
/// whitespace-separated token (case-insensitive, AND-mode) survive.
/// Empty string / `None` ⇒ no filtering.
pub async fn run_all(keyword: Option<String>) -> IngestRunAllResult {
    let started = std::time::Instant::now();

    // Pre-collect into owned tuples — passing `&'static str` slices
    // into async blocks confuses `tauri::command`'s higher-rank
    // lifetime checks, so we do the trivial allocation once.
    let pairs: Vec<(IngestProvider, String)> = BUILTIN_SOURCES
        .iter()
        .map(|(p, s)| (*p, s.to_string()))
        .collect();

    let stream = stream::iter(pairs.into_iter().map(
        |(provider, slug)| async move {
            let res = run_source(provider, &slug).await;
            (provider, slug, res)
        },
    ))
    .buffer_unordered(8);

    let outcomes: Vec<_> = stream.collect().await;

    let mut all_jobs: Vec<IngestedJob> = Vec::new();
    let mut errors: Vec<IngestRunAllError> = Vec::new();
    let mut successful = 0usize;

    for (provider, slug, res) in outcomes {
        match res {
            Ok(r) => {
                if !r.jobs.is_empty() {
                    successful += 1;
                }
                all_jobs.extend(r.jobs);
            }
            Err(e) => {
                tracing::warn!(
                    "ingest run_all: {}:{} failed: {}",
                    provider.as_str(),
                    slug,
                    e
                );
                errors.push(IngestRunAllError {
                    provider,
                    identifier: if slug.is_empty() { None } else { Some(slug) },
                    message: e.to_string(),
                });
            }
        }
    }

    // Optional keyword filter — multi-token AND, case-insensitive,
    // matched on (role + company + location + description).
    let filtered_jobs = match keyword.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        None => all_jobs,
        Some(kw) => {
            let tokens: Vec<String> = kw
                .split_whitespace()
                .map(|s| s.to_lowercase())
                .collect();
            all_jobs
                .into_iter()
                .filter(|j| {
                    let hay = format!(
                        "{} {} {} {}",
                        j.role,
                        j.company,
                        j.location,
                        j.jd_text.as_deref().unwrap_or("")
                    )
                    .to_lowercase();
                    tokens.iter().all(|t| hay.contains(t.as_str()))
                })
                .collect()
        }
    };

    IngestRunAllResult {
        jobs: filtered_jobs,
        successful_sources: successful,
        failed_sources: errors.len(),
        errors,
        elapsed_ms: started.elapsed().as_millis(),
    }
}
