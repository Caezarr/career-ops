# Sprint — Live Copilot Phase 2: STT Spine + Question Detection

**Date opened:** 2026-05-04
**Branch:** `feat/copilot-phase-2-stt`
**Estimated duration:** 5-7 focused days
**Goal:** The two-channel audio stream from Phase 1 flows into Deepgram Nova-3 Multilingual via WebSocket. Per-channel transcripts arrive with <500ms latency, code-switch correctly between FR ↔ EN mid-sentence, and a question-end detector triggers a "ready for bullets" event that Phase 4 will hook.

---

## 1. Out of scope

- ❌ LLM bullet generation (Phase 4)
- ❌ AssemblyAI failover (Phase 6 — that's the SHIPPABLE GATE)
- ❌ Local Whisper.cpp degraded mode (Phase 6)
- ❌ Question-classification (e.g. "behavioral vs technical") — that's prompt-engineering territory in Phase 4

---

## 2. Architecture

```
┌─ Audio frames (Phase 1) ──────────────────────────┐
│  Channel { Mic | System }, 16kHz mono int16        │
└────────────────┬──────────────────────────────────┘
                 │
                 │ One WebSocket per channel — Deepgram
                 │ multiplexes the streams into a unified
                 │ session via different connection IDs.
                 ▼
┌─ src-tauri/src/stt/ ───────────────────────────────┐
│  ├ deepgram.rs   — WebSocket client + Nova-3 setup │
│  ├ session.rs    — per-channel session lifecycle    │
│  ├ detector.rs   — question-end detection (turn end)│
│  └ events.rs     — { Transcript, QuestionEnd }      │
└────────────────┬──────────────────────────────────┘
                 │ Tauri events
                 ▼
┌─ React Copilot page ───────────────────────────────┐
│  Live transcript area: mic in cyan, system in gray  │
│  Status badge: "🟢 Listening · Recruiter speaking" │
│  Question-end → emits "ready for bullets" event     │
└────────────────────────────────────────────────────┘
```

---

## 3. Deepgram setup

- Model: `nova-3-multilingual` (Deepgram's FR↔EN code-switch capable)
- Endpoint: `wss://api.deepgram.com/v1/listen`
- Params: `?model=nova-3&language=multi&smart_format=true&interim_results=true&endpointing=200&utterance_end_ms=1500`
- Auth: `Authorization: Token <key>` — key from Keychain
- Encoding: `linear16` (matches Phase 1's frame format)
- Sample rate: 16000

**One WebSocket per channel** so each channel is independently endpointed (mic and system speak at different cadences).

---

## 4. Question-end detection

The user pauses after asking a question — we don't want to fire bullets prematurely. Detection logic:

- **Signal A:** Deepgram's native `utterance_end` event (configured via `utterance_end_ms=1500`)
- **Signal B:** Last token ends with `?` or matches a known interrogative pattern (`/^(why|how|what|when|where|who|tell me|describe|explain|walk me through)/i`)
- **Signal C:** Channel = System (recruiter) — we don't fire bullets when the user finishes a sentence (that would be terrible UX)

Question-end fires when **Signal A AND (B OR C)** are true.

---

## 5. Day-by-day breakdown

### Day 1 — Deepgram WebSocket scaffold

- [ ] `stt/deepgram.rs` — WebSocket client using `tokio_tungstenite`
- [ ] Auth from Keychain via the existing `keyring` crate path
- [ ] Send a synthetic 5-second `linear16` test buffer, verify response on `Final` event

**Done = `cargo run --bin stt-smoke` connects, sends a hello-world audio chunk, prints "hello world" transcribed.**

### Day 2 — Per-channel session

- [ ] `stt/session.rs` — opens 2 Deepgram WebSockets (one per channel)
- [ ] Pulls audio frames from Phase 1's channel queue, routes to the matching socket
- [ ] Emits `Transcript { channel, text, is_final, ts }` events to the frontend via `tauri::Manager::emit`

**Done = Phase 1's audio capture → Deepgram → frontend receives `Transcript` events tagged with channel.**

### Day 3 — FR / EN code-switching verification

- [ ] Test with mixed-language audio (record a sample switching FR→EN→FR mid-sentence)
- [ ] Verify Deepgram's multilingual mode handles it without dropping words
- [ ] If quality drops below 90% accuracy, fall back to language-specific models with auto-detection

**Done = "Tu peux me parler de ton expérience? Like, tell me about your last project" transcribes correctly across the language boundary.**

### Day 4 — Question-end detector

- [ ] `stt/detector.rs` — implements Signals A/B/C above
- [ ] Wire into `session.rs` — emits `QuestionEnd { channel: System, transcript_window: String }` event
- [ ] Frontend status badge changes when detector fires

**Done = recruiter says "Tell me about a time you failed?" + 1.5s pause → status badge turns "🟢 Ready" + transcript window text is captured for Phase 4.**

### Day 5 — Live UI integration

- [ ] Copilot page: live two-column transcript (system left, mic right) with timestamps
- [ ] Auto-scroll to latest line
- [ ] Override hotkeys: ⌘R (regenerate), ⌘N (skip), ⌘Z (override "this is a question")
- [ ] Status badge transitions: idle → listening → recruiter-speaking → ready

**Done = full live transcript with badges + hotkey overrides functional.**

### Day 6 — Override + edge cases

- [ ] Manual "this is a question" hotkey for when the detector misses (recruiter says "And then?" without a `?`)
- [ ] Manual "skip" hotkey to discard the last detected question (false positive)
- [ ] Reconnect on WebSocket drop — bounded retries (max 3) with exponential backoff

**Done = robust to flaky network + recruiter speech patterns the detector misses.**

### Day 7 — Latency budget + polish

- [ ] Profile: from final-frame-arrival to Transcript-event-emit, target <500ms p95
- [ ] Profile: from question-end-detected to QuestionEnd event, target <1.7s p95 (Deepgram endpointing eats most of this)
- [ ] Logging: per-frame round-trip times in dev mode, off in release
- [ ] README → "Live Copilot" section explaining the STT setup

---

## 6. Risks + mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **Deepgram auth fails / out of credits** | 🔴 High | Surface clearly in UI. Gate Live Copilot behind a successful "test connection" call when the user enters their key. |
| **WebSocket drops mid-interview** | 🔴 High | Retry once silently, log the drop, surface a banner if multiple drops. Phase 6 brings AssemblyAI failover. |
| **Code-switch FR↔EN quality regression** | 🟠 High | Test sample from Day 3 catches it on every release. Manual review on Day 3. |
| **Question-end false positives (firing on user speech)** | 🟠 High | Signal C (channel must be System) hard-rules this out. Manual override hotkey for misses. |
| **Buffer drift between channels** | 🟡 Med | Per-frame timestamps from Phase 1. Realign at frame boundaries if drift exceeds 100ms. |

---

## 7. Acceptance criteria

- [ ] Open Copilot page → click Start → live two-column transcript appears within 1s
- [ ] Speak into mic → text appears in the mic column with <500ms p95 latency
- [ ] Play Zoom audio → text appears in the system column independently
- [ ] FR↔EN code-switch test sample transcribes correctly across the boundary
- [ ] Recruiter asks "Why did you leave your last role?" → 1.5s pause → status flips to "🟢 Ready" + QuestionEnd event captured
- [ ] User says "uhhh that's a tough one" → status does NOT flip to ready (Signal C protection)
- [ ] WebSocket drop simulated → app recovers within 5s with at most one banner shown
- [ ] 60-min continuous session → no memory growth, no panic
- [ ] `cargo test` passes (smoke test for Deepgram with mocked WebSocket)

---

## 8. Workflow

- **Branch:** `feat/copilot-phase-2-stt`, off `feat/copilot-phase-1-audio` (Phase 1 must merge first)
- **Commits:** one per task T*, atomic
- **PR:** opened in draft Day 1
- **Tests:** smoke test for Deepgram; manual code-switch test sample on Day 3
- **Review:** Live demo on Day 7 — the user holds a real or recorded mock interview, transcripts appear correctly
