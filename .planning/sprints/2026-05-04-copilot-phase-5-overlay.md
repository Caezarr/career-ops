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

## 4. Day-by-day breakdown

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
