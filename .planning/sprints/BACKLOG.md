# Sprint Backlog — Career OS

**Last updated:** 2026-05-04
**Owner:** Gabriel
**Status of completed work:** see `git log --first-parent main`

---

## How this works

Each sprint is a focused 1-to-7 day unit with explicit acceptance criteria.
Sprints don't run in parallel — pick one, ship it, validate, move on.
Branch + PR per sprint. The exit criteria are non-negotiable — incomplete
sprints get a follow-up sprint, not "merge it anyway".

Priority is **vertical** (top-down). When a higher-priority sprint blocks
a lower one (e.g. audit before Live Copilot work), the order is fixed.

---

## Lineup

| # | Sprint | Priority | Est. | Status |
|---|---|---|---|---|
| 1 | **Job Teaser SSO** — school-jobs ingestion via authenticated WebView | 🔴 Critical | 4-5 d | 🟡 Spec'd, not started |
| 2 | **Audit / Roast** — security audit, code quality, UX coverage, privacy posture | 🔴 Critical | 2 d | 🟡 Spec'd, not started |
| 3 | **PRIV-01** — single-egress `cloud::Client` Rust refactor | 🟠 High | 1-2 d | 🟡 Spec'd as standalone task |
| 4 | **Copilot Phase 1** — dual-channel audio capture (mic + ScreenCaptureKit) | 🟠 High | 5-7 d | 🟡 Spec'd, not started |
| 5 | **Copilot Phase 2** — STT spine + question detection (Deepgram Nova-3) | 🟠 High | 5-7 d | 🟡 Spec'd, not started |
| 6 | **Copilot Phase 3** — CV/JD ingestion + per-offer snapshot + ContextAssembler | 🟡 Med | 4-5 d | 🟡 Partial (CV manager exists, snapshot/Docling missing) |
| 7 | **Copilot Phase 4** — LLM bullet generation + 3 domain personae | 🟡 Med | 4-5 d | 🟡 Spec'd, partially done (ATS analysis ships) |
| 8 | **Copilot Phase 5** — Live UX overlay + screen-share masking + Pitch perso | 🟡 Med | 4-5 d | 🟡 Overlay UI exists, pipeline not wired |
| 9 | **Copilot Phase 6 (SHIPPABLE GATE)** — failover + watchdog + degraded mode | 🟡 Med | 5-7 d | 🟡 Spec'd, not started |

**Total time-to-Live-Copilot-ship:** ~5-6 weeks once we start the Copilot track (after Job Teaser + Audit).

---

## Decision rationale

### Why Job Teaser FIRST

The user explicitly said: "l'élément vendeur par la suite sera Job Teaser". The 4-ATS ingestion already shipped — that's table stakes. Job Teaser unlocks **school-network jobs** (HEC / ESSEC / Sciences Po / EM Lyon / etc.) that no public aggregator surfaces. That's the moat: a job seeker at HEC sees their *school's exclusive feed* in the same place as YC + Stripe. Ship this and Career OS leapfrogs every competitor for the French Grandes Écoles audience.

### Why Audit / Roast SECOND

Repo just went public. We've shipped 8 PRs in the last 2 weeks under heavy iteration. The technical debt is already visible:
- 5+ modules build their own `reqwest::Client` (PRIV-01 violated)
- The original ROADMAP for the Live Copilot describes failure modes we haven't even run into yet
- No real test coverage on the ingestion code we just shipped
- The `.planning/research/PITFALLS.md` document has known traps we should re-check
- An honest pass through every page + every function call before we triple the codebase

### Why Copilot Phases LAST

The Live Copilot is the riginal core feature, and once it ships it's a moat ("a teleprompter grounded in your CV"). But it's also the riskiest:
- macOS 15+ broke the canonical stealth flag (`NSWindow.sharingType = .none`)
- Two-channel audio is dependent on Swift sidecar + ScreenCaptureKit
- Vendor cost ~$0.66 / live interview hour — keys + billing setup not ready
- Failover (Phase 6) is the SHIPPABLE GATE — feature-complete at Phase 5 but Tier-1 reliability needs Phase 6

We do Job Teaser + Audit first because they're *user-facing differentiators with low technical risk*. Copilot is a 5-6 week hard-engineering investment.

---

## Per-sprint files

- [`2026-05-04-job-teaser-sso.md`](./2026-05-04-job-teaser-sso.md)
- [`2026-05-04-audit-roast.md`](./2026-05-04-audit-roast.md)
- [`2026-05-04-copilot-phase-1-audio.md`](./2026-05-04-copilot-phase-1-audio.md)
- [`2026-05-04-copilot-phase-2-stt.md`](./2026-05-04-copilot-phase-2-stt.md)
- [`2026-05-04-copilot-phase-3-context.md`](./2026-05-04-copilot-phase-3-context.md)
- [`2026-05-04-copilot-phase-4-llm.md`](./2026-05-04-copilot-phase-4-llm.md)
- [`2026-05-04-copilot-phase-5-overlay.md`](./2026-05-04-copilot-phase-5-overlay.md)
- [`2026-05-04-copilot-phase-6-reliability.md`](./2026-05-04-copilot-phase-6-reliability.md)

The PRIV-01 single-egress refactor is queued as a standalone task (spawned via `mcp__ccd_session__spawn_task` during the ingestion sprint) — no sprint doc, just an isolated worktree.

---

## Closed sprints (for reference)

- [`2026-05-04-job-ingestion.md`](./2026-05-04-job-ingestion.md) — closed via PR #18 (✅ all 6 items shipped)
