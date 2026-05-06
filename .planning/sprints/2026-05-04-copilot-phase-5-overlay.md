# Sprint — Live Copilot Phase 5: Live UX + Stealth Overlay + Pitch Perso

**Date opened:** 2026-05-04
**Branch:** `feat/copilot-phase-5-overlay`
**Estimated duration:** 4-5 focused days
**Goal:** A frameless, always-on-top, screen-share-aware overlay window where the user sees streaming bullets during a live interview. Plus the COACH-02 "pitch perso" generator — a one-shot self-presentation builder for "tell me about yourself" type questions.

---

## 1. Out of scope

- ❌ Reliability / failover (Phase 6 is the SHIPPABLE GATE)
- ❌ Audio / STT / LLM (other phases)
- ❌ Recording / replay of the session

---

## 2. Architecture

```
┌─ Two-window layout ──────────────────────────────────┐
│                                                       │
│  Main dashboard window (existing)                    │
│    └ Settings / CV / Jobs / Applications / Prep       │
│                                                       │
│  Overlay window (new)                                 │
│    ┌─────────────────────────────────────────┐       │
│    │ 🟢 Listening · Recruiter speaking · FR   │       │
│    ├─────────────────────────────────────────┤       │
│    │ Q: Parle-moi d'un échec marquant.       │       │
│    │                                          │       │
│    │ → Projet X — 40% miss [CV.exp.3]         │       │
│    │ → Cause: scope mal cadré                 │       │
│    │ → Apprentissage projet Y [CV.exp.4]      │       │
│    │                                          │       │
│    │ ⏱ 2.8s · Sonnet 4.5 · cached             │       │
│    └─────────────────────────────────────────┘       │
│                                                       │
└──────────────────────────────────────────────────────┘
```

Already exists in stub form: `src-tauri/tauri.conf.json` declares the `copilot` window with `decorations: false`, `alwaysOnTop: true`, `transparent: true`, `contentProtected: true`. This sprint makes it functional + stealthy.

---

## 3. Stealth model (the hard problem)

The README promises "invisible to screen-share". macOS 15 (Sequoia) **broke** the canonical `NSWindow.sharingType = .none` flag for ScreenCaptureKit captures — Apple closed the loophole in OS-level captures. So we use a layered approach:

### 3.1. Primary defence: screen-share detection + auto-mask

- Detect when ANY app is doing a screen capture (Zoom / Meet / Teams / OBS / Discord etc.)
    - macOS 13: heuristic — listen for `kCGSessionNotificationListChanged` + `CGDisplayStreamCreateWithDispatchQueue` signals
    - macOS 14+: `SCStream` event subscription
- When detected → automatically minimise the overlay OR move it to a non-shared display

### 3.2. Secondary defence: user-toggle "ghost mode"

- Hotkey ⌘⇧G — explicit user-confirmation that disables the overlay's content rendering (text → blanks, but window stays in place so layout muscle memory survives)
- Visual indicator on the dashboard that "ghost mode is on"

### 3.3. Tertiary defence: second-display routing

- If user has a second display attached → "Pin overlay to second display" toggle
- The shared display has nothing on it, the user's eyes flick to display 2 for the bullets

### 3.4. Fallback: the user knows it's not perfect

- Modal on first launch: "Career OS uses every available macOS API to keep this overlay invisible to screen-share. On macOS 15+, no app can guarantee 100% invisibility — read [docs] for details."

---

## 4. Micro-sprints (atomic tickets)

### P5-01 · Wire `copilot` window to `CopilotApp.tsx` with mock bullets
**Est:** 3h · **Deps:** — · **PR-able:** ✅
**Goal:** The transparent always-on-top window renders the overlay shell with mock data.
**Tasks:**
- Verify `tauri.conf.json::copilot` window config (already exists)
- Wire `src/main.tsx` to route `#copilot` URL fragment to `<CopilotApp />`
- Render 3 bullet slots, status badge, latency footer with hardcoded mock content
- Position default top-right of primary display, 460x560
**Acceptance:** `pnpm tauri dev` → both windows open; copilot window shows mock bullets.
**Output:** 1 commit.

### P5-02 · Drag handle + position memory per display
**Est:** 2h · **Deps:** P5-01 · **PR-able:** ✅
**Goal:** User can move the overlay; position survives reload.
**Tasks:**
- 8px draggable strip at the top of the overlay (Tauri `data-tauri-drag-region`)
- On move, persist `(displayId, x, y)` to SQLite via new `overlay_position` table
- On launch, restore position for the current display (fallback to top-right if display absent)
**Acceptance:** Drag overlay → quit → relaunch → restored to drag position.
**Output:** 1 commit.

### P5-03 · Subscribe to bullet stream events from Phase 4
**Est:** 2h · **Deps:** P4-07 + P5-01 · **PR-able:** ✅
**Goal:** Overlay receives live bullets from the Phase 4 pipeline.
**Tasks:**
- Subscribe to `bullet_start` / `bullet_token` / `bullet_end` / `bullet_replaced` events
- Replace mock with real streaming render
- Handle ordering: bullets 1/2/3 fill correct slots based on event index
**Acceptance:** Trigger Phase 4 manually → real bullets stream into the overlay.
**Output:** 1 commit.

### P5-04 · Status badge transitions
**Est:** 2h · **Deps:** P5-03 · **PR-able:** ✅
**Goal:** Visible state machine: idle → listening → recruiter-speaking → ready → generating → done.
**Tasks:**
- Subscribe to `audio_state` events (from Phase 1) + `Transcript` events (Phase 2) + bullet events (Phase 4)
- 6 states with colour + icon + label
- Animations: 150ms cross-fade between states
**Acceptance:** During a real session, badge cycles through expected states without getting stuck.
**Output:** 1 commit.

### P5-05 · Swift sidecar `SCStream` lifecycle subscription
**Est:** 3h · **Deps:** P1-04 · **PR-able:** ✅
**Goal:** Detect when ANY screen-share starts on the system.
**Tasks:**
- Extend `SystemAudioCapture.swift` to also subscribe to `SCStream` start/stop notifications system-wide
- Emit `screen_share_started` / `screen_share_stopped` to Rust via stdout protocol
- Test against Zoom, Meet, Teams, OBS, Discord
**Acceptance:** Start screen-share in any app → Rust receives the event within 500ms.
**Output:** 1 commit.

### P5-06 · Auto-mask / minimise on screen-share
**Est:** 3h · **Deps:** P5-05 + P5-04 · **PR-able:** ✅
**Goal:** When screen-share detected, overlay becomes invisible to the share.
**Tasks:**
- Settings → Copilot → "On screen-share: [Hide / Mask / Move to second display]" preference
- Hide = `WebviewWindow::hide()`; Mask = render text as solid rectangles; Move = relocate
- Restore on `screen_share_stopped`
- Persistent toast on dashboard during screen-share so user knows overlay is hidden
**Acceptance:** Start Zoom share → overlay disappears in <1s; end share → overlay returns.
**Output:** 1 commit.

### P5-07 · ⌘⇧G ghost-mode toggle + opacity setting
**Est:** 3h · **Deps:** P5-04 · **PR-able:** ✅
**Goal:** Manual user-driven invisibility.
**Tasks:**
- Global hotkey ⌘⇧G via `tauri-plugin-global-shortcut` toggles "ghost mode"
- Ghost = text replaced with blanks; window stays in position
- Settings → opacity slider (0.7-1.0); persists
- Visual indicator on the dashboard window when ghost mode is on
**Acceptance:** ⌘⇧G works from any app; opacity slider applies live.
**Output:** 1 commit.

### P5-08 · Pin-to-second-display + per-display memory
**Est:** 3h · **Deps:** P5-02 · **PR-able:** ✅
**Goal:** Power user routes overlay to a non-shared display.
**Tasks:**
- Detect attached displays via `tauri::Window::current_monitor()`
- "Pin to display" picker in Settings → Copilot
- Position memory keyed per display config: a (1display, 1920x1080) layout vs (2display, ...) layout remembers separately
- Single-display Macs: option hidden, no broken state
**Acceptance:** Pin to display 2 → overlay always opens on display 2 even after restart.
**Output:** 1 commit.

### P5-09 · COACH-02 pitch-perso generator + dashboard surface
**Est:** 7h · **Deps:** P4-06 · **PR-able:** ✅
**Goal:** Pre-interview pitch generator + ⌘P shortcut.
**Tasks:**
- `llm::pitch::generate(snapshot, target_role, tone)` — calls Claude with a pitch-specific prompt
- Output: 60-90s deliverable text + bullet skeleton + "pause here" delivery cues
- Dashboard surface: review screen + practice mode (read aloud, time it)
- Reuse Phase 4's validator on the pitch output (no hallucinated CV facts)
- ⌘P opens pitch in the overlay during a live session
**Acceptance:** "Generate pitch for AE role at Anthropic" → coherent pitch with clear cues; validator catches synthetic refs.
**Output:** Sprint closed.

---

## 5. Day-by-day breakdown

### Day 1 — Overlay window scaffolding

- [ ] Wire the `copilot` window declared in `tauri.conf.json` to render `src/copilot/CopilotApp.tsx`
- [ ] Show 3 bullet slots, status badge, latency footer (mocked data initially)
- [ ] Window position: top-right corner of primary display, 460x560
- [ ] Drag handle at the top — the user can move it anywhere

**Done = `pnpm tauri dev` opens both windows; the overlay shows mock bullets and is draggable.**

### Day 2 — Wire to Phase 4 LLM events

- [ ] Subscribe to `bullet_start`, `bullet_token`, `bullet_end` events from Phase 4
- [ ] Token-by-token streaming render in the 3 slots
- [ ] Status badge transitions (idle → listening → recruiter-speaking → ready → generating → done)

**Done = full Phase 1→2→3→4 chain renders into the overlay live.**

### Day 3 — Stealth: screen-share detection

- [ ] Swift sidecar listens for `SCStream` lifecycle events
- [ ] On screen-share-detected → emits `screen_share_started` event to Rust
- [ ] Overlay reacts: auto-minimise OR auto-mask depending on user's preference
- [ ] On `screen_share_stopped` → restore overlay

**Done = start a Zoom screen-share → overlay disappears or masks within 1s. End share → overlay returns.**

### Day 4 — Ghost mode + second display + readability

- [ ] ⌘⇧G hotkey toggles ghost mode
- [ ] "Pin to second display" toggle in Settings → Copilot
- [ ] Readability: large font, high contrast, dark background by default. Light mode for users on bright environments. Configurable opacity (0.7-1.0).
- [ ] DND auto-enable: when overlay opens, ⌘ Focus DND on (no notification interruptions during the interview)

**Done = ghost mode works, second-display routing works, font + contrast tweakable.**

### Day 5 — COACH-02 Pitch Perso

- [ ] Pre-interview: user generates a "tell me about yourself" pitch
- [ ] Inputs: target role, persona, language, tone (humble / confident / story-driven)
- [ ] Output: 60-90 second pitch text + bullet skeleton + delivery cues ("pause here")
- [ ] Shown in the dashboard before the live session — user can review + practice
- [ ] During live session: ⌘P opens the pitch in the overlay

**Done = "Generate pitch for HEC AE role at Anthropic" produces a coherent, deliverable pitch.**

---

## 5. Risks + mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **macOS 15+ stealth not actually invisible** | 🔴 Critical | Multi-layered defences (detection + ghost + second display). First-launch modal sets expectations honestly. |
| **Screen-share detection false positives** | 🟠 High | Test on Zoom, Meet, Teams, OBS. Whitelist known-safe captures (e.g., the user's own `screencapture` cmd). |
| **Overlay covers important UI in Zoom** | 🟡 Med | Drag handle + remembered position per display config. |
| **Pitch generation hallucinates CV facts** | 🟡 Med | Reuse Phase 4's validator on the pitch output. |

---

## 6. Acceptance criteria

- [ ] `pnpm tauri dev` opens dashboard + overlay; overlay shows 3 mock bullets
- [ ] Draggable; remembers position per display
- [ ] Wired to Phase 4: full live demo question → bullets stream into overlay within 5s
- [ ] Zoom screen-share started → overlay auto-disappears within 1s
- [ ] ⌘⇧G toggles ghost mode visibly
- [ ] "Pin to second display" toggle works (skipped on single-display Macs but not broken)
- [ ] Auto-DND when overlay opens, restored when it closes
- [ ] First-launch stealth modal informs the user honestly about macOS 15+ limits
- [ ] COACH-02 pitch generates a 60-90 second deliverable pitch for a given role

---

## 7. Workflow

- **Branch:** `feat/copilot-phase-5-overlay`, off `feat/copilot-phase-4-llm`
- **Commits:** atomic per day
- **PR:** draft from Day 1
- **Tests:** manual test plan (Section 6) — stealth needs real screen-share testing
- **Review:** the user runs a real mock interview on Day 5 with a friend on Zoom, validates the overlay never appears in the share
