//! Greenhouse Job Board API.
//!
//! Endpoint: `https://boards-api.greenhouse.io/v1/boards/<board>/jobs?content=true`
//! Auth: none (public).
//! Rate limits: undocumented but generous; we still cap at one request per
//! sync per board.
//!
//! Live shape (sampled 2026-05 against `anthropic`):
//! ```json
//! {
//!   "jobs": [
//!     {
//!       "id": 5161980008,
//!       "absolute_url": "https://job-boards.greenhouse.io/anthropic/jobs/5161980008",
//!       "title": "Account Executive...",
//!       "company_name": "Anthropic",
//!       "location": { "name": "London, UK" },
//!       "first_published": "2026-03-25T10:53:39-04:00",
//!       "updated_at": "2026-04-01T10:49:08-04:00",
//!       "content": "&lt;div&gt;...HTML-entity-encoded...&lt;/div&gt;",
//!       "metadata": [{ "name": "Location Type", "value": "On-Site" }]
//!     }
//!   ]
//! }
//! ```

use serde::Deserialize;

use super::traits::{IngestError, RawJob};

const ENDPOINT: &str = "https://boards-api.greenhouse.io/v1/boards";
const PROVIDER: &str = "greenhouse";

#[derive(Debug, Deserialize)]
struct GreenhouseResponse {
    jobs: Vec<GreenhouseJob>,
}

#[derive(Debug, Deserialize)]
struct GreenhouseJob {
    id: i64,
    absolute_url: String,
    title: String,
    company_name: Option<String>,
    location: Option<GreenhouseLocation>,
    first_published: Option<String>,
    updated_at: Option<String>,
    /// Only present when the request includes `?content=true`. HTML-entity
    /// encoded ON TOP of HTML tags — `normalize::strip_html` handles it.
    content: Option<String>,
    #[serde(default)]
    metadata: Vec<GreenhouseMeta>,
}

#[derive(Debug, Deserialize)]
struct GreenhouseLocation {
    name: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GreenhouseMeta {
    name: Option<String>,
    /// `value` can be a string or a list — we only use string-shaped values.
    value: Option<serde_json::Value>,
}

/// Fetch all open postings for a Greenhouse board.
///
/// `board` is the slug from `boards.greenhouse.io/<board>` (e.g. `anthropic`,
/// `stripe`, `figma`). Empty / whitespace-only slugs are rejected.
pub async fn fetch(board: &str) -> Result<Vec<RawJob>, IngestError> {
    let board = board.trim();
    if board.is_empty() {
        return Err(IngestError::BadIdentifier(PROVIDER));
    }

    let url = format!("{}/{}/jobs?content=true", ENDPOINT, board);

    // PRIV-01: shared single-egress client (15s tier).
    let resp = crate::cloud::fast()
        .get(&url)
        .send()
        .await
        .map_err(|e| IngestError::Http {
            provider: PROVIDER,
            message: e.to_string(),
        })?;

    if !resp.status().is_success() {
        return Err(IngestError::Http {
            provider: PROVIDER,
            message: format!(
                "{} {} for board '{}'",
                resp.status().as_u16(),
                resp.status().canonical_reason().unwrap_or("?"),
                board
            ),
        });
    }

    let parsed: GreenhouseResponse = resp.json().await.map_err(|e| IngestError::Parse {
        provider: PROVIDER,
        message: e.to_string(),
    })?;

    Ok(parsed.jobs.into_iter().map(into_raw).collect())
}

fn into_raw(j: GreenhouseJob) -> RawJob {
    let work_mode = j
        .metadata
        .iter()
        .find(|m| m.name.as_deref() == Some("Location Type"))
        .and_then(|m| m.value.as_ref())
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let employment_type = j
        .metadata
        .iter()
        .find(|m| {
            matches!(
                m.name.as_deref(),
                Some("Employment Type") | Some("Job Type")
            )
        })
        .and_then(|m| m.value.as_ref())
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    RawJob {
        source_id: j.id.to_string(),
        source_url: j.absolute_url,
        role: j.title,
        company: j.company_name.unwrap_or_else(|| "Unknown".to_string()),
        location: j.location.and_then(|l| l.name),
        description: j.content,
        salary_min: None,
        salary_max: None,
        salary_currency: None,
        work_mode,
        employment_type,
        // Prefer first-published — that's when the listing went live.
        // Fall back to updated_at.
        posted_at: j.first_published.or(j.updated_at),
        company_batch: None,
        company_logo_url: None,
    }
}
