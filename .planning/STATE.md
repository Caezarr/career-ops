# State: Interview Copilot

**Last updated:** 2026-04-26 after roadmap creation

---

## Project Reference

**Core Value:** Pendant une vraie interview live, l'app affiche en moins de 5s des bullets de réponse de qualité supérieure à ce que Gabriel produirait seul sous stress — invisibles au recruteur, dans la langue de l'interview (FR/EN), et qui le font progresser.

**v1 Definition of Shippable:** Gabriel peut s'en servir en vrai pour une interview — Phase 0 → 6 complete.
**Current Focus:** Phase 0 — Foundations & Stealth Spike. The macOS 15+ stealth validation gates downstream UX design choices.

**Granularity:** standard
**Mode:** yolo
**Parallelization:** enabled

---

## Current Position

**Milestone:** v1 — "Gabriel uses it in a real interview"
**Phase:** 0 — Foundations & Stealth Spike (not yet planned)
**Plan:** None yet (use `/gsd-plan-phase 0` to begin)
**Status:** Roadmap created, awaiting Phase 0 planning

**Progress (v1 = Phases 0-6):**

```
[ ] Phase 0: Foundations & Stealth Spike
[ ] Phase 1: Audio Capture + Channel Diarization
[ ] Phase 2: STT Spine + Question Detection
[ ] Phase 3: CV/JD Ingestion + Snapshot + Context Assembly
[ ] Phase 4: LLM + Bullet Generation + Domain Personae
[ ] Phase 5: Live UX + Overlay + Pitch Perso
[ ] Phase 6: Reliability / Failover (SHIPPABLE GATE)
```

`█░░░░░░░░░░░░░░░░░░░` 0% complete (0/7 phases)

---

## Performance Metrics

**Phases completed:** 0
**Plans completed:** 0
**Requirements validated:** 0/70 atomic v1 REQ-IDs
**Time elapsed:** 0 days (started 2026-04-26)
**Time horizon:** 4-6 weeks of focused work to v1 shippable

---

## Accumulated Context

### Key Decisions (locked at project init + research synthesis)

| Decision | Rationale | Locked at |
|---|---|---|
| Tauri 2 + Swift sidecar over native SwiftUI / Electron | 10MB bundle, mature ecosystem, Pluely/Natively/OpenCluely all use it; native Swift only as fallback if stealth blocks | Init |
| Deepgram Nova-3 Multilingual primary STT (`language=multi`) | Only mainstream STT with single-stream FR↔EN code-switching; 90%+ accuracy with channel separation | Init |
| Claude Sonnet 4.5 primary LLM | TTFT 600-1100ms, 90% prompt-cache discount on CV+JD context, ZDR contractable | Init |
| Channel-of-origin diarization (mic = Gabriel, system = Recruiter) | More reliable than ML diarization for 2-speaker case; survives Whisper local fallback's lack of diarization | Research synthesis |
| LanceDB embedded vector store | 4MB idle vs Qdrant's 400MB constant; native Rust crate; "SQLite of vector DBs" | Research synthesis |
| Single-egress `cloud::Client` module | Privacy invariant enforceable by code review; required from Phase 0 | Research synthesis |
| Stealth assumed (no disclosure prompt to recruiter, no per-session jurisdiction question) | Gabriel's call; app minimises legal exposure by default (transcripts only, no audio persistence) but doesn't friction Gabriel with prompts | Roadmap freeze |
| Detection-based masking is the PRIMARY stealth strategy on macOS 15+ | Apple confirmed `NSWindow.sharingType = .none` ignored on Sequoia+; Phase 0 spike validates on Gabriel's machine | Research synthesis |
| Live Case Coach (COACH-01) → v2, NOT v1 | High complexity (state machine + hypothesis trees + MECE check + requires DOMAIN-03 RAG); Phase 9 deferred | Roadmap freeze |
| Coaching mode, not mimicry | Gabriel wants progression, not voice-clone of his current style; bullets in best-practice not user-style | Init |
| Snapshot 1 par offer (no global profile) | Each interview is its own world (company / JD / process / recruiter style) | Init |
| Failover STT + LLM + local degraded all required for v1 | "Tier-1 reliability" non-negotiable; Phase 6 is the SHIPPABLE GATE | Init |

### Open Items / Pre-flight Risks

- [ ] **Critical-01 stealth validation** — Phase 0 must record Zoom screen-share with overlay on Gabriel's actual macOS to confirm whether `NSWindow.sharingType = .none` leaks. Result steers Phase 5 design.
- [ ] **ZDR contracts** — Anthropic + Deepgram (primary), OpenAI + AssemblyAI (failover). Must be signed before Phase 6 ships. Track in `.planning/COMPLIANCE.md` (TBD).
- [ ] **AI-assistance disclosure stance** — Locked: stealth assumed, no disclosure prompt. Documented in `LEGAL.md` (TBD, Phase 6).
- [ ] **Embedding model choice** — Local BGE-small recommended for privacy alignment; Voyage-3-large fallback if FR RAG quality flags during Phase 7 testing (v2).

### Blockers

None currently. Phase 0 is unblocked.

---

## Session Continuity

**Last session:** Initialization (2026-04-26)
**What happened:**
- PROJECT.md created (core value, constraints, scope discipline)
- Deep research conducted: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md, SUMMARY.md
- REQUIREMENTS.md created with 70 atomic v1 REQ-IDs across 14 categories, pre-mapped to phases
- ROADMAP.md created: 7 v1 phases (0-6), 3 v2 phases deferred, 100% coverage
- STATE.md initialized

**Next session should:**
1. Run `/gsd-plan-phase 0` to decompose Phase 0 (Foundations & Stealth Spike) into executable plans
2. The first plan must include the stealth spike (FOUND-03) — this is the highest-priority validation item and gates Phase 5 architecture

**Open threads:**
- Phase 0 planning not started
- No code written yet (greenfield repo at `/Users/gabriel/Desktop/Wonka/code/interview-copilot/`)

---

## File Index

**Planning artifacts:**
- `/Users/gabriel/Desktop/Wonka/code/interview-copilot/.planning/PROJECT.md` — vision, constraints, key decisions
- `/Users/gabriel/Desktop/Wonka/code/interview-copilot/.planning/REQUIREMENTS.md` — 70 v1 REQ-IDs + traceability + v2 deferred + out-of-scope
- `/Users/gabriel/Desktop/Wonka/code/interview-copilot/.planning/ROADMAP.md` — 7 v1 phases with success criteria
- `/Users/gabriel/Desktop/Wonka/code/interview-copilot/.planning/STATE.md` — this file
- `/Users/gabriel/Desktop/Wonka/code/interview-copilot/.planning/config.json` — granularity standard, parallelization on, mode yolo

**Research:**
- `/Users/gabriel/Desktop/Wonka/code/interview-copilot/.planning/research/SUMMARY.md` — synthesis + phase order recommendations
- `/Users/gabriel/Desktop/Wonka/code/interview-copilot/.planning/research/STACK.md` — Tauri 2 + Deepgram + Claude + LanceDB
- `/Users/gabriel/Desktop/Wonka/code/interview-copilot/.planning/research/FEATURES.md` — 10-tool competitor analysis + differentiators
- `/Users/gabriel/Desktop/Wonka/code/interview-copilot/.planning/research/ARCHITECTURE.md` — three-layer Tauri shape + hot/cold path + IPC patterns
- `/Users/gabriel/Desktop/Wonka/code/interview-copilot/.planning/research/PITFALLS.md` — 5 critical + 9 high + 13 medium + traps + recovery strategies

**Future planning artifacts (not yet created):**
- `.planning/COMPLIANCE.md` — ZDR contract status tracker (create before Phase 6)
- `.planning/research/STEALTH_SPIKE.md` — Phase 0 validation result (create during Phase 0)
- `LEGAL.md` (in repo root) — Gabriel's legal posture memo (create during Phase 6)

---

*State initialized: 2026-04-26 after roadmap creation*
