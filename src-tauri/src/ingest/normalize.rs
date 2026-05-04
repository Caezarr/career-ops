//! Convert provider-agnostic `RawJob` into the frontend-shaped `IngestedJob`.
//!
//! The TypeScript `Job` interface lives in `src/dashboard/store/types.ts`.
//! This struct serialises to camelCase to match it.

use serde::{Deserialize, Serialize};

use super::traits::{IngestProvider, RawJob};

/// Hard cap on the full-description payload sent to the frontend.
/// 12 000 chars covers ~99% of real ATS postings without bloating the
/// store. Anything longer gets a final '…' marker.
const MAX_DESCRIPTION_CHARS: usize = 12_000;

/// Mirrors `src/dashboard/store/types.ts::Job` (with `source` populated).
///
/// Fields the frontend computes itself (`avatarColor`, `avatarLabel`,
/// `match`, `bookmarked`) are filled with sensible defaults here — the
/// frontend will replace `avatarColor` / `avatarLabel` via its
/// `companyBrand()` helper when rendering, and `match` will be computed
/// when the user has a CV loaded.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IngestedJob {
    pub id: String,
    pub role: String,
    pub company: String,
    pub location: String,
    pub salary_min: i64,
    pub salary_max: i64,
    pub salary_currency: String,
    /// `match_score` Rust-side, renamed to `match` for the frontend
    /// (which can't avoid the JS reserved-word but uses it as a key).
    #[serde(rename = "match")]
    pub match_score: i64,
    pub posted_ago: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub verified: Option<bool>,
    pub bookmarked: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub jd_text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub work_mode: Option<String>,
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    pub employment_type: Option<String>,
    pub avatar_color: String,
    pub avatar_label: String,
    pub source: JobSource,
    /// YC batch identifier (e.g., "S25", "W26") — only set for YC
    /// postings. Used by the frontend to derive `companyStage`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub company_batch: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JobSource {
    pub provider: IngestProvider,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub identifier: Option<String>,
    pub source_id: String,
    pub source_url: String,
    pub fetched_at: i64,
}

// --- conversion ---

/// Convert a `RawJob` into the frontend-shaped `IngestedJob`.
pub fn to_ingested(raw: RawJob, provider: IngestProvider, identifier: &str) -> IngestedJob {
    let avatar = company_brand(&raw.company);
    let now_ms = chrono::Utc::now().timestamp_millis();

    // Local id is namespaced — frontend dedup also keys on (provider, identifier, sourceId).
    let local_id = format!(
        "ext:{}:{}:{}",
        provider.as_str(),
        if identifier.is_empty() { "_" } else { identifier },
        raw.source_id
    );

    let posted_ago = raw
        .posted_at
        .as_deref()
        .map(format_posted_ago)
        .unwrap_or_else(|| "Recently".to_string());

    IngestedJob {
        id: local_id,
        role: raw.role,
        company: raw.company,
        location: raw.location.unwrap_or_else(|| "Remote".to_string()),
        salary_min: raw.salary_min.unwrap_or(0),
        salary_max: raw.salary_max.unwrap_or(0),
        salary_currency: raw.salary_currency.unwrap_or_else(|| "$".to_string()),
        match_score: 0,
        posted_ago,
        verified: None,
        bookmarked: false,
        jd_text: raw.description.map(truncate_description),
        work_mode: raw.work_mode,
        employment_type: raw.employment_type,
        avatar_color: avatar.0,
        avatar_label: avatar.1,
        source: JobSource {
            provider,
            identifier: if identifier.is_empty() {
                None
            } else {
                Some(identifier.to_string())
            },
            source_id: raw.source_id,
            source_url: raw.source_url,
            fetched_at: now_ms,
        },
        company_batch: raw.company_batch,
    }
}

/// Compute a deterministic avatar (bg color + 2-letter label) from the company name.
/// Frontend has its own `companyBrand()` — this is just a sane Rust-side default.
fn company_brand(name: &str) -> (String, String) {
    let palette = [
        "#5B6FE3", "#FF6B6B", "#4ECDC4", "#FFD93D", "#A07FFF", "#FF9F40", "#42B883", "#EF5DA8",
    ];
    let mut hash: u32 = 0;
    for c in name.chars() {
        hash = hash.wrapping_mul(31).wrapping_add(c as u32);
    }
    let bg = palette[(hash as usize) % palette.len()].to_string();

    let label: String = name
        .split_whitespace()
        .filter_map(|w| w.chars().next())
        .take(2)
        .collect::<String>()
        .to_uppercase();
    let label = if label.is_empty() {
        "?".to_string()
    } else {
        label
    };

    (bg, label)
}

fn truncate_description(s: String) -> String {
    // Strip basic HTML tags so the frontend gets readable plain text.
    let plain = strip_html(&s);
    if plain.chars().count() <= MAX_DESCRIPTION_CHARS {
        plain
    } else {
        let mut out: String = plain.chars().take(MAX_DESCRIPTION_CHARS).collect();
        out.push('…');
        out
    }
}

/// Quick-and-dirty HTML stripper that preserves paragraph structure.
/// The frontend splits the resulting string on `\n\n` to populate the
/// `about[]` array shown in the job detail.
///
/// Order matters: Greenhouse double-encodes `content` (HTML entities AROUND
/// real HTML tags), so we decode entities first, then strip tags. We
/// decode `&amp;` last to avoid turning `&amp;lt;` into a real `<`.
fn strip_html(s: &str) -> String {
    let decoded = s
        .replace("&nbsp;", " ")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&amp;", "&");

    // Replace closing block tags + <br> with paragraph breaks BEFORE
    // stripping, so we keep readable structure for `about[]`.
    let with_breaks = decoded
        .replace("</p>", "\n\n")
        .replace("</li>", "\n")
        .replace("<li>", "• ")
        .replace("</h1>", "\n\n")
        .replace("</h2>", "\n\n")
        .replace("</h3>", "\n\n")
        .replace("</div>", "\n")
        .replace("<br>", "\n")
        .replace("<br/>", "\n")
        .replace("<br />", "\n");

    // Strip remaining tags.
    let mut out = String::with_capacity(with_breaks.len());
    let mut in_tag = false;
    for c in with_breaks.chars() {
        match c {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => out.push(c),
            _ => {}
        }
    }

    // Collapse runs of inline whitespace, but preserve paragraph
    // breaks. We do this line by line.
    let normalised = out
        .lines()
        .map(|line| line.split_whitespace().collect::<Vec<_>>().join(" "))
        .collect::<Vec<_>>()
        .join("\n");

    // Collapse 3+ consecutive newlines to a single double-newline,
    // and trim outer whitespace.
    let mut result = String::with_capacity(normalised.len());
    let mut newline_run = 0usize;
    for c in normalised.chars() {
        if c == '\n' {
            newline_run += 1;
        } else {
            if newline_run >= 2 {
                result.push_str("\n\n");
            } else if newline_run == 1 {
                result.push('\n');
            }
            newline_run = 0;
            result.push(c);
        }
    }
    result.trim().to_string()
}

/// Convert an ISO 8601 timestamp into a human-friendly relative label.
/// Falls back to a date string if parsing fails.
fn format_posted_ago(iso: &str) -> String {
    use chrono::{DateTime, Utc};
    let parsed: Option<DateTime<Utc>> = DateTime::parse_from_rfc3339(iso)
        .ok()
        .map(|d| d.with_timezone(&Utc));
    let Some(dt) = parsed else {
        return iso.to_string();
    };
    let now = Utc::now();
    let delta = now.signed_duration_since(dt);
    let mins = delta.num_minutes();
    let hours = delta.num_hours();
    let days = delta.num_days();
    if mins < 60 {
        format!("{}m ago", mins.max(1))
    } else if hours < 24 {
        format!("{}h ago", hours)
    } else if days < 30 {
        format!("{}d ago", days)
    } else {
        dt.format("%b %d, %Y").to_string()
    }
}
