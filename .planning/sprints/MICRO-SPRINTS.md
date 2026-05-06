# Master Micro-Sprint Index — Career OS

**Last updated:** 2026-05-05
**Total micro-sprints:** 88
**Total estimated effort:** ~280 hours (≈ 7 weeks at 40h/wk)

## How to read this

Each micro-sprint is **2-4 hours** of focused work that ships as **one PR**. They're indexed by `EPIC-NN` (e.g., `JT-03` = Job Teaser micro-sprint 03).

- **Status:** 🟡 spec'd · 🟠 in progress · 🟢 shipped · ⚪ blocked
- **Deps:** what must merge before this one. `—` = no deps.
- **PR-able:** ✅ ships as a PR · ❌ pure exploration / docs / no code commit

Pick the next 🟡 with no unmet deps. Ship it. Validate. Move on.

The full epic context for each ID lives in the corresponding sprint doc:
- `JT-*` → `2026-05-04-job-teaser-sso.md`
- `AU-*` → `2026-05-04-audit-roast.md`
- `P1-*` → `2026-05-04-copilot-phase-1-audio.md`
- `P2-*` → `2026-05-04-copilot-phase-2-stt.md`
- `P3-*` → `2026-05-04-copilot-phase-3-context.md`
- `P4-*` → `2026-05-04-copilot-phase-4-llm.md`
- `P5-*` → `2026-05-04-copilot-phase-5-overlay.md`
- `P6-*` → `2026-05-04-copilot-phase-6-reliability.md`

---

## Execution order (top-down)

### Epic 1 — Job Teaser SSO (12 micro-sprints, ~36h)

| ID | Title | Est. | Deps | PR | Status |
|---|---|---|---|---|---|
| JT-01 | Manual exploration: HEC + ESSEC + ESCP endpoint shapes | 4h | — | ❌ | 🟡 |
| JT-02 | Add `IngestProvider::JobTeaser` enum variant + frontend type | 1h | JT-01 | ✅ | 🟡 |
| JT-03 | `IngestSource.subdomain` + `schoolDisplayName` fields | 1h | JT-02 | ✅ | 🟡 |
| JT-04 | Tauri command to open auth WebViewWindow | 3h | JT-03 | ✅ | 🟡 |
| JT-05 | JS bridge: poll `document.cookie` + emit `auth-cookies-found` | 3h | JT-04 | ✅ | 🟡 |
| JT-06 | Rust handler: store cookies in Keychain via `keyring` | 2h | JT-05 | ✅ | 🟡 |
| JT-07 | `scrape.rs::fetch(subdomain)` — paginated authenticated GET | 4h | JT-06 | ✅ | 🟡 |
| JT-08 | Wire `IngestProvider::JobTeaser` branch in `mod.rs::run_source` | 2h | JT-07 | ✅ | 🟡 |
| JT-09 | Settings → "+ Add school" picker (10 schools curated) | 3h | JT-04 | ✅ | 🟡 |
| JT-10 | Settings: per-source re-auth flow (401 → reopen WebView) | 2h | JT-08 + JT-09 | ✅ | 🟡 |
| JT-11 | "School not listed?" custom subdomain input | 1h | JT-09 | ✅ | 🟡 |
| JT-12 | Smoke test (`cargo test --ignored jobteaser_smoke`) + README | 3h | all above | ✅ | 🟡 |

### Epic 2 — Audit / Roast (8 micro-sprints, ~16h)

| ID | Title | Est. | Deps | PR | Status |
|---|---|---|---|---|---|
| AU-01 | Run `gitleaks` + `cargo audit` + `pnpm audit` → log findings | 1h | — | ❌ | 🟡 |
| AU-02 | Inventory all `#[tauri::command]` + grade input validation | 2h | — | ❌ | 🟡 |
| AU-03 | PRIV-01 inventory: every `reqwest::Client::builder` site | 1h | — | ❌ | 🟡 |
| AU-04 | Dead-code sweep: TODO/FIXME/unused store actions/components | 2h | — | ❌ | 🟡 |
| AU-05 | Per-page reality matrix: 7 surfaces × real/mock/broken | 3h | — | ❌ | 🟡 |
| AU-06 | Privacy claims verification (6 README claims) | 2h | AU-03 | ❌ | 🟡 |
| AU-07 | `.planning/` drift annotations | 1h | — | ❌ | 🟡 |
| AU-08 | Write `AUDIT.md` final + §Roast + open follow-up sprints | 4h | all above | ✅ | 🟡 |

### Epic 3 — PRIV-01 single-egress refactor (5 micro-sprints, ~12h)

> Triggered as a follow-up sprint by AU-08 if not done inline.

| ID | Title | Est. | Deps | PR | Status |
|---|---|---|---|---|---|
| PR1-01 | `src-tauri/src/cloud.rs` — shared `Client` + `get_json` / `post_json` | 3h | AU-08 | ✅ | 🟡 |
| PR1-02 | Migrate `llm.rs` + `lib.rs` (2 sites) | 2h | PR1-01 | ✅ | 🟡 |
| PR1-03 | Migrate `stt.rs` + `ai/anthropic.rs` (3 sites) | 2h | PR1-01 | ✅ | 🟡 |
| PR1-04 | Migrate `ingest/*` (4 sites) | 3h | PR1-01 | ✅ | 🟡 |
| PR1-05 | CI grep test (`cargo test cloud_egress_no_leaks`) | 1h | PR1-04 | ✅ | 🟡 |

### Epic 4 — Live Copilot Phase 1: Audio (10 micro-sprints, ~32h)

| ID | Title | Est. | Deps | PR | Status |
|---|---|---|---|---|---|
| P1-01 | Pre-flight permission cards UI (mic / screen / accessibility) | 3h | — | ✅ | 🟡 |
| P1-02 | `cpal` mic capture into Rust frame queue (`Channel::Mic`) | 4h | — | ✅ | 🟡 |
| P1-03 | VU meter rendered from mic channel | 2h | P1-02 | ✅ | 🟡 |
| P1-04 | Swift sidecar scaffold (`SystemAudioCapture.swift`) | 4h | — | ✅ | 🟡 |
| P1-05 | Tauri sidecar bundling + spawn from Rust | 3h | P1-04 | ✅ | 🟡 |
| P1-06 | Sidecar stdout → Rust frame queue (`Channel::System`) | 3h | P1-05 | ✅ | 🟡 |
| P1-07 | VU meter dual-channel (cyan = mic, purple = system) | 1h | P1-03 + P1-06 | ✅ | 🟡 |
| P1-08 | First-launch permission wizard with deep-links | 3h | P1-01 | ✅ | 🟡 |
| P1-09 | 16kHz mono int16 resampler + tests | 4h | P1-06 | ✅ | 🟡 |
| P1-10 | Sidecar crash recovery + backpressure handling + e2e test | 5h | P1-09 | ✅ | 🟡 |

### Epic 5 — Live Copilot Phase 2: STT (9 micro-sprints, ~28h)

| ID | Title | Est. | Deps | PR | Status |
|---|---|---|---|---|---|
| P2-01 | Deepgram WebSocket client (smoke test with synthetic buffer) | 4h | P1-10 | ✅ | 🟡 |
| P2-02 | Per-channel `stt::session` lifecycle (2 sockets, mux to channels) | 4h | P2-01 | ✅ | 🟡 |
| P2-03 | `Transcript { channel, text, is_final, ts }` event emit | 2h | P2-02 | ✅ | 🟡 |
| P2-04 | Live FR↔EN code-switch test sample + verification | 2h | P2-03 | ❌ | 🟡 |
| P2-05 | Question-end detector (Signal A: `utterance_end`) | 2h | P2-02 | ✅ | 🟡 |
| P2-06 | Question-end detector (Signals B + C composition) | 2h | P2-05 | ✅ | 🟡 |
| P2-07 | Live two-column transcript UI + auto-scroll + status badge | 3h | P2-03 | ✅ | 🟡 |
| P2-08 | Override hotkeys (⌘R regen, ⌘N skip, ⌘Z mark-question) | 3h | P2-06 + P2-07 | ✅ | 🟡 |
| P2-09 | WebSocket reconnect + latency profiling + README | 6h | all above | ✅ | 🟡 |

### Epic 6 — Live Copilot Phase 3: Context (7 micro-sprints, ~22h)

| ID | Title | Est. | Deps | PR | Status |
|---|---|---|---|---|---|
| P3-01 | Docling Python sidecar bundling | 4h | — | ✅ | 🟡 |
| P3-02 | CV upload → Docling → structured JSON in `cv` table | 3h | P3-01 | ✅ | 🟡 |
| P3-03 | JD parser: sections + keyword extraction | 3h | — | ✅ | 🟡 |
| P3-04 | `interview_snapshot` table + immutable snapshot creation | 3h | P3-02 + P3-03 | ✅ | 🟡 |
| P3-05 | `assembler.rs::build(snapshot_id)` → `LlmContext` | 3h | P3-04 | ✅ | 🟡 |
| P3-06 | 3 persona prompt templates (Finance / Tech-AI / Consulting) | 3h | — | ✅ | 🟡 |
| P3-07 | Wire start-Live-Copilot button + snapshot test | 3h | P3-05 + P3-06 | ✅ | 🟡 |

### Epic 7 — Live Copilot Phase 4: LLM (8 micro-sprints, ~24h)

| ID | Title | Est. | Deps | PR | Status |
|---|---|---|---|---|---|
| P4-01 | Anthropic streaming Messages API client + cache markers | 4h | — | ✅ | 🟡 |
| P4-02 | Cache hit verification (cache_read_input_tokens > 0) | 1h | P4-01 | ❌ | 🟡 |
| P4-03 | `prompt::build_system_prompt` + `build_user_prompt` | 3h | P3-05 | ✅ | 🟡 |
| P4-04 | Persona prompt template snapshot tests | 2h | P3-06 + P4-03 | ✅ | 🟡 |
| P4-05 | `bullets.rs` — output schema + streaming parser | 3h | P4-03 | ✅ | 🟡 |
| P4-06 | `validator.rs` — citation-ref enforcement + drop bullets | 3h | P4-05 | ✅ | 🟡 |
| P4-07 | Frontend overlay slot streaming render | 3h | P4-05 | ✅ | 🟡 |
| P4-08 | E2E: QuestionEnd → bullets in <5s p95 + latency profiling | 5h | all above + P2-06 | ✅ | 🟡 |

### Epic 8 — Live Copilot Phase 5: Overlay (9 micro-sprints, ~28h)

| ID | Title | Est. | Deps | PR | Status |
|---|---|---|---|---|---|
| P5-01 | Wire `copilot` window to `CopilotApp.tsx` with mock bullets | 3h | — | ✅ | 🟡 |
| P5-02 | Drag handle + position memory per display | 2h | P5-01 | ✅ | 🟡 |
| P5-03 | Subscribe to bullet stream events from Phase 4 | 2h | P4-07 + P5-01 | ✅ | 🟡 |
| P5-04 | Status badge transitions (idle → listening → ready → done) | 2h | P5-03 | ✅ | 🟡 |
| P5-05 | Swift sidecar `SCStream` lifecycle event subscription | 3h | P1-04 | ✅ | 🟡 |
| P5-06 | Auto-mask / minimise on `screen_share_started` event | 3h | P5-05 + P5-04 | ✅ | 🟡 |
| P5-07 | ⌘⇧G ghost-mode toggle + Settings → Copilot opacity | 3h | P5-04 | ✅ | 🟡 |
| P5-08 | Pin-to-second-display option + per-display memory | 3h | P5-02 | ✅ | 🟡 |
| P5-09 | COACH-02 pitch-perso generator + dashboard surface | 7h | P4-06 | ✅ | 🟡 |

### Epic 9 — Live Copilot Phase 6: Reliability (SHIPPABLE GATE) (12 micro-sprints, ~38h)

| ID | Title | Est. | Deps | PR | Status |
|---|---|---|---|---|---|
| P6-01 | `stt/health.rs` — circuit-breaker per vendor (3-fail → 60s ban) | 2h | P2-02 | ✅ | 🟡 |
| P6-02 | `stt/assemblyai.rs` — Universal-Streaming WS, mirrored interface | 4h | P6-01 | ✅ | 🟡 |
| P6-03 | `stt/router.rs` — health-driven dispatch + mid-session switch | 3h | P6-02 | ✅ | 🟡 |
| P6-04 | `llm/health.rs` + `llm/router.rs` (parallel to STT) | 3h | P4-01 | ✅ | 🟡 |
| P6-05 | `llm/openai.rs` — GPT-5/4o with same prompt contract | 4h | P6-04 + P4-03 | ✅ | 🟡 |
| P6-06 | `whisper-rs` integration + lazy model preload | 4h | P6-03 | ✅ | 🟡 |
| P6-07 | Ollama detection + LLM router last-resort fallback | 3h | P6-05 | ✅ | 🟡 |
| P6-08 | Pre-flight check UI matrix (8+ checks, surfaced before Live) | 4h | P6-03 + P6-07 | ✅ | 🟡 |
| P6-09 | 7s LLM watchdog + ⌘R retry hint | 2h | P4-08 | ✅ | 🟡 |
| P6-10 | Transcript JSONL writer (assertion: never raw audio) | 2h | P2-03 | ✅ | 🟡 |
| P6-11 | Past-sessions dashboard surface (review + purge) | 3h | P6-10 | ✅ | 🟡 |
| P6-12 | ZDR vendor verification + `PRIVACY-VENDORS.md` + README | 4h | all above | ✅ | 🟡 |

---

## Sprint Roll-Up

| Epic | # micro | Hours | Status |
|---|---|---|---|
| Job Teaser SSO | 12 | 36h | 🟡 ready to start |
| Audit / Roast | 8 | 16h | 🟡 ready (parallel-friendly with Job Teaser) |
| PRIV-01 refactor | 5 | 12h | 🟡 triggered by AU-08 |
| Phase 1 Audio | 10 | 32h | 🟡 starts after Job Teaser + Audit |
| Phase 2 STT | 9 | 28h | 🟡 needs P1-10 |
| Phase 3 Context | 7 | 22h | 🟡 parallel with P2 |
| Phase 4 LLM | 8 | 24h | 🟡 needs P3-05 |
| Phase 5 Overlay | 9 | 28h | 🟡 needs P4-07 |
| Phase 6 Reliability | 12 | 38h | 🟡 needs all above (SHIPPABLE GATE) |
| **TOTAL** | **88** | **~236h** | — |

(Total assumes serial work + zero rework. Realistic with reviews + bug fixes: 280-320h.)

---

## Spawning rules

When you start a micro-sprint:
1. Branch off `main` (or off the prerequisite branch if it's not merged yet)
2. Branch name: `feat/<epic>-<id>-<slug>` e.g. `feat/jt-04-tauri-webview`
3. One commit per task within the micro-sprint, atomic
4. PR title: `[<ID>] <Title>` (e.g. `[JT-04] Tauri command to open auth WebViewWindow`)
5. PR description copies the micro-sprint's Goal / Tasks / Acceptance / Output verbatim
6. Mark the micro-sprint 🟢 shipped in this file when merged

When a micro-sprint blows up to >6h: split it. Don't merge an over-scoped MS.
