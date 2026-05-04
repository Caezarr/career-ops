//! Curated list of job sources shipped by default.
//!
//! Each entry is `(provider, identifier)` — for Greenhouse / Lever /
//! Ashby that's the board/company/org slug, for YC that's a role
//! slug ("" = all roles, the recommended default).
//!
//! All slugs were live-verified at write time (2026-05-04). When a
//! company moves boards, our per-source error handling logs and
//! skips — the rest of the sync still completes.
//!
//! The user will eventually be able to add / remove sources via
//! Settings → Job Sources. Until that ships this list is the whole
//! "Sync all jobs" universe.

use super::traits::IngestProvider as P;

pub const BUILTIN_SOURCES: &[(P, &str)] = &[
    // ── Greenhouse — top firms + AI labs + fintech ──
    (P::Greenhouse, "anthropic"),
    (P::Greenhouse, "stripe"),
    (P::Greenhouse, "airbnb"),
    (P::Greenhouse, "figma"),
    (P::Greenhouse, "vercel"),
    (P::Greenhouse, "discord"),
    (P::Greenhouse, "mercury"),
    (P::Greenhouse, "robinhood"),
    (P::Greenhouse, "brex"),
    (P::Greenhouse, "coinbase"),
    (P::Greenhouse, "pinterest"),
    (P::Greenhouse, "reddit"),
    (P::Greenhouse, "twilio"),
    (P::Greenhouse, "databricks"),
    (P::Greenhouse, "gitlab"),
    // ── Lever ──
    (P::Lever, "mistral"),
    (P::Lever, "palantir"),
    // ── Ashby — newer YC-style startups ──
    (P::Ashby, "Linear"),
    (P::Ashby, "Replit"),
    (P::Ashby, "Cursor"),
    (P::Ashby, "Notion"),
    (P::Ashby, "Cohere"),
    (P::Ashby, "Ramp"),
    (P::Ashby, "Posthog"),
    (P::Ashby, "Browserbase"),
    (P::Ashby, "Resend"),
    (P::Ashby, "Granola"),
    (P::Ashby, "Substack"),
    (P::Ashby, "Watershed"),
    (P::Ashby, "Mintlify"),
    (P::Ashby, "Sardine"),
    // ── YC / Work at a Startup — empty = all 10 role categories ──
    (P::YCombinator, ""),
];
