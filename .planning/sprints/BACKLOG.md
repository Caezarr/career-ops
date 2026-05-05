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

> **Looking for atomic tickets?** Every epic below is decomposed into
> 5-12 micro-sprints (each 2-4h, one PR). The flat ordered list across
> all epics lives in [`MICRO-SPRINTS.md`](./MICRO-SPRINTS.md) — that's
> the single source of truth for "what do I work on next".

---

## Lineup

| # | Sprint | Priority | µ-sprints | Hours | Status |
|---|---|---|---|---|---|
| 1 | **Job Teaser SSO** — school-jobs via authenticated WebView | 🔴 Critical | 12 (`JT-01` → `JT-12`) | 36h | 🟡 Spec'd |
| 2 | **Audit / Roast** — security, code quality, privacy posture, drift | 🔴 Critical | 8 (`AU-01` → `AU-08`) | 16h | 🟡 Spec'd |
| 3 | **PRIV-01** — single-egress `cloud::Client` Rust refactor | 🟠 High | 5 (`PR1-01` → `PR1-05`) | 12h | 🟡 Triggered by AU-08 |
| 4 | **Copilot Phase 1** — dual-channel audio capture | 🟠 High | 10 (`P1-01` → `P1-10`) | 32h | 🟡 Spec'd |
| 5 | **Copilot Phase 2** — STT spine + question detection | 🟠 High | 9 (`P2-01` → `P2-09`) | 28h | 🟡 Spec'd |
| 6 | **Copilot Phase 3** — CV/JD + per-offer snapshot + ContextAssembler | 🟡 Med | 7 (`P3-01` → `P3-07`) | 22h | 🟡 Partial |
| 7 | **Copilot Phase 4** — LLM bullets + personae + citation validator | 🟡 Med | 8 (`P4-01` → `P4-08`) | 24h | 🟡 Spec'd, partial |
| 8 | **Copilot Phase 5** — overlay + stealth + Pitch perso | 🟡 Med | 9 (`P5-01` → `P5-09`) | 28h | 🟡 Spec'd |
| 9 | **Copilot Phase 6 (SHIPPABLE GATE)** — failover + watchdog + degraded | 🟡 Med | 12 (`P6-01` → `P6-12`) | 38h | 🟡 Spec'd |
| | **TOTAL** | | **88** | **~236h** | |

(236h is serial-best-case. Realistic with reviews + bug fixes: 280-320h ≈ 7-8 weeks at 40h/wk.)

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
