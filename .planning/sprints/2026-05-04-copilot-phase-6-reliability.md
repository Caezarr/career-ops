# Sprint — Live Copilot Phase 6: Reliability / Failover (SHIPPABLE GATE)

**Date opened:** 2026-05-04
**Branch:** `feat/copilot-phase-6-reliability`
**Estimated duration:** 5-7 focused days
**Goal:** This is the SHIPPABLE GATE. Phase 5 is feature-complete — but a Live Copilot you can't trust during an actual interview is worthless. This sprint adds: STT failover (Deepgram → AssemblyAI), LLM failover (Claude → GPT-5), local degraded mode (Whisper.cpp + Ollama), pre-flight checks, watchdog timers, and transcript persistence (MEM-01). After this sprint, the user can rely on the Live Copilot for a real, paid interview.

---

## 1. Out of scope

- ❌ New features
- ❌ Adding more vendors beyond the 4 already specced (Deepgram, AssemblyAI, Anthropic, OpenAI) + local fallbacks
- ❌ Redundancy beyond 1 cross-cloud failover per layer
- ❌ Memory / RAG (Phase 7, deferred to v2)

---

## 2. Architecture

```
┌─ Audio frames (Phase 1) ────────────────────────────┐
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─ STT layer ─────────────────────────────────────────┐
│  Primary: Deepgram Nova-3                             │
│   ├ Healthy (HTTP 200 + WS up): use it                │
│   └ Failing (3 consecutive errors): switch to ───┐    │
│  Failover: AssemblyAI Universal-Streaming        │    │
│   ├ Healthy: use it                              │    │
│   └ Failing: switch to ───┐                      │    │
│  Local degraded: Whisper.cpp pre-warmed in RAM ◄─┴──  │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─ LLM layer ─────────────────────────────────────────┐
│  Primary: Claude Sonnet 4.5+ (cached)                 │
│   ├ Healthy: use it                                   │
│   └ Failing: switch to ───┐                           │
│  Failover: GPT-5 (or 4o)                          │   │
│   ├ Healthy: use it                              │    │
│   └ Failing: switch to ───┐                      │    │
│  Local degraded: Ollama (Qwen 2.5 / Llama 3.3)◄──┘    │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─ Watchdog ──────────────────────────────────────────┐
│  Phase 4's "5s budget" missed → drop the bullet,    │
│  show "regenerate?" hint                              │
└─────────────────────────────────────────────────────┘
```

---

## 3. Components

### 3.1. STT failover

- `src-tauri/src/stt/health.rs` — health checks per vendor (3 consecutive errors = unhealthy)
- `src-tauri/src/stt/router.rs` — pick the healthiest vendor; switch on failure mid-session
- `src-tauri/src/stt/assemblyai.rs` — Universal-Streaming WebSocket implementation, mirrors Deepgram's interface
- Same `TranscriptEvent` event type from both — frontend doesn't know or care which vendor produced it

### 3.2. LLM failover

- `src-tauri/src/llm/health.rs`, `router.rs`
- `src-tauri/src/llm/openai.rs` — GPT-5 (or 4o) Chat Completions API with the SAME prompt contract as Claude
- The persona prompts stay model-agnostic (re-test with both models)

### 3.3. Local degraded mode

- **Whisper.cpp:** bundled via `whisper-rs` crate, model preloaded on app launch (lazy, with a "Preloading speech model..." indicator)
    - Use the small/medium multilingual model (~150MB)
- **Ollama:** detect at runtime — if the user has Ollama running locally with Qwen 2.5 or Llama 3.3, route there
    - Fail gracefully: "Local mode unavailable. Install Ollama with `curl https://ollama.ai/install.sh | sh && ollama pull qwen2.5`"

Local mode is **last resort** — quality drops, latency goes up to ~10s. The overlay shows a "🔴 Local mode" warning so the user knows.

### 3.4. Pre-flight check

- Settings → Copilot → "Run pre-flight check" button
- Tests:
    - Mic permission ✓
    - Screen recording permission ✓
    - Deepgram auth + 5s sample roundtrip
    - AssemblyAI auth + 5s sample roundtrip
    - Anthropic auth + 1-token call
    - OpenAI auth + 1-token call
    - Whisper.cpp model loaded
    - Ollama detected (optional)
- Each test: green check / red X / amber warning

### 3.5. Watchdog

- Phase 4 has a 5s p95 latency target. If a question hits 7s without first-token → fire watchdog event:
    - Cancel the current LLM call
    - Show "Regenerate?" hint in overlay
    - User hits ⌘R or auto-retries based on setting

### 3.6. Transcript persistence (MEM-01)

- After each session, write the full per-channel transcript + bullet history to disk:
    - Path: `~/Library/Application Support/com.caezarr.career-os/transcripts/<session_id>.jsonl`
    - **Transcripts only** — no raw audio. Easy purge (Settings → Privacy → Delete all transcripts).
- Frontend: dashboard shows past sessions, ability to review the bullets shown vs. transcribed questions (debrief surface, expanded in Phase 8)

---

## 4. Micro-sprints (atomic tickets)

### P6-01 · `stt/health.rs` — circuit-breaker per vendor
**Est:** 2h · **Deps:** P2-02 · **PR-able:** ✅
**Goal:** Track per-vendor health (3 consecutive errors → unhealthy for 60s).
**Tasks:**
- `Health` struct with `consecutive_errors`, `last_error_at`, `unhealthy_until`
- Per-vendor `&'static AtomicHealth` shared across the runtime
- `record_success()` / `record_error(reason)` / `is_healthy()`
- Unit tests for the state machine
**Acceptance:** 3 errors → unhealthy. After 60s → eligible again.
**Output:** 1 commit.

### P6-02 · `stt/assemblyai.rs` — Universal-Streaming WebSocket
**Est:** 4h · **Deps:** P6-01 · **PR-able:** ✅
**Goal:** Mirror the Deepgram interface so the router can swap them transparently.
**Tasks:**
- `tokio_tungstenite` client to AssemblyAI's WS endpoint
- Same `TranscriptEvent` output shape as Deepgram's emitter
- Auth from Keychain
- Smoke test against a sample audio
**Acceptance:** Smoke test produces transcribed text; output shape byte-identical to Deepgram's.
**Output:** 1 commit.

### P6-03 · `stt/router.rs` — health-driven dispatch
**Est:** 3h · **Deps:** P6-02 · **PR-able:** ✅
**Goal:** Pick the healthiest STT vendor; mid-session switch on failure.
**Tasks:**
- Priority order: Deepgram → AssemblyAI → Whisper.cpp (Whisper added in P6-06)
- `dispatch(frames)` checks health, opens the right WebSocket
- On failure mid-session: cancel current task, open the next vendor, replay last 1s of buffered audio
**Acceptance:** Manually revoke Deepgram key → router switches to AssemblyAI within 5s.
**Output:** 1 commit.

### P6-04 · `llm/health.rs` + `llm/router.rs`
**Est:** 3h · **Deps:** P4-01 · **PR-able:** ✅
**Goal:** Same circuit-breaker pattern for LLMs.
**Tasks:**
- Reuse the `Health` abstraction from P6-01 (move to a shared `health.rs`?)
- Router picks Anthropic by default; auto-switch on failure
- Prompt cache resets on switch (different vendor, no cache)
**Acceptance:** Tests for switch latency.
**Output:** 1 commit.

### P6-05 · `llm/openai.rs` — GPT-5/4o with same prompt contract
**Est:** 4h · **Deps:** P6-04 + P4-03 · **PR-able:** ✅
**Goal:** Drop-in replacement for Claude with identical bullet output schema.
**Tasks:**
- Chat Completions API streaming via SSE
- Reuse the persona prompts from P3-06 (vendor-agnostic)
- Same `Bullet` output via the parser from P4-05
- Side-by-side test: Claude vs GPT-5 on 5 questions, manual review
**Acceptance:** Quality parity within reasonable bounds; identical output schema.
**Output:** 1 commit.

### P6-06 · `whisper-rs` integration + lazy model preload
**Est:** 4h · **Deps:** P6-03 · **PR-able:** ✅
**Goal:** Local STT fallback when both clouds are unavailable.
**Tasks:**
- `whisper-rs` Cargo dep + small/medium multilingual model bundled (~150MB)
- Lazy load on first Live Copilot start (with "Preloading speech model..." indicator)
- STT router routes here when Deepgram + AssemblyAI both unhealthy
- Quality acceptance: usable, not perfect; latency ~5x cloud
**Acceptance:** Wifi off → Whisper.cpp transcribes locally with a "🔴 Local mode" badge in UI.
**Output:** 1 commit.

### P6-07 · Ollama detection + LLM router last-resort
**Est:** 3h · **Deps:** P6-05 · **PR-able:** ✅
**Goal:** Local LLM fallback when both cloud LLMs unavailable.
**Tasks:**
- Detect Ollama at `localhost:11434` on app start
- If present + (`qwen2.5` OR `llama3.3`) model available → register as fallback
- LLM router routes here as last resort
- Graceful "install Ollama" message if missing
**Acceptance:** Wifi off + Ollama running → end-to-end Copilot works fully offline.
**Output:** 1 commit.

### P6-08 · Pre-flight check UI matrix
**Est:** 4h · **Deps:** P6-03 + P6-07 · **PR-able:** ✅
**Goal:** Settings → Copilot → "Run pre-flight" with full check matrix.
**Tasks:**
- 8+ checks: mic perm, screen rec perm, accessibility perm, Deepgram auth, AssemblyAI auth, Anthropic auth, OpenAI auth, Whisper model loaded, Ollama detected (optional)
- Visual matrix: green/red/amber + last-run timestamp + "Re-run" button
- Surfaced AT THE START of every Live session — must pass before live mode unlocks
**Acceptance:** All checks listable + actionable.
**Output:** 1 commit.

### P6-09 · 7s LLM watchdog + ⌘R retry
**Est:** 2h · **Deps:** P4-08 · **PR-able:** ✅
**Goal:** A runaway LLM call gets cancelled before the user gives up.
**Tasks:**
- Per-call watchdog timer (default 7s, user-configurable)
- On expire: cancel future, show "Regenerate?" hint in overlay
- ⌘R triggers retry (existing hotkey from P2-08)
**Acceptance:** Synthetic 10s call cancelled at 7s; ⌘R works.
**Output:** 1 commit.

### P6-10 · Transcript JSONL writer
**Est:** 2h · **Deps:** P2-03 · **PR-able:** ✅
**Goal:** Per-session transcript on disk; never raw audio.
**Tasks:**
- Path: `~/Library/Application Support/com.caezarr.career-os/transcripts/<session_id>.jsonl`
- One line per Transcript event + one line per Bullet event
- Hard assertion in code (panic in debug, log in release): "transcripts/" path must NEVER receive `Vec<u8>` audio
- Test: write 100 events, verify file shape
**Acceptance:** Test passes; raw-audio assertion can't be bypassed.
**Output:** 1 commit.

### P6-11 · Past-sessions dashboard surface
**Est:** 3h · **Deps:** P6-10 · **PR-able:** ✅
**Goal:** User can review (and purge) past sessions.
**Tasks:**
- Dashboard → "Past sessions" panel — list of sessions sorted by date
- Click → session detail: per-channel transcript + bullets shown vs questions
- Settings → Privacy → "Delete all transcripts" button
- Counter shows total disk usage
**Acceptance:** Past session viewable; purge actually deletes everything.
**Output:** 1 commit.

### P6-12 · ZDR vendor verification + `PRIVACY-VENDORS.md` + README
**Est:** 4h · **Deps:** all above · **PR-able:** ✅
**Goal:** SHIPPABLE GATE — every vendor confirmed zero-data-retention.
**Tasks:**
- Verify Deepgram ZDR (likely opt-in tier — check key)
- Verify AssemblyAI ZDR (account setting)
- Verify Anthropic ZDR (enterprise tier; check if available for individual)
- Verify OpenAI ZDR (account setting)
- Document each in `.planning/research/PRIVACY-VENDORS.md` with screenshots / ToS quotes
- README "Reliability + privacy" section accurate
**Acceptance:** Every vendor has a verdict + evidence. README reflects truth.
**Output:** Sprint closed. Live Copilot v1 mergeable to main + tagged.

---

## 5. Day-by-day breakdown

### Day 1 — STT health + AssemblyAI client

- [ ] `stt/health.rs` — circuit-breaker pattern (3 consecutive errors → unhealthy for 60s)
- [ ] `stt/assemblyai.rs` — Universal-Streaming WebSocket client matching Deepgram's `TranscriptEvent` interface
- [ ] `stt/router.rs` — dispatch + auto-switch on health change

**Done = manually break Deepgram (revoke key) → router switches to AssemblyAI mid-session within 5s.**

### Day 2 — LLM health + OpenAI client

- [ ] `llm/health.rs`, `router.rs`
- [ ] `llm/openai.rs` — GPT-5 or 4o with the SAME prompt builders from Phase 4
- [ ] Side-by-side test: same question → both models → bullets reviewed for parity

**Done = revoke Anthropic key → router switches to OpenAI within 5s.**

### Day 3 — Whisper.cpp local mode

- [ ] `whisper-rs` dependency + model bundling (~150MB, downloaded on first launch)
- [ ] Pre-warm on app start (lazy: only after first Live Copilot session attempt)
- [ ] STT router falls back to Whisper.cpp when both Deepgram + AssemblyAI are unhealthy

**Done = wifi off → Live Copilot still works (slow, lower quality) via local Whisper.**

### Day 4 — Ollama local mode

- [ ] Detect Ollama at `localhost:11434` on app start
- [ ] If present + Qwen 2.5 / Llama 3.3 model loaded → route LLM there as last resort
- [ ] Graceful "install Ollama" message if missing

**Done = wifi off + Ollama running → end-to-end Live Copilot works fully offline.**

### Day 5 — Pre-flight check UI

- [ ] Settings → Copilot → "Run pre-flight check" button
- [ ] All 8+ checks listed above
- [ ] Visual matrix with green/red/amber + last-run timestamp
- [ ] Surfaced AT THE START of every Live Copilot session — user must pass before live mode unlocks

**Done = open Copilot page → click pre-flight → see full health matrix, every check actionable.**

### Day 6 — Watchdog + transcript persistence

- [ ] Watchdog timer per LLM call, 7s default. Cancellable via ⌘R.
- [ ] Session transcript writer — JSONL per session
- [ ] Dashboard: "Past sessions" list with click-through to review

**Done = a runaway 10s LLM call gets cancelled at 7s, user can ⌘R for retry. Past sessions visible in dashboard.**

### Day 7 — Polish + ZDR contract verification

- [ ] Confirm with each vendor that we're on a zero-data-retention contract:
    - Deepgram ZDR: opt-in via API key tier
    - AssemblyAI ZDR: opt-in via account setting
    - Anthropic ZDR: enterprise-tier setting (check if needed for individual)
    - OpenAI ZDR: opt-in via account setting
- [ ] Document the verification in `.planning/research/PRIVACY-VENDORS.md`
- [ ] README → "Reliability + privacy" section explaining failover + ZDR

**Done = all 4 vendors confirmed ZDR + documented. README updated. Career OS is now safely usable for a real interview.**

---

## 5. Risks + mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **Failover switch latency >5s** | 🔴 Critical | Health checks run in background, switch is instant on next request. Pre-warmed AssemblyAI WebSocket optional. |
| **Local mode quality unusable** | 🟠 High | Test with real interview audio. Set expectations: "🔴 Local mode" badge clearly visible. |
| **Watchdog cancels too aggressively** | 🟠 High | 7s threshold tuned via session telemetry; user-configurable in Settings. |
| **Transcript leaks raw audio** | 🔴 Critical | Code-level assertion: never write `Vec<u8>` audio buffers to the transcript path. Add a test. |
| **ZDR confirmation drifts** | 🟡 Med | Annual re-verification calendar entry. PRIVACY-VENDORS.md is canonical. |
| **Whisper model download fails** | 🟡 Med | Bundle a tiny model in the app bundle as last-resort. ~80MB, lower quality but always available. |

---

## 6. Acceptance criteria — THE SHIPPABLE GATE

The Live Copilot is mergeable to main + tagged v1.0 only when ALL of these pass:

- [ ] Deepgram revoked → AssemblyAI takes over within 5s, no audio gaps
- [ ] Anthropic revoked → OpenAI takes over within 5s, bullets within latency budget
- [ ] Wifi off → Whisper.cpp + Ollama keep the Copilot running (with degraded badges)
- [ ] Pre-flight check button shows all green for a properly-configured user
- [ ] 60-min continuous interview → no panic, no leak, no audio gap >2s
- [ ] Watchdog cancels a synthetic 10s LLM call at 7s
- [ ] Transcript JSONL exists at the documented path; raw audio is NOT on disk
- [ ] All 4 vendors confirmed ZDR + linked in PRIVACY-VENDORS.md
- [ ] README "Reliability + privacy" section accurate
- [ ] Live demo: the user holds a real (or recorded) mock interview end-to-end with one mid-session vendor failure injected — overlay never goes blank for >5s

---

## 7. Workflow

- **Branch:** `feat/copilot-phase-6-reliability`, off `feat/copilot-phase-5-overlay`
- **Commits:** atomic per day
- **PR:** draft from Day 1, marked SHIPPABLE GATE in title
- **Tests:** failover smoke tests for both layers; watchdog test; transcript-no-audio test
- **Review:** Live demo on Day 7, mid-session failure injection. The user does not merge until the gate passes.
