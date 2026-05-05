//! Job Teaser auth = open SSO page in WebView, capture cookies after
//! the user completes their school's flow (SAML / Google / Microsoft /
//! whatever the school uses), persist to Keychain.
//!
//! The Tauri command in `src-tauri/src/lib.rs::jobteaser_auth_open`
//! creates the WebViewWindow with an inline JS poller that watches
//! `document.cookie`. Once the session token appears, the poller
//! fetches the user's profile from JT's `/api/users/me` (or whichever
//! endpoint we discover during JT-01 recon) and emits a single Tauri
//! event `jobteaser-auth-complete` with `{ cookies, profile }`.
//!
//! The Rust handler (this file) listens for that event, hands the
//! cookies to Keychain, and creates an `IngestSource` row.

use serde::{Deserialize, Serialize};

use crate::ingest::traits::{IngestError, IngestProvider};

/// Captured after a successful SSO login. We stash the FULL cookie
/// string verbatim so the scraper can replay it via a `cookie_store`-
/// seeded `reqwest::Client`. Specific cookie names vary per school
/// (some schools keep their IdP cookie, others rely on JT's session).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthCookies {
    /// Raw `document.cookie` string captured after auth — newline-
    /// separated `name=value` pairs as JT exposes them.
    pub raw_cookie: String,
    /// Wall-clock when capture happened (epoch ms).
    pub captured_at: i64,
}

/// User's identity post-auth, used to label the IngestSource.
/// Field names match the JT response shape we observe at recon time;
/// any field we can't parse stays `None` and we fall back to the
/// `career_center_slug` / "Job Teaser" defaults.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthProfile {
    /// Display name of the school's career center (e.g. "ENSAM Career").
    /// Used as `schoolDisplayName` on the IngestSource row.
    #[serde(default)]
    pub career_center_name: Option<String>,
    /// Slug or numeric ID we use as the `IngestSource.identifier` —
    /// also used as the Keychain account-name suffix so multi-school
    /// users can store distinct sessions.
    pub career_center_slug: String,
    /// User's display name; logged once, NEVER persisted (privacy).
    #[serde(default)]
    pub user_full_name: Option<String>,
}

/// Keychain key namespace: each school gets its own slot.
pub fn keychain_account(career_center_slug: &str) -> String {
    format!("career-os.jobteaser.{}.session", career_center_slug.trim())
}

/// Persist captured cookies to macOS Keychain. The `keyring` crate
/// transparently uses Keychain on macOS via the apple-native feature
/// (already enabled in Cargo.toml). The cookies are JSON-encoded
/// before storage so we can round-trip the `AuthCookies` struct.
pub fn store_cookies_in_keychain(
    profile: &AuthProfile,
    cookies: &AuthCookies,
) -> Result<(), IngestError> {
    let account = keychain_account(&profile.career_center_slug);
    let payload = serde_json::to_string(cookies).map_err(|e| IngestError::Parse {
        provider: "jobteaser",
        message: format!("serialize cookies: {}", e),
    })?;

    let entry = keyring::Entry::new("career-os", &account).map_err(|e| IngestError::Http {
        provider: "jobteaser",
        message: format!("keychain entry: {}", e),
    })?;
    entry
        .set_password(&payload)
        .map_err(|e| IngestError::Http {
            provider: "jobteaser",
            message: format!("keychain write: {}", e),
        })?;

    tracing::info!(
        "jobteaser: stored session cookies for career_center='{}'",
        profile.career_center_slug
    );
    Ok(())
}

/// Read cookies back from Keychain. Returns `None` when the entry
/// is missing (= user hasn't authed yet OR re-auth needed).
pub fn load_cookies_from_keychain(career_center_slug: &str) -> Option<AuthCookies> {
    let account = keychain_account(career_center_slug);
    let entry = keyring::Entry::new("career-os", &account).ok()?;
    let payload = entry.get_password().ok()?;
    serde_json::from_str(&payload).ok()
}

/// End of the auth roundtrip: invoked from the JS bridge when both
/// cookies AND profile are captured. Called via Tauri command.
pub fn handle_auth_complete(
    profile: AuthProfile,
    cookies: AuthCookies,
) -> Result<AuthProfile, IngestError> {
    if profile.career_center_slug.trim().is_empty() {
        return Err(IngestError::BadIdentifier("jobteaser"));
    }
    if cookies.raw_cookie.trim().is_empty() {
        return Err(IngestError::Unauthorised("jobteaser"));
    }

    store_cookies_in_keychain(&profile, &cookies)?;
    Ok(profile)
}

/// Helper: does a Job Teaser provider already have stored cookies?
/// Used by the frontend to decide whether to show "Re-authenticate"
/// instead of the auth flow.
pub fn has_stored_session(career_center_slug: &str) -> bool {
    load_cookies_from_keychain(career_center_slug).is_some()
}

/// The IngestProvider this module serves — kept for downstream code
/// that needs to disambiguate without importing the enum directly.
#[allow(dead_code)]
pub const PROVIDER: IngestProvider = IngestProvider::JobTeaser;
