# Career OS — 2026-05-05 Audit / Roast — Summary

5 specialist agents ran in parallel on `chore/audit-roast` from
post-PR-#20 main. Findings consolidated below in priority order.

## Top 12 issues (across all 5 audits)

| # | Severity | Source | Title |
|---|---|---|---|
| 1 | CRITICAL | Security | Tauri custom commands exposed to remote `*.jobteaser.com` (3rd-party JS can invoke ANY command incl. `db_delete_*`, key-bearing `start_session`) |
| 2 | CRITICAL | Security | JT bridge persists `document.cookie` forever; never replays it (HttpOnly cookies invisible to JS — captured value is dead weight + privacy violation) |
| 3 | CRITICAL | Security | No `cargo audit` / `pnpm audit` in CI; outdated `tokio-tungstenite 0.21`, mixed TLS stacks |
| 4 | BLOCKING | Reality | Fresh-install dashboard ships fake user / 5 fake notifications / 4 fake CVs / fake applications / prep streak 12 |
| 5 | BLOCKING | Reality | Ingested jobs hardcoded `match: 0` — JobsHeader subtitle "AI-powered matching" is a lie |
| 6 | BLOCKING | Reality | API keys in `localStorage` despite README pillar claiming Keychain |
| 7 | BLOCKING | Reality | MockInterview saves hardcoded 86% scores into prepSession history |
| 8 | BLOCKING | DevOps | No CI/CD at all (no `.github/workflows`) |
| 9 | BLOCKING | DevOps | README claims "signed/notarised .dmg" — false; `pnpm tauri build` produces unsigned dmg |
| 10 | HIGH | Backend / Sec | PRIV-01: 9 ad-hoc `reqwest::Client::builder()` (was undercount "5+" in docstring) |
| 11 | HIGH | Backend | `lib.rs` is 1258 lines / 62 commands in one file |
| 12 | HIGH | Performance | Search hot path: ~105k string ops per keystroke over 5000 jobs |

## What this audit PR ships

### Infra (DevOps audit)

- ✅ `.github/workflows/ci.yml` — typecheck + cargo fmt/clippy/check/test
- ✅ `.github/workflows/security.yml` — `cargo audit` + `pnpm audit` +
   gitleaks + PRIV-01 egress guardrail (warn-only until refactor)
- ✅ `.github/dependabot.yml` — weekly grouped updates
- ✅ `.nvmrc` (Node 20)
- ✅ `package.json`: `packageManager: pnpm@9.15.4`, `engines.node: >=20`,
   new `typecheck` script
- ✅ `src-tauri/rust-toolchain.toml` — pin to stable
- ✅ `LICENSE` — explicit "all rights reserved"
- ✅ `CHANGELOG.md` — initial scaffold (Keep a Changelog)
- ✅ README: corrected the false "signed/notarised .dmg" claim

### Security (immediate fixes)

- ✅ **CRITICAL #2** Bridge no longer ships `document.cookie`. Sentinel
   `'present'` instead. Rust `store_cookies_in_keychain` scrubs the
   field before persisting (only `captured_at` is kept).
- ✅ Tightened `capabilities/jobteaser.json` — dropped
   `core:default` and `core:webview:default`. Only
   `core:window:allow-close` + `core:event:default` remain.

## What this audit PR does NOT ship (intentional, deferred to dedicated sprints)

- ❌ **Single-egress `cloud::Client` (PRIV-01)** — 9 sites, ~4-6h
   refactor, deserves its own sprint with the CI guardrail flipping
   to enforce after migration.
- ❌ **Window-label assertions on Tauri commands** (Sec CRITICAL #1
   mitigation) — needs a runtime helper + touching every command;
   own sprint.
- ❌ **Move API keys from localStorage to Keychain** (Sec HIGH #3 +
   Reality BLOCKING) — frontend + Rust changes, own sprint.
- ❌ **Strip seed mock data from first launch** (Reality BLOCKING) —
   needs onboarding flow + opt-in toggle; own sprint.
- ❌ **Real `match` computation for ingested jobs** (Reality BLOCKING) —
   needs CV-vs-JD heuristic + AI path; own sprint.
- ❌ **MockInterview wiring** (Reality BLOCKING) — needs real audio /
   STT / scoring; replace with "Coming soon" empty state in this PR
   if user wants — currently deferred.
- ❌ **Split `lib.rs` into `commands/<domain>.rs`** (Backend HIGH) —
   mechanical but big diff; own sprint.
- ❌ **Search hot path optimization** (Perf P0) — pre-computed search
   tokens at ingest + 120ms debounce; own sprint.
- ❌ **Code-splitting + manualChunks + React.lazy** (Perf P1) — own sprint.
- ❌ **DB perf**: missing indexes, BLOB cv, JSON-as-text transcript —
   needs migration `0003_indexes.sql` + careful upgrade path.
- ❌ **README sweep**: stale Phase 6 claim (Live Copilot already
   wired), aspirational triple-redundant pipeline, missing CI badge.

## Next sprints (recommended order)

| # | Sprint | Effort | Closes |
|---|---|---|---|
| 1 | Security hardening (Sec CRITICAL #1 window-label + API keys → Keychain + READMe Keychain reconcile) | 1-2 days | 3 BLOCKING + 2 HIGH |
| 2 | PRIV-01 single-egress `cloud::Client` | 4-6h | 1 HIGH + 6 MEDIUM closure |
| 3 | First-launch hygiene (strip mocks + onboarding flow + remove fake numbers in War Room) | 2-3 days | 7 BLOCKING |
| 4 | Real `match` computation + Apply-and-track for external jobs | 2-3 days | 2 BLOCKING |
| 5 | Performance pass: search debounce + Map<id, Job> + code-split | 2 days | 7 P0/P1 |
| 6 | `lib.rs` → `commands/<domain>.rs` split + unify error type | 2 days | Backend HIGH |

## Methodology + caveats

- All 5 agents read-only; no fixes applied by them
- Bundle/timing numbers in Performance audit are static-analysis
  estimates; should be confirmed with profiling
- Security audit could not run `cargo audit` / `pnpm audit` in the
  sandbox; numeric counts (9 reqwest sites, etc.) verified via grep
- Reality check did not perform interactive UAT; suggest `/expect`
  pass against Jobs → Apply → Applications chain on clean profile

## Audit files

- [`security.md`](./security.md) — 3 CRITICAL · 6 HIGH · 6 MEDIUM · 5 LOW
- [`performance.md`](./performance.md) — 7 P0/P1 · 9 P2
- [`backend.md`](./backend.md) — ~36 items across 12 sections
- [`reality.md`](./reality.md) — ~30 items across 14 surfaces
- [`infra.md`](./infra.md) — 11 sections, prioritised
