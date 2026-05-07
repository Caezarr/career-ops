# Career OS — Rust Backend Architecture Audit (2026-05-05)

**Scope:** read-only audit of `src-tauri/`. 1258 lines in `lib.rs`,
62 Tauri commands, 9 module files.

## Severity legend
- **CRITICAL** ship-blocker · **HIGH** breaks at scale · **MEDIUM** real
  debt · **LOW** polish.

## Highest-leverage actions (one sprint)

1. **Single-egress `cloud::Client`** (#8.1) — closes PRIV-01 gap, 9 sites
2. **Split commands into `src/commands/<domain>.rs`** (#2.1) — mechanical
3. **Unify error types into `AppError`** (#3.1) — UX win on frontend
4. **Drop `.unwrap()` on Mutex locks in audio paths** (#3.2) — reliability
5. **Add tests for `ingest/normalize` + per-provider fixtures** (#9.1)

## 1. Module layering

### 1.1 — DB SQL inline in command handler — HIGH
`lib.rs:486-552` `db_dashboard_stats` runs 5 raw `sqlx::query` calls in
`lib.rs`. Every other DB access goes through `db::*`. Move to
`db/dashboard.rs`.

### 1.2 — Pipeline orchestration in `lib.rs` — HIGH
`lib.rs:804-900` `run_pipeline` is 100 lines of dual-capture →
transcription → routing logic. Move to `src/pipeline.rs`.

### 1.3 — `strip_markdown_fences` in `lib.rs` — LOW
`lib.rs:790-802`. Pure helper, move to `latex.rs`.

### 1.5 — `audio_dir` in `db/mod.rs` — LOW
`db/mod.rs:51-56`, `#[allow(dead_code)]`. Delete or move to `paths.rs`.

## 2. `lib.rs` size — 1258 lines, 62 `#[tauri::command]`s

### 2.1 — Single-file command surface is a maintenance bomb — HIGH
Split into `src/commands/{copilot,db_user,db_cv,db_job,db_application,
db_timeline,db_interview,db_prep,db_integration,db_dashboard,ai,
ingest,jobteaser}.rs`. `lib.rs` drops to ~150 lines.

### 2.2 — `analyze_cv_ats` mixes DB I/O + AI — MEDIUM
`lib.rs:579-627`. Extract to `ai::ats::analyze`.

### 2.3 — `generate_optimized_cv` 70 lines orchestration — MEDIUM
`lib.rs:714-780`. Extract to `ai::cv_optimize`.

## 3. Error handling

### 3.1 — Three error styles coexist — MEDIUM
`db::DbError`, `IngestError` (`ingest/traits.rs:80-104`), AI typed
errors (`ai/types.rs:59-84`), plus ~30 `Result<T, String>` returns in
`lib.rs`. Frontend can't discriminate kinds.
**Fix:** top-level `AppError` enum with `#[from]` impls, serialized
as `{ kind, message }`.

### 3.2 — `.unwrap()` on Mutex lock in audio paths — HIGH
`audio.rs:179, 198, 221, 259`; `session.rs:142, 209, 226, 315, 333,
356`. CPAL audio runs on its own thread; one panic poisons the lock
and aborts the entire pipeline. Switch to `parking_lot::Mutex` (no
poisoning) or pattern-match on `lock()`.

### 3.3 — `.expect("DB init failed")` at startup — MEDIUM
`lib.rs:1160`. Crashes before showing a window if migrations fail.
Add a Tauri dialog fallback.

### 3.4 — `unwrap_or_default()` swallows transcript corruption — LOW
`db/interview.rs:62, 87`. Silently replaces corrupt transcript with
`[]`. At least `tracing::warn!`.

### 3.5 — `tauri::async_runtime::block_on` at setup — MEDIUM
`lib.rs:1157-1160`. Extends startup latency, deadlock risk.

## 4. Async correctness

### 4.1 — Mixing `std::sync::Mutex` and `tokio::sync::Mutex` — MEDIUM
`std` for buffers (`audio.rs:7`, `session.rs:11`), `tokio` for state
(`lib.rs:17`). Pattern is fragile if a future refactor holds across
await. Add clippy lint `await_holding_lock = "deny"` or migrate to
`parking_lot`.

### 4.2 — `tokio::time::sleep` not `interval` in audio reader — LOW
`session.rs:139`. Drift accumulates. Use `interval` with
`MissedTickBehavior::Skip`.

### 4.4 — Fire-and-forget `tokio::spawn` without supervision — MEDIUM
`lib.rs:107, 194`; `session.rs:135, 165, 187, 213`. If a spawned task
panics before emitting `"status", "ready"`, UI hangs in `"thinking"`
forever. Wrap in `AssertUnwindSafe(...).catch_unwind()`.

### 4.6 — Busy-wait stop polling — LOW
`audio.rs:248-254`. 50ms `std::thread::sleep` polling on `AtomicBool`.
OK at 6s; long sessions need `Condvar`.

### 4.5 — `pdf::extract_text_from_base64` — VERIFIED OK
Correctly uses `spawn_blocking`.

## 5. DB schema & query patterns

### 5.1 — `application` missing index on `(stage, updated_at)` — MEDIUM
`migrations/0001_initial.sql:71`. List query at `db/application.rs:78`
filters stage + orders by updated_at; current index is stage-only.
**Fix:** new migration `0003_indexes.sql` with composite index.

### 5.3 — `job.source_url` not indexed — MEDIUM
`migrations/0001_initial.sql:36-54`. Frontend dedup will scan.
Add unique partial index.

### 5.4 — `cv.pdf_blob` unbounded BLOB — MEDIUM
`migrations/0001_initial.sql:24`. Long-term: store on disk under
`app_data_dir/cvs/<id>.pdf`.

### 5.5 — `interview_session.transcript` as JSON-in-TEXT — MEDIUM
`migrations/0001_initial.sql:117-118`; `db/interview.rs:48-100`. Each
`append_transcript` does SELECT + parse + push + serialize + UPDATE —
O(n²) total. At 1000 turns each append rewrites a ~500KB row.
**Fix:** split into `transcript_entry` + `interview_response` child
tables.

### 5.6 — `application.stage` lacks SQL `CHECK` — LOW
Validates in Rust only. Add `CHECK (stage IN (...))` for defense.

### 5.7 — Foreign keys consistent — VERIFIED OK
All FKs use `CASCADE` or `SET NULL` appropriately; pool sets
`.foreign_keys(true)`.

### 5.8 — `ingested_job_bookmark` lacks FK to `ingested_job` — MEDIUM
`migrations/0002_job_ingestion.sql:46-49`. Comment explains the design
(re-syncs would wipe bookmarks via cascade) but accepts orphan rows.
Add startup GC: `DELETE FROM ingested_job_bookmark WHERE job_id NOT
IN (SELECT id FROM ingested_job)`.

### 5.9 — `save_ingested_jobs` does N inserts per transaction — LOW
`db/ingest.rs:108-174`. For 5000-job syncs, batch into multi-row
`VALUES (?,?),(?,?)` chunks.

## 6. Sqlx usage — KEEP runtime queries

100% uses runtime form (`query_as::<_, T>(...)`), no macros. Tauri-
shipped binaries can't run macro-time validation in CI anyway.
**Drop the unused `macros` feature** at `Cargo.toml:33` to prevent
the build error from creeping back.

## 7. Tauri command surface — 62 commands

### 7.1 — Mixed naming conventions — MEDIUM
3 styles: `db_*`/`ingest_*` prefix, verb-first (`start_capture`,
`analyze_cv_ats`, `parse_cv_pdf`), and hybrid. Standardize on
`<domain>_<verb>`. E.g. `analyze_cv_ats` → `ai_analyze_cv_ats`.

### 7.2 — Redundant pairs — LOW
`stop_capture` (`lib.rs:118`) and `stop_session` (`lib.rs:168`) have
identical bodies. Merge.

## 8. Single-egress `cloud::Client` (PRIV-01) — HIGH

### 8.1 — Nine independent `reqwest::Client::builder()` constructions

1. `lib.rs:70-73` — `list_anthropic_models` (10s)
2. `llm.rs:111-113` — streaming Claude (30s)
3. `stt.rs:11-14` — OpenAI Whisper (30s)
4. `ai/anthropic.rs:48-50` — `ask_structured` (60s)
5. `ai/anthropic.rs:126-128` — `ask_completion` (60s)
6. `ingest/greenhouse.rs:80-87` — 15s, custom UA
7. `ingest/lever.rs:78-85` — 15s, custom UA
8. `ingest/ashby.rs:101-108` — 15s, custom UA
9. `ingest/ycombinator.rs:92-99` — 20s, browser UA

`ingest/mod.rs:18` doc-comment acknowledges the debt.

**Refactor plan (1 sprint, ~4-6h):**

**Step A** — `src/cloud.rs`:
```rust
use once_cell::sync::Lazy;
use reqwest::Client;
use std::time::Duration;

pub struct CloudClient {
    pub fast: Client,    // 15s — provider APIs
    pub default: Client, // 30s — streaming LLM, STT
    pub slow: Client,    // 60s — non-streaming LLM
}

impl CloudClient {
    fn build() -> Self {
        let make = |secs| Client::builder()
            .timeout(Duration::from_secs(secs))
            .user_agent("career-ops/0.0.1")
            .build().expect("static client");
        Self { fast: make(15), default: make(30), slow: make(60) }
    }
}

pub static CLOUD: Lazy<CloudClient> = Lazy::new(CloudClient::build);
```

**Step B** — Migrate consumers, lowest blast radius first:
1. ingest/* → CLOUD.fast
2. stt.rs → CLOUD.default
3. llm.rs → CLOUD.default (preserve byte stream)
4. ai/anthropic.rs → CLOUD.slow
5. lib.rs → CLOUD.fast

**Step C** — `tracing::instrument` so every outbound emits
`cloud_request{ host, path, status, latency_ms }`.

**Step D** — CI guardrail:
```sh
! git grep -n 'reqwest::Client::builder()' \
  -- 'src-tauri/src/' ':!src-tauri/src/cloud.rs' \
  || (echo "PRIV-01 violation"; exit 1)
```

## 9. Test coverage

### 9.1 — `db/tests.rs` covers happy paths only — MEDIUM
14 tests. Map:
- ✅ user, cv, job, application+cascade, interview, prep, integration
- ❌ timeline, db/ingest, ingest/*, ai/*, session, audio

**Priority:**
1. `ingest/normalize.rs` unit tests (pure functions)
2. Per-provider fixture tests (3 each: happy / 404 / malformed)
3. `db/ingest.rs` mirror tests

### 9.3 — No on-disk migration test — LOW
All `:memory:`. No coverage for upgrade path.

## 10. Dependency hygiene

### 10.2 — `tokio = { features = ["full"] }` over-pulls — MEDIUM
Codebase uses `rt-multi-thread`, `sync`, `time`, `macros`, `process`,
`fs`, `io-util`. Not used: `signal`, `net`. Tighten:
```toml
tokio = { version = "1", features = ["rt-multi-thread", "macros",
  "sync", "time", "process", "fs", "io-util"] }
```
Saves ~30s cold compile + ~200KB binary.

### 10.4 — `pdf-extract = "0.7"` — LOW
0.9 is current with panic fixes for malformed PDFs.

### 10.6 — `tokio-tungstenite` uses `native-tls` — MEDIUM
Rest of stack uses rustls. Two TLS implementations.
**Fix:** `features = ["rustls-tls-native-roots"]`.

### 10.7 — No `cargo audit` in CI — LOW
Add to CI workflow.

## 11. `[profile.release]` — VERIFIED OK with polish

Settings (`panic="abort"`, `codegen-units=1`, `lto=true`,
`opt-level="s"`, `strip=true`) are correct for a Tauri DMG.

**Polish:** explicit `lto = "fat"`, `strip = "symbols"`,
`debug = false`, `incremental = false`. Try `opt-level = "z"` and
benchmark.

Add `[profile.dev-fast]` with `inherits = "dev"` and `opt-level = 1`
for 5x faster local runs.

## 12. Logging & PII exposure

### 12.1-12.2 — Audio device names logged — LOW
`lib.rs:817-822`, `audio.rs:152, 161, 244, 250, 263`. "Gabriel's
MacBook Microphone" leaks first names. Hash or strip.

### 12.3-12.6 — VERIFIED OK
- `career_center_slug` only (school identifier, not PII)
- `user_full_name` NEVER logged anywhere
- CV / transcript content NEVER logged
- Cookie content NEVER logged
- API keys NEVER logged

### 12.7 — Upstream API error bodies logged in full — LOW
`llm.rs:127`, `stt.rs:36-38`, `ai/anthropic.rs:64-66`. Some providers
echo input fragments in errors. Truncate to 200 chars.

### 12.8 — `tracing-subscriber` defaults `info,career_ops_lib=debug`
in release — MEDIUM
`lib.rs:1133-1138`. `debug` enabled in production. Gate behind
`cfg!(debug_assertions)` or default release to `info`.

## Summary table

See finding numbers above. ~36 actionable items, weighted by priority.
