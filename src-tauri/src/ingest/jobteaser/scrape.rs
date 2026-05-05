//! Scrape JT job feed using the cookies stored in Keychain.
//!
//! **Status:** stub. The actual endpoint URLs + response shape will
//! be locked in JT-07, after we capture a real authenticated session
//! via the WebView (JT-04 → JT-06) and inspect what the JT frontend
//! calls under the hood.
//!
//! For now `fetch()` returns `Unauthorised` if no cookies are in
//! Keychain (= user hasn't completed the auth flow), and an empty
//! `Vec<RawJob>` once cookies exist (= auth roundtrip works, but the
//! actual scraper is the next sprint task).

use crate::ingest::traits::{IngestError, RawJob};

use super::auth::load_cookies_from_keychain;

/// Identifier here = the school's `career_center_slug` captured at auth.
pub async fn fetch(career_center_slug: &str) -> Result<Vec<RawJob>, IngestError> {
    let career_center_slug = career_center_slug.trim();
    if career_center_slug.is_empty() {
        return Err(IngestError::BadIdentifier("jobteaser"));
    }

    let _cookies = load_cookies_from_keychain(career_center_slug)
        .ok_or(IngestError::Unauthorised("jobteaser"))?;

    // TODO (JT-07): build a `reqwest::Client` with the cookies,
    // walk JT's paginated job-feed endpoint, map each posting to
    // RawJob. Endpoint URL + pagination shape locked once we capture
    // a live session via JT-04..JT-06.
    tracing::info!(
        "jobteaser::fetch — auth OK for '{}', scraper not implemented yet (JT-07 pending)",
        career_center_slug
    );

    Ok(Vec::new())
}
