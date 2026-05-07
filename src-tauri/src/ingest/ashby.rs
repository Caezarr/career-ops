//! Ashby public job-board API.
//!
//! Endpoint: `https://api.ashbyhq.com/posting-api/job-board/<org>?includeCompensation=true`
//! Auth: none (public).
//!
//! Live shape (sampled 2026-05 against `Notion`):
//! ```json
//! {
//!   "apiVersion": "...",
//!   "jobs": [
//!     {
//!       "id": "...",
//!       "title": "Outbound BDR",
//!       "department": "Sales",
//!       "team": "Sales",
//!       "employmentType": "FullTime",
//!       "location": "New York, New York",
//!       "secondaryLocations": [],
//!       "publishedAt": "2026-04-02T...",
//!       "isListed": true,
//!       "isRemote": true,
//!       "workplaceType": "Hybrid",
//!       "jobUrl": "https://jobs.ashbyhq.com/Notion/...",
//!       "applyUrl": "https://jobs.ashbyhq.com/Notion/.../application",
//!       "descriptionHtml": "<h1>...</h1>",
//!       "descriptionPlain": "About Us:\n\n...",
//!       "compensation": {...}
//!     }
//!   ]
//! }
//! ```

use serde::Deserialize;

use super::traits::{IngestError, RawJob};

const ENDPOINT: &str = "https://api.ashbyhq.com/posting-api/job-board";
const PROVIDER: &str = "ashby";

#[derive(Debug, Deserialize)]
struct AshbyResponse {
    #[serde(default)]
    jobs: Vec<AshbyJob>,
}

#[derive(Debug, Deserialize)]
struct AshbyJob {
    id: String,
    title: String,
    #[serde(rename = "employmentType", default)]
    employment_type: Option<String>,
    #[serde(default)]
    location: Option<String>,
    #[serde(rename = "publishedAt", default)]
    published_at: Option<String>,
    #[serde(rename = "isListed", default)]
    is_listed: bool,
    #[serde(rename = "workplaceType", default)]
    workplace_type: Option<String>,
    #[serde(rename = "jobUrl", default)]
    job_url: Option<String>,
    #[serde(rename = "applyUrl", default)]
    apply_url: Option<String>,
    #[serde(rename = "descriptionPlain", default)]
    description_plain: Option<String>,
    #[serde(default)]
    compensation: Option<AshbyCompensation>,
}

#[derive(Debug, Deserialize)]
struct AshbyCompensation {
    /// Flat array of components — we look for the one with
    /// `compensationType: "Salary"` and pull min/max from there.
    /// The `compensationTiers` array is richer but redundant for
    /// our needs.
    #[serde(rename = "summaryComponents", default)]
    summary_components: Vec<AshbyCompComponent>,
}

#[derive(Debug, Deserialize)]
struct AshbyCompComponent {
    #[serde(rename = "compensationType", default)]
    compensation_type: Option<String>,
    #[serde(rename = "minValue", default)]
    min_value: Option<f64>,
    #[serde(rename = "maxValue", default)]
    max_value: Option<f64>,
    #[serde(rename = "currencyCode", default)]
    currency_code: Option<String>,
}

pub async fn fetch(org: &str) -> Result<Vec<RawJob>, IngestError> {
    let org = org.trim();
    if org.is_empty() {
        return Err(IngestError::BadIdentifier(PROVIDER));
    }

    let url = format!("{}/{}?includeCompensation=true", ENDPOINT, org);

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
                "{} {} for org '{}'",
                resp.status().as_u16(),
                resp.status().canonical_reason().unwrap_or("?"),
                org
            ),
        });
    }

    let parsed: AshbyResponse = resp.json().await.map_err(|e| IngestError::Parse {
        provider: PROVIDER,
        message: e.to_string(),
    })?;

    Ok(parsed
        .jobs
        .into_iter()
        .filter(|j| j.is_listed)
        .map(into_raw)
        .collect())
}

fn into_raw(j: AshbyJob) -> RawJob {
    let (salary_min, salary_max, salary_currency) = extract_salary(j.compensation.as_ref());

    RawJob {
        source_id: j.id,
        source_url: j.apply_url.or(j.job_url).unwrap_or_default(),
        role: j.title,
        // Ashby doesn't include companyName in the response — caller
        // backfills via `fill_company` from the org slug.
        company: String::new(),
        location: j.location,
        description: j.description_plain,
        salary_min,
        salary_max,
        salary_currency,
        work_mode: j.workplace_type,
        // "FullTime" → "Full-time" for nicer display.
        employment_type: j.employment_type.map(humanise_employment),
        posted_at: j.published_at,
        company_batch: None,
        company_logo_url: None,
    }
}

/// Pull (min, max, currency) from the first `Salary` component, if
/// any. Equity / bonus components are skipped. Min/max come back as
/// integer dollar amounts, currency as a 3-letter ISO code or `$`/`€`/`£`.
fn extract_salary(
    comp: Option<&AshbyCompensation>,
) -> (Option<i64>, Option<i64>, Option<String>) {
    let Some(comp) = comp else {
        return (None, None, None);
    };
    let Some(salary) = comp
        .summary_components
        .iter()
        .find(|c| c.compensation_type.as_deref() == Some("Salary"))
    else {
        return (None, None, None);
    };

    let min = salary.min_value.map(|v| v.round() as i64);
    let max = salary.max_value.map(|v| v.round() as i64);

    let currency = salary.currency_code.as_deref().map(|code| match code {
        "USD" => "$".to_string(),
        "EUR" => "€".to_string(),
        "GBP" => "£".to_string(),
        other => other.to_string(),
    });

    (min, max, currency)
}

fn humanise_employment(s: String) -> String {
    match s.as_str() {
        "FullTime" => "Full-time".to_string(),
        "PartTime" => "Part-time".to_string(),
        "Contract" => "Contract".to_string(),
        "Internship" => "Internship".to_string(),
        "Temporary" => "Temporary".to_string(),
        _ => s,
    }
}

pub fn fill_company(jobs: &mut [RawJob], org: &str) {
    for j in jobs {
        if j.company.is_empty() {
            j.company = org.to_string();
        }
    }
}
