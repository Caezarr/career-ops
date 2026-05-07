//! Lever public job-posting API.
//!
//! Endpoint: `https://api.lever.co/v0/postings/<company>?mode=json`
//! Auth: none (public).
//!
//! Response is a flat array (no `{ jobs: [...] }` wrapper).
//!
//! Live shape (sampled 2026-05 against `mistral`):
//! ```json
//! [
//!   {
//!     "id": "...",
//!     "text": "Enterprise Account Executive",
//!     "categories": {
//!       "commitment": "Full-time",
//!       "location": "Paris",
//!       "team": "Business",
//!       "allLocations": ["Paris"]
//!     },
//!     "createdAt": 1773224977965,
//!     "country": "FR",
//!     "workplaceType": "remote",
//!     "descriptionPlain": "...clean plain text...",
//!     "description": "<p>...HTML...</p>",
//!     "additionalPlain": "...",
//!     "hostedUrl": "https://jobs.lever.co/mistral/...",
//!     "applyUrl": "https://jobs.lever.co/mistral/.../apply"
//!   }
//! ]
//! ```

use serde::Deserialize;

use super::traits::{IngestError, RawJob};

const ENDPOINT: &str = "https://api.lever.co/v0/postings";
const PROVIDER: &str = "lever";

#[derive(Debug, Deserialize)]
struct LeverJob {
    id: String,
    text: String,
    #[serde(default)]
    categories: LeverCategories,
    #[serde(rename = "createdAt", default)]
    created_at: Option<i64>,
    #[serde(rename = "workplaceType", default)]
    workplace_type: Option<String>,
    #[serde(rename = "descriptionPlain", default)]
    description_plain: Option<String>,
    #[serde(rename = "additionalPlain", default)]
    additional_plain: Option<String>,
    #[serde(rename = "hostedUrl", default)]
    hosted_url: Option<String>,
    #[serde(rename = "applyUrl", default)]
    apply_url: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
struct LeverCategories {
    #[serde(default)]
    commitment: Option<String>,
    #[serde(default)]
    location: Option<String>,
    #[serde(default, rename = "allLocations")]
    all_locations: Vec<String>,
}

pub async fn fetch(company: &str) -> Result<Vec<RawJob>, IngestError> {
    let company = company.trim();
    if company.is_empty() {
        return Err(IngestError::BadIdentifier(PROVIDER));
    }

    let url = format!("{}/{}?mode=json", ENDPOINT, company);

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
                "{} {} for company '{}'",
                resp.status().as_u16(),
                resp.status().canonical_reason().unwrap_or("?"),
                company
            ),
        });
    }

    // Lever returns a flat array; if the company doesn't exist they
    // return an empty array (rather than 404), so an empty result
    // means "no jobs" — we don't surface that as an error.
    let jobs: Vec<LeverJob> = resp.json().await.map_err(|e| IngestError::Parse {
        provider: PROVIDER,
        message: e.to_string(),
    })?;

    Ok(jobs.into_iter().map(into_raw).collect())
}

fn into_raw(j: LeverJob) -> RawJob {
    let location = j
        .categories
        .location
        .clone()
        .or_else(|| {
            if j.categories.all_locations.is_empty() {
                None
            } else {
                Some(j.categories.all_locations.join(", "))
            }
        });

    // Lever exposes a clean `descriptionPlain` already — we still
    // route it through normalize::strip_html to standardise paragraph
    // breaks, but it's mostly a passthrough.
    let description = match (j.description_plain, j.additional_plain) {
        (Some(d), Some(a)) if !a.is_empty() => Some(format!("{}\n\n{}", d, a)),
        (Some(d), _) => Some(d),
        (None, Some(a)) => Some(a),
        _ => None,
    };

    let posted_at = j.created_at.map(|ms| {
        chrono::DateTime::<chrono::Utc>::from_timestamp_millis(ms)
            .map(|d| d.to_rfc3339())
            .unwrap_or_else(|| ms.to_string())
    });

    RawJob {
        source_id: j.id,
        source_url: j.hosted_url.or(j.apply_url).unwrap_or_default(),
        role: j.text,
        company: capitalize_first(""), // overridden by caller via identifier
        location,
        description,
        salary_min: None,
        salary_max: None,
        salary_currency: None,
        work_mode: j.workplace_type,
        employment_type: j.categories.commitment,
        posted_at,
        company_batch: None,
        company_logo_url: None,
    }
}

fn capitalize_first(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
        None => String::new(),
    }
}

/// Lever doesn't include a `companyName` per posting — we infer it
/// from the slug the user provided. Called by the dispatcher after
/// `fetch` returns.
pub fn fill_company(jobs: &mut [RawJob], slug: &str) {
    let company = capitalize_first(slug);
    for j in jobs {
        if j.company.is_empty() {
            j.company = company.clone();
        }
    }
}
