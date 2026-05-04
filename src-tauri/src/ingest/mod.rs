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

pub mod greenhouse;
pub mod normalize;
pub mod traits;

pub use normalize::IngestedJob;
pub use traits::{IngestError, IngestProvider};

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
            return Err(IngestError::NotImplemented("lever"));
        }
        IngestProvider::Ashby => {
            return Err(IngestError::NotImplemented("ashby"));
        }
        IngestProvider::YCombinator => {
            return Err(IngestError::NotImplemented("ycombinator"));
        }
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
