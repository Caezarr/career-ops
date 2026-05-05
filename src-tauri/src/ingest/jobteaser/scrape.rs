//! Scrape JT job feed.
//!
//! Architecture: the auth WebView is the scraper. JT renders job
//! listings server-side as Next.js pages and stores the session in
//! HttpOnly cookies that Rust can't replay directly. So instead of
//! a `reqwest`-based scraper, the in-page bridge (`auth_bridge.js`)
//! fetches `/fr/job-offers?page=N` from inside the WebView, extracts
//! `__NEXT_DATA__`, and forwards a pre-mapped batch via the
//! `jobteaser_jobs_received` Tauri command.
//!
//! This module exposes:
//!   - `fetch()` — used by the unified ingest pipeline. Today it
//!     returns Unauthorised when no Keychain session exists, and an
//!     empty Vec when a session does exist (the WebView already
//!     pushed jobs out-of-band; the next sync just re-merges the
//!     same DB-cached set).
//!   - `WebviewScrapedJob` — the DTO the bridge sends.
//!   - `convert_webview_batch()` — turns the bridge's batch into
//!     `Vec<RawJob>` for the canonical `normalize::to_ingested`.

use serde::Deserialize;

use crate::ingest::traits::{IngestError, RawJob};

use super::auth::load_cookies_from_keychain;

/// Bridge-shaped DTO for jobs scraped inside the WebView. Field
/// names are camelCase to match the Tauri IPC convention.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebviewScrapedJob {
    #[serde(default)]
    pub source_id: String,
    #[serde(default)]
    pub source_url: String,
    #[serde(default)]
    pub role: String,
    #[serde(default)]
    pub company: String,
    #[serde(default)]
    pub location: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub employment_type: Option<String>,
    #[serde(default)]
    pub posted_at: Option<String>,
}

/// Map a `Vec<WebviewScrapedJob>` (from the bridge) into the
/// canonical `Vec<RawJob>` consumed by `normalize::to_ingested`.
pub fn convert_webview_batch(batch: Vec<WebviewScrapedJob>) -> Vec<RawJob> {
    batch
        .into_iter()
        .filter(|j| !j.source_id.is_empty() && !j.role.is_empty())
        .map(|j| RawJob {
            source_id: j.source_id,
            source_url: j.source_url,
            role: j.role,
            company: if j.company.is_empty() {
                "Unknown".to_string()
            } else {
                j.company
            },
            location: if j.location.is_empty() {
                None
            } else {
                Some(j.location)
            },
            description: if j.description.is_empty() {
                None
            } else {
                Some(j.description)
            },
            salary_min: None,
            salary_max: None,
            salary_currency: None,
            work_mode: None,
            employment_type: j.employment_type,
            posted_at: j.posted_at,
            company_batch: None,
        })
        .collect()
}

/// Identifier here = the school's `career_center_slug` captured at auth.
///
/// Today this is a no-op return: the actual scrape happens inside the
/// auth WebView immediately after capture and forwards jobs via
/// `jobteaser_jobs_received`. When JT-08+ moves the scraper to a
/// hidden WebView triggered by the Sync button, this function will
/// orchestrate that flow — for now it just confirms a session exists.
pub async fn fetch(career_center_slug: &str) -> Result<Vec<RawJob>, IngestError> {
    let career_center_slug = career_center_slug.trim();
    if career_center_slug.is_empty() {
        return Err(IngestError::BadIdentifier("jobteaser"));
    }

    let _cookies = load_cookies_from_keychain(career_center_slug)
        .ok_or(IngestError::Unauthorised("jobteaser"))?;

    tracing::info!(
        "jobteaser::fetch — auth OK for '{}'. Bridge-side scraper handles ingestion at auth time; sync from main is a no-op until JT-08.",
        career_center_slug
    );

    Ok(Vec::new())
}
