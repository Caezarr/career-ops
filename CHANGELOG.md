# Changelog

All notable changes to Career OS are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- CI/CD via GitHub Actions: typecheck + Vite build + cargo
  fmt/clippy/check/test on every PR (`.github/workflows/ci.yml`)
- Security workflow: `cargo audit`, `pnpm audit`, gitleaks secret scan,
  PRIV-01 single-egress guardrail (`.github/workflows/security.yml`)
- Dependabot weekly updates grouped by family
  (`.github/dependabot.yml`)
- Reproducible builds: `.nvmrc` (Node 20), `packageManager` pin,
  `src-tauri/rust-toolchain.toml` (Rust 1.82.0)
- Audit findings published in `.planning/audit/2026-05-05/` (security,
  performance, backend, infra)
- LICENSE file (all rights reserved — explicit)

### Security
- Stop persisting `document.cookie` from the JT auth bridge
  ([audit CRITICAL #2](.planning/audit/2026-05-05/security.md)).
  Cookies are HttpOnly so the captured value couldn't replay JT auth
  anyway; persisting analytics IDs / Cloudflare tokens forever was a
  privacy violation. Bridge now sends a sentinel; Rust persists only
  the timestamp.
- Tightened JT capability: dropped `core:default` and `core:webview:default`
  in favour of explicit minimum permissions
  ([audit MEDIUM #4](.planning/audit/2026-05-05/security.md)).

## [0.0.1] — 2026-05-04

Initial development build. Renamed from "interview-copilot" to "Career OS".
Live Job Teaser SSO + scraping shipped (PR #20). 4-provider job
ingestion (Greenhouse / Lever / Ashby / Y Combinator) (PR #18). War
Room redesign (PR #15-16). Prep question bank (PR #14). Dashboard
real-data integration (PR #12).

[Unreleased]: https://github.com/Caezarr/career-ops/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/Caezarr/career-ops/releases/tag/v0.0.1
