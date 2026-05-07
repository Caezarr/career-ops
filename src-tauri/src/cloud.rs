//! Single-egress HTTP client (PRIV-01).
//!
//! CLAUDE.md / `.planning/REQUIREMENTS.md` mandate that every outbound
//! HTTP/WS call from the Rust core go through ONE module. Before this
//! refactor 9 call sites built their own `reqwest::Client::builder()`
//! ad-hoc, with inconsistent timeouts (10/15/20/30/60s) and one fake
//! Chrome user-agent. The privacy boundary was undefendable by `grep`.
//!
//! This module exposes three pre-built clients keyed by SLA tier:
//!
//!   - [`fast`]    15s — short ATS/job-board fetches (Greenhouse / Lever
//!                       / Ashby / YC), Anthropic /models discovery
//!   - [`default`] 30s — streaming LLM responses, STT requests
//!   - [`slow`]    60s — non-streaming LLM completions (ATS analysis,
//!                       CV optimisation)
//!
//! All three share a normalised user-agent string. The CI guardrail in
//! `.github/workflows/security.yml` forbids `reqwest::Client::builder()`
//! anywhere outside this file.
//!
//! Future extensions (intentionally not in scope here):
//!   * `tracing::instrument`-style logging of every outbound (host /
//!     path / status / latency_ms) — wire when adding the audit trail
//!   * Per-host concurrency limits (semaphore) — when we hit rate caps
//!   * Connection-pool sharing between tiers — they currently each
//!     keep their own pool

use once_cell::sync::Lazy;
use reqwest::Client;
use std::time::Duration;

/// Single canonical user-agent. Embeds the crate version so server-side
/// logs can pin client builds (and we get to drop the legacy fake-Chrome
/// UA from `ingest/ycombinator.rs`).
pub const USER_AGENT: &str = concat!(
    "career-ops/",
    env!("CARGO_PKG_VERSION"),
    " (+https://github.com/Caezarr/career-ops)"
);

pub struct CloudClients {
    pub fast: Client,
    pub default: Client,
    pub slow: Client,
}

fn make(secs: u64) -> Client {
    Client::builder()
        .timeout(Duration::from_secs(secs))
        .user_agent(USER_AGENT)
        .build()
        .expect("static reqwest client should always build")
}

static CLIENTS: Lazy<CloudClients> = Lazy::new(|| CloudClients {
    fast: make(15),
    default: make(30),
    slow: make(60),
});

/// 15s timeout. Use for short ATS/job-board reads.
pub fn fast() -> &'static Client {
    &CLIENTS.fast
}

/// 30s timeout. Default for streaming LLM + STT.
pub fn default() -> &'static Client {
    &CLIENTS.default
}

/// 60s timeout. Use for long non-streaming LLM completions.
pub fn slow() -> &'static Client {
    &CLIENTS.slow
}
