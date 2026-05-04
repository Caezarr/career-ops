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

/// Pair (provider, identifier) — the unit the user / settings UI
/// thinks in. `identifier` may be empty (YC pulls all roles by
/// default; an explicit role slug filters to one category).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceSpec {
    pub provider: IngestProvider,
    pub identifier: String,
}

/// Returns the curated `BUILTIN_SOURCES` list as `SourceSpec`s for
/// the frontend to seed Settings → Job Sources on first launch.
pub fn get_builtin_sources_list() -> Vec<SourceSpec> {
    BUILTIN_SOURCES
        .iter()
        .map(|(provider, identifier)| SourceSpec {
            provider: *provider,
            identifier: identifier.to_string(),
        })
        .collect()
}

/// Pull every requested source in parallel (capped at 8 in flight at
/// once to avoid blasting any single provider). Per-source failures
/// are collected into `errors` — they never abort the run.
///
/// `sources` is an explicit list — the frontend Settings UI owns the
/// configuration (which sources are enabled, which custom slugs were
/// added). Empty list ⇒ falls back to `BUILTIN_SOURCES`.
///
/// `keyword` is a strict tag-style filter applied AFTER fetch — when
/// present, only jobs whose role/company/location/seniority/sector/
/// stage have every token as a word-prefix survive. Empty / None =
/// no filtering.
pub async fn run_all(
    sources: Vec<SourceSpec>,
    keyword: Option<String>,
) -> IngestRunAllResult {
    let started = std::time::Instant::now();

    // Default to the curated list when the frontend passes an empty
    // array — keeps the backend usable from a fresh install before
    // the Zustand seed lands.
    let pairs: Vec<(IngestProvider, String)> = if sources.is_empty() {
        BUILTIN_SOURCES
            .iter()
            .map(|(p, s)| (*p, s.to_string()))
            .collect()
    } else {
        sources
            .into_iter()
            .map(|s| (s.provider, s.identifier))
            .collect()
    };

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

    // Optional keyword filter — strict, tag-style matching:
    //   - haystack is role + company + location (NOT the description,
    //     to avoid false positives like a Customer Success role that
    //     mentions "we use AI" matching "AI Engineer")
    //   - each whitespace-separated token must be the prefix of a
    //     whole word in the haystack (not a substring inside one).
    //     "ai" → matches the word "AI" but NOT "Maintenance".
    //     "engineer" → matches "Engineer" AND "Engineering".
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
                    let hay = format!("{} {} {}", j.role, j.company, j.location);
                    let words: Vec<String> = hay
                        .split(|c: char| !c.is_alphanumeric())
                        .filter(|w| !w.is_empty())
                        .map(|w| w.to_lowercase())
                        .collect();
                    tokens
                        .iter()
                        .all(|t| words.iter().any(|w| w.starts_with(t.as_str())))
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
