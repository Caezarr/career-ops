//! Job Teaser — the platform French Grandes Écoles use to host their
//! school-network job feeds (HEC, ESSEC, Sciences Po, ENSAM, …).
//!
//! Architecture (sprint spec: `.planning/sprints/2026-05-04-job-teaser-sso.md`):
//!
//! 1. **`auth.rs`** — opens a Tauri WebViewWindow at JT's central
//!    sign-in page (`https://www.jobteaser.com/fr/users/sign_in`),
//!    captures the post-SSO session cookies, persists them to
//!    macOS Keychain (PRIV-05). User profile + their `career_center`
//!    (= the school) is read at the same time.
//!
//! 2. **`scrape.rs`** — once cookies are in Keychain, makes
//!    authenticated GETs to JT's job-feed endpoints, paginates, maps
//!    each posting into the canonical `RawJob`. 401/403 → returns
//!    `IngestError::Unauthorised` so the frontend can trigger re-auth.
//!
//! Data model: a single Job Teaser ingest source per user-school
//! pair. `IngestSource.identifier` carries the school's career_center
//! identifier (set after auth from the user's profile); the
//! `schoolDisplayName` field carries the human label.
//!
//! The cookies live ONLY in Keychain — never in SQLite, never logged.

pub mod auth;
pub mod scrape;

pub use auth::{handle_auth_complete, AuthCookies, AuthProfile};
pub use scrape::fetch;
