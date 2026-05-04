//! Y Combinator's "Work at a Startup" board.
//!
//! Endpoint: `https://www.workatastartup.com/jobs/l/<role>` (HTML).
//! Auth: none.
//!
//! WaaS is an Inertia.js app that embeds the page state inside a
//! `<div id="app" data-page="…">` attribute. After HTML-attribute
//! decoding, that's plain JSON with `props.jobs[]` — each entry has
//! `id`, `title`, `jobType`, `location`, `roleType`, `salary`,
//! `companyName`, `companySlug`, `companyBatch`, `companyOneLiner`,
//! `companyLogoUrl`, `companyLastActiveAt`, `applyUrl`.
//!
//! The initial payload only contains ~30 jobs per role. We fetch all
//! 10 valid role slugs in parallel and dedup by job ID, which yields
//! ~150-250 unique fresh YC postings per sync.
//!
//! `identifier` semantics: empty string ⇒ all roles. Non-empty ⇒ the
//! given role slug only (e.g. "software-engineer", "designer").

use futures_util::future::join_all;
use serde::Deserialize;
use std::collections::HashSet;
use std::time::Duration;

use super::traits::{IngestError, RawJob};

const ENDPOINT: &str = "https://www.workatastartup.com/jobs/l";
const PROVIDER: &str = "ycombinator";

/// All valid role slugs, sourced from the live `roleLinks` array on the
/// landing page (2026-05). Maintained manually — if WaaS adds a role,
/// we'll see one fewer category in the feed until we update this list.
const ROLE_SLUGS: &[&str] = &[
    "software-engineer",
    "designer",
    "recruiting",
    "science",
    "product-manager",
    "operations",
    "sales-manager",
    "marketing",
    "legal",
    "finance",
];

#[derive(Debug, Deserialize)]
struct InertiaPage {
    props: InertiaProps,
}

#[derive(Debug, Deserialize)]
struct InertiaProps {
    #[serde(default)]
    jobs: Vec<WaasJob>,
}

#[derive(Debug, Deserialize)]
struct WaasJob {
    id: u64,
    title: String,
    #[serde(rename = "jobType", default)]
    job_type: Option<String>,
    #[serde(default)]
    location: Option<String>,
    #[serde(default)]
    salary: Option<String>,
    #[serde(rename = "companyName")]
    company_name: String,
    #[serde(rename = "companyBatch", default)]
    company_batch: Option<String>,
    #[serde(rename = "companyOneLiner", default)]
    company_one_liner: Option<String>,
    #[serde(rename = "companyLastActiveAt", default)]
    company_last_active_at: Option<String>,
    #[serde(rename = "applyUrl", default)]
    apply_url: Option<String>,
}

pub async fn fetch(role_filter: &str) -> Result<Vec<RawJob>, IngestError> {
    let role_filter = role_filter.trim();

    let roles: Vec<&str> = if role_filter.is_empty() {
        ROLE_SLUGS.to_vec()
    } else {
        // Validate against the known list — protects us from typos.
        if !ROLE_SLUGS.contains(&role_filter) {
            return Err(IngestError::BadIdentifier(PROVIDER));
        }
        vec![role_filter]
    };

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| IngestError::Http {
            provider: PROVIDER,
            message: e.to_string(),
        })?;

    // Fetch all roles in parallel. Per-role failures don't break the run
    // (we just log and skip).
    let fetches = roles.iter().map(|role| {
        let client = client.clone();
        async move {
            let url = format!("{}/{}", ENDPOINT, role);
            match fetch_role(&client, &url).await {
                Ok(jobs) => jobs,
                Err(e) => {
                    tracing::warn!("YC role {} failed: {}", role, e);
                    Vec::new()
                }
            }
        }
    });

    let per_role: Vec<Vec<RawJob>> = join_all(fetches).await;

    // Dedup across roles (a single job can appear in multiple categories).
    let mut seen: HashSet<String> = HashSet::new();
    let mut all: Vec<RawJob> = Vec::new();
    for batch in per_role {
        for j in batch {
            if seen.insert(j.source_id.clone()) {
                all.push(j);
            }
        }
    }

    Ok(all)
}

async fn fetch_role(client: &reqwest::Client, url: &str) -> Result<Vec<RawJob>, IngestError> {
    let resp = client
        .get(url)
        .header("Accept", "text/html")
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
                "{} {} for {}",
                resp.status().as_u16(),
                resp.status().canonical_reason().unwrap_or("?"),
                url
            ),
        });
    }

    let body = resp.text().await.map_err(|e| IngestError::Http {
        provider: PROVIDER,
        message: e.to_string(),
    })?;

    let page = extract_inertia_page(&body)?;
    Ok(page.props.jobs.into_iter().map(into_raw).collect())
}

/// Extract and decode the `data-page="..."` JSON blob from a WaaS HTML
/// response. The attribute is HTML-attribute-encoded — we unescape
/// the common entities and parse as JSON.
fn extract_inertia_page(html: &str) -> Result<InertiaPage, IngestError> {
    // Look for `data-page="..."`. Attribute values can't contain raw `"`,
    // so a greedy match between two `"` is safe.
    let needle = "data-page=\"";
    let start = html.find(needle).ok_or(IngestError::Parse {
        provider: PROVIDER,
        message: "no data-page attribute in HTML response".into(),
    })?;
    let after = &html[start + needle.len()..];
    let end = after.find('"').ok_or(IngestError::Parse {
        provider: PROVIDER,
        message: "unterminated data-page attribute".into(),
    })?;
    let encoded = &after[..end];

    let decoded = html_attr_decode(encoded);

    serde_json::from_str(&decoded).map_err(|e| IngestError::Parse {
        provider: PROVIDER,
        message: format!("data-page JSON: {}", e),
    })
}

/// Decode the small set of HTML entities that appear inside HTML
/// attribute values. Order matters: `&amp;` must come last so we
/// don't double-decode `&amp;quot;` etc.
fn html_attr_decode(s: &str) -> String {
    s.replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&apos;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&amp;", "&")
}

fn into_raw(j: WaasJob) -> RawJob {
    // The "description" we get is the company's one-liner. It's tiny but
    // better than nothing — full descriptions live behind a YC login on
    // the per-job detail page, which we don't crawl.
    let description = j.company_one_liner.clone();

    let posted_at = j.company_last_active_at.map(human_ago_to_iso);

    let (salary_min, salary_max, salary_currency) = parse_salary(j.salary.as_deref());

    RawJob {
        source_id: j.id.to_string(),
        source_url: j.apply_url.unwrap_or_default(),
        role: j.title,
        company: j.company_name,
        location: j.location,
        description,
        salary_min,
        salary_max,
        salary_currency,
        work_mode: None,
        employment_type: j.job_type,
        // Note: posted_at filled below; company_batch propagates so
        // the frontend can derive companyStage (e.g. "S25" → "Seed").
        posted_at,
        company_batch: j.company_batch,
    }
}

/// Convert "$200K - $250K" → (200000, 250000, "$"). Returns `(None, None, None)`
/// for free-form strings we can't parse cleanly (e.g. "$5K - $8K / monthly").
fn parse_salary(s: Option<&str>) -> (Option<i64>, Option<i64>, Option<String>) {
    let Some(raw) = s else {
        return (None, None, None);
    };
    let currency = raw
        .chars()
        .find(|c| matches!(c, '$' | '€' | '£'))
        .map(|c| c.to_string());

    // Pull the first two numbers (followed optionally by k/K/m/M).
    let mut nums: Vec<i64> = Vec::new();
    let bytes = raw.as_bytes();
    let mut i = 0;
    while i < bytes.len() && nums.len() < 2 {
        if bytes[i].is_ascii_digit() {
            let mut j = i;
            while j < bytes.len() && bytes[j].is_ascii_digit() {
                j += 1;
            }
            let mut n: i64 = raw[i..j].parse().unwrap_or(0);
            // Look at the next non-space byte for a multiplier suffix.
            let mut k = j;
            while k < bytes.len() && bytes[k] == b' ' {
                k += 1;
            }
            if k < bytes.len() {
                match bytes[k] {
                    b'K' | b'k' => n *= 1_000,
                    b'M' | b'm' => n *= 1_000_000,
                    _ => {}
                }
            }
            nums.push(n);
            i = j;
        } else {
            i += 1;
        }
    }

    match nums.as_slice() {
        [] => (None, None, currency),
        [a] => (Some(*a), Some(*a), currency),
        [a, b, ..] => (Some(*a), Some(*b), currency),
    }
}

/// Convert "27 days ago" / "about 3 hours ago" into a rough ISO timestamp.
/// Best-effort — falls back to "now" for unparseable strings.
fn human_ago_to_iso(s: String) -> String {
    use chrono::{Duration as ChronoDuration, Utc};
    let lower = s.to_lowercase();
    let now = Utc::now();
    let n: i64 = lower
        .split_whitespace()
        .find_map(|w| w.parse().ok())
        .unwrap_or(0);

    let dt = if lower.contains("hour") {
        now - ChronoDuration::hours(n.max(1))
    } else if lower.contains("day") {
        now - ChronoDuration::days(n.max(1))
    } else if lower.contains("week") {
        now - ChronoDuration::weeks(n.max(1))
    } else if lower.contains("month") {
        now - ChronoDuration::days(n.max(1) * 30)
    } else {
        now
    };
    dt.to_rfc3339()
}
