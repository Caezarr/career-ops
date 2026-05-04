# Sprint — Live Copilot Phase 1: Audio Capture + Channel Diarization

**Date opened:** 2026-05-04
**Branch:** `feat/copilot-phase-1-audio`
**Estimated duration:** 5-7 focused days
**Goal:** Career OS captures both the user's microphone AND the recruiter's voice from the system audio (the Zoom / Meet / Teams output) into two separate channels, fed to the STT layer in Phase 2. No ML diarization — channel-of-origin tagging.

---

## Why audio is Phase 1

Without two-channel audio there's no Live Copilot — every later phase (STT, LLM, overlay) depends on it. This phase establishes the foundation:
- The Swift sidecar that bridges to ScreenCaptureKit (the only stable system-audio path on macOS 13+)
- The Rust `audio` module that consumes both channels and forwards them
- The pre-flight UI that proves the user's mic is live before they start an interview

The original `.planning/research/PITFALLS.md` lists the macOS audio landscape as the single biggest project risk — this sprint resolves it.

---

## 1. Out of scope

- ❌ STT (Phase 2)
- ❌ LLM (Phase 4)
- ❌ Overlay UX (Phase 5)
- ❌ Failover (Phase 6)
- ❌ BlackHole / Loopback / virtual audio drivers — explicitly avoided per PITFALLS.md
- ❌ ML diarization — channel-of-origin is the truth source

---

## 2. Architecture

```
┌─ macOS (the user's machine) ────────────────────────┐
│                                                       │
│  Microphone ──────► AVAudioEngine (Rust cpal crate)  │
│                          │                             │
│                          ▼                             │
│                     Mic channel (16kHz mono)           │
│                                                        │
│  System audio ───► Swift sidecar (ScreenCaptureKit)   │
│   (Zoom output)        │                              │
│                        ▼                              │
│                   System channel (16kHz mono)         │
│                                                        │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Rust audio mux (channel-tagged frames)           │ │
│  │  ─ Frame { channel: Mic|System, samples, ts }    │ │
│  │  ─ Lock-free SPSC ring buffer                    │ │
│  └─────────────────────────────────────────────────┘ │
│                          │                             │
│                          ▼                             │
│  ┌─────────────────────────────────────────────────┐ │
│  │ STT consumer (Phase 2 — out of scope here)       │ │
│  └─────────────────────────────────────────────────┘ │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Hard rules:**
- ScreenCaptureKit is the **only** path to system audio on macOS 13+. No BlackHole. No Loopback. No kernel extensions.
- Channels are tagged at capture, never mixed. Diarization-via-mixing is forbidden.
- Audio buffers are 100ms frames at 16kHz mono int16 — Deepgram's preferred shape (Phase 2).

---

## 3. Components

### 3.1. Swift sidecar (ScreenCaptureKit bridge)

New process bundled with the app: `src-tauri/swift/SystemAudioCapture.swift` compiled to a tiny CLI tool.

- Subscribes to `SCContentSharingPicker` to let the user grant per-display capture permission
- Streams audio frames over stdout as length-prefixed binary chunks
- Exits cleanly on SIGTERM
- Built once via Tauri's `bundle` config — shipped inside the .app bundle

**Why a separate process?** ScreenCaptureKit's audio API has Objective-C-only callbacks that don't bridge cleanly to Rust without a Swift host. Spawning a sidecar is the macOS-app standard pattern.

### 3.2. Rust audio module (`src-tauri/src/audio.rs`)

Already exists in stub form. This sprint fills it in:

- `start_capture()` — spawns the Swift sidecar + opens `cpal` mic stream
- Two consumer threads — one per channel — push into a `crossbeam_channel::bounded(N)` queue tagged with `Channel::Mic` or `Channel::System`
- `frames_rx()` — exposes the consumer end to Phase 2's STT module
- `stop_capture()` — gracefully shuts down both threads + sends SIGTERM to the sidecar

### 3.3. Permission flow (3 macOS permissions)

The original `FOUND-02` requirement: surface the 3 macOS permissions BEFORE any feature unlocks.

- **Microphone** — `AVCaptureDevice.requestAccess(for: .audio)` via Swift bridge OR rust `cpal` triggers it implicitly
- **Screen Recording** — required for ScreenCaptureKit. Triggered by the sidecar on first launch.
- **Accessibility** — required for global hotkeys (Phase 5). Surface here as a "future" placeholder.

Pre-flight UI:
- 3 cards on the Copilot page: each a green check / red X / amber "needed for live"
- Click → opens `System Settings → Privacy & Security → <permission>`

### 3.4. VU meter (liveness signal)

A 30-band RMS meter rendered in the dashboard's existing Copilot page. Confirms to the user that:
- Their mic is being captured
- The system audio is being captured (different bar / colour for the system channel)

Updates at 30 fps from the Rust frame stream via Tauri events.

---

## 4. Day-by-day breakdown

### Day 1 — Permissions UI + cpal mic capture

- [ ] Pre-flight permission cards on the Copilot page (3 cards: mic, screen recording, accessibility)
- [ ] `cpal`-based mic capture into the Rust frame queue, tagged `Channel::Mic`
- [ ] VU meter wired to the mic channel

**Done = open Copilot page, see green check on Mic, see VU meter dancing when you speak.**

### Day 2 — Swift sidecar scaffold

- [ ] `src-tauri/swift/SystemAudioCapture.swift` — minimal SC stream → stdout
- [ ] Tauri build config to compile + bundle the sidecar
- [ ] Rust spawns the sidecar via `tauri::api::process::Command` and reads stdout

**Done = `Command::new(<sidecar>).spawn()` runs, sidecar prints frame metadata, Rust receives chunks.**

### Day 3 — System audio → Rust frame queue

- [ ] Wire the sidecar stdout into the Rust frame queue with `Channel::System` tag
- [ ] VU meter shows BOTH channels (mic in cyan, system in purple)

**Done = play a YouTube video on the system, see the system VU meter respond. Speak into the mic, see the mic VU meter respond independently.**

### Day 4 — Permission flow + first-launch experience

- [ ] First-launch wizard if any of the 3 permissions is missing
- [ ] Deep-links to System Settings via Tauri's shell-open
- [ ] Re-check permissions on app focus (in case user granted then came back)

**Done = fresh install on a Mac that has never run Career OS → wizard walks user through all 3 permissions cleanly.**

### Day 5 — Frame format + tests

- [ ] Resample any incoming sample rate → 16kHz mono int16 (Deepgram's expected format for Phase 2)
- [ ] 100ms frame size (1600 samples per frame)
- [ ] `cargo test` for the resampler with a synthetic 48kHz → 16kHz test

**Done = both channels output the canonical Deepgram-ready shape.**

### Day 6 — Reliability + buffer

- [ ] Sidecar crash recovery — if the Swift process exits unexpectedly, log + restart once, then surface to UI
- [ ] Backpressure handling — if the queue fills up, drop oldest frames + log warn (interview must not block on a slow consumer)
- [ ] `tracing` instrumentation on every frame start/stop boundary

**Done = kill the Swift sidecar mid-capture, app recovers within 2s, no panic.**

### Day 7 — Polish + integration test

- [ ] Pre-flight check button on the Copilot page that runs a 5-second capture + reports both VU peaks
- [ ] Auto-stop after configurable session duration (default 60min for an interview)
- [ ] Update README with the permissions section

---

## 5. Risks + mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **macOS 15+ ScreenCaptureKit permission UX changes** | 🔴 High | Test on macOS 13, 14, 15 separately. Document the exact prompt flow in PITFALLS.md. |
| **Sidecar bundling / signing complexity** | 🟠 High | Use Tauri's `tauri::api::process::Command::new_sidecar` which handles signed bundling. Verify on a fresh test Mac. |
| **Audio drift between channels** | 🟠 High | Capture timestamps per frame at the source. Resync at the STT boundary (Phase 2's job). |
| **Sample rate mismatches** | 🟡 Med | The resampler in Day 5 is the contract — every frame is 16kHz mono int16 by the time it leaves `audio.rs`. |
| **User has system audio routed to AirPods (no SC capture)** | 🟡 Med | ScreenCaptureKit captures from the system mixer regardless of output device. Test on AirPods, built-in speakers, USB-C audio. |

---

## 6. Acceptance criteria

- [ ] On a fresh macOS install (mic + screen-recording perms granted via the wizard), open Copilot page → both VU meters dance
- [ ] Speaking into the mic moves the mic VU meter only (system meter idle)
- [ ] Playing a Zoom call recording from the system speaker moves the system VU meter only (mic meter idle)
- [ ] After 1h of continuous capture, no audio glitches or panics
- [ ] Killing the Swift sidecar mid-capture → app recovers within 2s, surfaces a warning toast
- [ ] All 3 macOS permissions detected + surfaced in pre-flight cards
- [ ] Frame format verified: 16kHz mono int16, 100ms = 1600 samples per frame, both channels
- [ ] `cargo test` passes including the resampler test

---

## 7. Workflow

- **Branch:** `feat/copilot-phase-1-audio`, off latest main
- **Commits:** one per task T*, atomic
- **PR:** opened in draft Day 1
- **Tests:** automated for the resampler + frame format; manual test plan (Section 6) for end-to-end
- **Review:** Live demo on Day 7 with the user actually capturing both channels during a Zoom call (or recorded sample)
