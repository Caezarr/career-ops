# Sprint — Full Audit / Roast

**Date opened:** 2026-05-04
**Branch:** `chore/audit-roast`
**Estimated duration:** 2 focused days
**Goal:** An honest, no-bullshit pass through every page, every Tauri command, every dependency, every security claim, and every "TODO" in the codebase. Identify what's actually broken, what's at risk, what's lying. Produce a `AUDIT.md` deliverable with a prioritised punch list of fixes. The user merges nothing in this sprint without the audit completed first.

---

## Why this sprint

Career OS just went public. We've shipped 8 PRs in 2 weeks under heavy iteration pressure (rebrand → war room → ingestion). Multiple shortcuts were taken explicitly:
- 5+ modules build their own `reqwest::Client::builder()` despite PRIV-01 mandating single-egress
- The store had a localStorage-quota crash that only surfaced after the user typed a keyword
- Filters in the Jobs UI were *visible but non-functional* for sector/stage/seniority/salary
- The .planning/research/PITFALLS.md document lists known traps we haven't recently re-checked
- We have **zero** automated tests on the ingestion code (~1500 LOC of fresh Rust + TS)
- The repo contains historical "Interview Copilot" planning docs that pre-date the Career OS pivot — risk of drift

This sprint is the quality gate before we attack the Live Copilot phases (which will *triple* the codebase). Better to find rot now than fight it during Phase 1's audio plumbing.

---

## 1. Out of scope

- ❌ Adding new features
- ❌ Refactoring beyond the punch list
- ❌ Performance optimisation (separate concern)
- ❌ Re-running the design system / UI redesign

---

## 2. Audit dimensions

We split the audit into **6 vertical slices**. Each gets its own section in the final `AUDIT.md` deliverable with a roast-level honesty rating.

### 2.1. Security audit

**Inputs:** every secret, every external call, every user-supplied input, every file write.

- [ ] Run `gitleaks` (or equivalent) over the full git history — confirm no real keys ever landed
- [ ] Run `cargo audit` on `src-tauri/Cargo.lock` — list any `RUSTSEC-*` advisories with severity
- [ ] Run `pnpm audit` on the frontend — same exercise
- [ ] Inventory every Tauri `#[command]` — confirm input validation (no path traversal in `parse_cv_pdf`, no SQL injection in `db_*`, no command injection in `latex` / `pdf` modules)
- [ ] CSP audit on `tauri.conf.json` — currently `"csp": null`. Document the threat model + tighten to a strict policy if feasible
- [ ] Permission scope review: which Tauri capabilities are granted? Are any unused?
- [ ] Cookie / Keychain hygiene: confirm no sensitive material persisted in SQLite via `grep` over `db/*.rs` for "password", "token", "secret", "key"
- [ ] Webview sandbox: verify external links open in Safari, not the WebView (would expose our IPC bridge to arbitrary sites)

**Output deliverable:** `AUDIT.md → §Security` with severity-ranked findings.

### 2.2. PRIV-01 violations (single-egress cloud client)

**Inputs:** every direct `reqwest::Client::builder()` call.

Already known violations:
- `src-tauri/src/llm.rs:111`
- `src-tauri/src/lib.rs:69`
- `src-tauri/src/stt.rs:11`
- `src-tauri/src/ai/anthropic.rs:48`, `:126`
- `src-tauri/src/ingest/greenhouse.rs`
- `src-tauri/src/ingest/lever.rs`
- `src-tauri/src/ingest/ashby.rs`
- `src-tauri/src/ingest/ycombinator.rs`

Audit task:
- [ ] Confirm the list is exhaustive via `grep -rn "reqwest::Client::builder" src-tauri/`
- [ ] Decide: tackle as part of this audit (~½ day) or split off as a dedicated PRIV-01 sprint
- [ ] If tackled: create `src-tauri/src/cloud.rs` with a single shared client + `get_json` / `post_json` / WebSocket helpers
- [ ] Migrate every call site
- [ ] Add a CI grep test (`cargo test cloud_egress_no_leaks`) that fails if `reqwest::Client::builder` reappears outside `cloud.rs`

**Decision lever:** If the full migration is going to take >½ day, just document violations + PRIV-01 sprint date in `AUDIT.md` and move on. Don't bloat the audit sprint.

### 2.3. Code quality / dead-code / TODO sweep

- [ ] `grep -rn "TODO\|FIXME\|XXX\|HACK" src/ src-tauri/src/` — every match gets a verdict: keep, tracked-as-issue, or fix-now
- [ ] Find unused store actions — actions exposed via slice but never called from any component (signal of stale shape)
- [ ] Find unused Zustand state fields — same exercise via grep
- [ ] Find unused Tauri commands — registered in `invoke_handler!` but never called from frontend
- [ ] Find dead React components — exported from `components/*` but never imported
- [ ] Run `tsc --noEmit` with `--noUnusedLocals --noUnusedParameters` and address findings

**Output:** `AUDIT.md → §Dead code` with delete / refactor / keep verdicts per finding.

### 2.4. Functionality audit (per page)

For each of the 7 surfaces, run a manual test pass and document what works, what doesn't, what's mock vs. real:

| Surface | Real backing | Mock data | Known gaps |
|---|---|---|---|
| Dashboard | ? | ? | ? |
| Jobs | ✅ ingested via 4 ATS | seed mock fallback | Job Teaser pending |
| Applications | ? (DB-backed?) | ? | ? |
| War Room | ✅ ATS analysis live | next-best-actions? | ? |
| CV Manager | ? | ? | Docling parsing not real |
| Prep | ? | ? | ? |
| Live Copilot | UI only | all mock | pipeline not wired |

For each row:
- [ ] Open the page, click every button / interactive element
- [ ] Confirm whether the data is real (DB / live API) or mock seed
- [ ] Document any broken interaction with a screenshot
- [ ] Note features promised in the README that don't work

**Output:** `AUDIT.md → §Per-page functionality` with reality matrix.

### 2.5. Privacy posture verification

The README makes 6 explicit privacy claims. Audit each:

| Claim | Verification method | Status |
|---|---|---|
| "No raw audio on disk" | grep for filesystem writes in `audio.rs`, `session.rs` | ❓ |
| "All persistence local" | `find ~/Library/Application Support/com.caezarr.career-os` after a sync, confirm no iCloud sync attribute | ❓ |
| "Single-egress cloud::Client" | covered in §2.2 | ❌ violated |
| "API keys in Keychain" | grep DB tables + JSON files for "key", "token" | ❓ |
| "Zero-retention contracts" | check vendor TOS — Anthropic ✓, OpenAI ✓, Deepgram ✓?, AssemblyAI ✓? | ❓ |
| "PII-stripped logger" | inspect `tracing` setup, confirm filters | ❓ |

**Output:** `AUDIT.md → §Privacy claims` with PASS / FAIL / NEEDS-WORK per claim. Update README if any claim is currently false.

### 2.6. .planning/ vs reality drift

Older docs reference the original "Interview Copilot" scope. Some are still valid; some are stale.

- [ ] `PROJECT.md` — does its "core value" still match? Update or annotate.
- [ ] `REQUIREMENTS.md` — flag PRIV-01..06, FOUND-01..06, etc. that are now done / partially done / pending. Add an inline "(2026-05 status)" note.
- [ ] `ROADMAP.md` — phases 0-6 for Live Copilot are still valid; just need a status note.
- [ ] `research/STACK.md`, `research/PITFALLS.md`, `research/ARCHITECTURE.md` — read each, flag anything that's been disproven by reality (e.g., "we tried X, X turned out to be true / false")

**Output:** updated annotations in each doc, summary in `AUDIT.md → §Planning drift`.

---

## 3. Micro-sprints (atomic tickets)

> Each = 1-3 h. Most are pure recon (no code commit) — outputs feed `AUDIT.md`.

### AU-01 · Run `gitleaks` + `cargo audit` + `pnpm audit`
**Est:** 1h · **Deps:** — · **PR-able:** ❌
**Goal:** Surface any leaked secrets in git history + known CVEs in deps.
**Tasks:**
- `gitleaks detect --source . --no-banner` over the full repo + log clean / dirty
- `cd src-tauri && cargo audit` — list any RUSTSEC-* with severity
- `pnpm audit --prod` — same exercise; `--audit-level=moderate` floor
- Append findings to `.planning/audit-2026-05/AUDIT.md` under `§Security`
**Acceptance:** All three commands run; verdict (PASS / FINDINGS) recorded with file:line for every hit.
**Output:** AUDIT.md draft, no code change.

### AU-02 · Inventory `#[tauri::command]` + grade input validation
**Est:** 2h · **Deps:** — · **PR-able:** ❌
**Goal:** Confirm no command takes raw user input that can become path traversal / SQL injection / shell injection.
**Tasks:**
- `grep -rn "#\[tauri::command\]" src-tauri/src/` — list every command
- For each: identify input params + grade `safe / sanitised / risky / unknown`
- Risky ones: write a 1-line test (`cargo test cmd_<name>_rejects_traversal`) BEFORE the audit lands
- Findings → AUDIT.md `§Security § Tauri commands`
**Acceptance:** Every command has a verdict in the table; risky ones have a test gating them.
**Output:** AUDIT.md update + (optionally) a `cmd_*_safety_tests.rs` file.

### AU-03 · PRIV-01 violation inventory
**Est:** 1h · **Deps:** — · **PR-able:** ❌
**Goal:** Confirm the existing 9-site list is exhaustive.
**Tasks:**
- `grep -rn "reqwest::Client::builder\|reqwest::Client::new" src-tauri/src/` — exhaustive list
- Cross-check with the existing list in this doc's §2.2; flag any new sites
- Decide: tackle in this audit (≤½ d available) or trigger Epic 3 (PRIV-01) sprint
- Append to AUDIT.md `§PRIV-01`
**Acceptance:** `egress_no_leaks_test.rs` test that uses `include_str!` + grep over `src-tauri/src` written and FAILS today (proves the test catches violations).
**Output:** AUDIT.md update + 1 failing test (will pass after Epic 3).

### AU-04 · Dead-code sweep
**Est:** 2h · **Deps:** — · **PR-able:** ❌
**Goal:** Find anything exported but unused — store actions, components, Tauri commands, TS types.
**Tasks:**
- `grep -rn "TODO\|FIXME\|XXX\|HACK" src/ src-tauri/src/` — verdict per match (kill / track / fix)
- Find unused store actions: `grep -L "actionName" src/dashboard/components` for each action defined in slices
- Find dead components: every file in `components/*` that's not imported anywhere
- Find unused Tauri commands: every command in `invoke_handler!` not invoked from frontend
- TS: `tsc --noUnusedLocals --noUnusedParameters` and address findings
- AUDIT.md `§Dead code`
**Acceptance:** Every flagged item has a verdict; items marked "kill" are deleted in this micro-sprint.
**Output:** AUDIT.md update + 1 commit deleting verified-dead code.

### AU-05 · Per-page reality matrix (7 surfaces)
**Est:** 3h · **Deps:** — · **PR-able:** ❌
**Goal:** For each surface, document real / mock / broken — no marketing language.
**Tasks:**
- Open each page: Dashboard, Jobs, Applications, War Room, CV, Prep, Live Copilot
- Click every interactive element. Take a screenshot. Note any broken interaction.
- For each row, fill: backing layer (DB / API / mock), known gaps, README vs. reality delta
- Save screenshots under `.planning/audit-2026-05/screenshots/`
- AUDIT.md `§Per-page functionality` with the matrix
**Acceptance:** 7 rows × {backing, mock, gaps, screenshot}. No "TBD".
**Output:** AUDIT.md update + screenshots committed.

### AU-06 · Privacy claims verification (6 README claims)
**Est:** 2h · **Deps:** AU-03 · **PR-able:** ❌
**Goal:** Every README privacy bullet either passes verification or gets removed/softened.
**Tasks:**
- Walk through each claim from §2.5 of this doc (raw audio / local persistence / cloud::Client / Keychain / ZDR / PII-stripped logger)
- For each: state how it's verified, paste evidence (file:line, command output, etc.)
- If FAIL: open a follow-up micro-sprint OR weaken the README claim in the same commit
- AUDIT.md `§Privacy claims`
**Acceptance:** Every claim is PASS or the README has been edited in this commit to no longer make the claim.
**Output:** AUDIT.md + (optionally) README.md commit.

### AU-07 · `.planning/` drift annotations
**Est:** 1h · **Deps:** — · **PR-able:** ✅
**Goal:** Stale planning docs from the original "Interview Copilot" pivot get a "(2026-05 status)" marker.
**Tasks:**
- Read each of `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `research/*.md`
- Add inline `> **2026-05-05 status:** done / partial / pending — see XYZ` markers
- DON'T rewrite — just annotate, so the historical context stays clean
**Acceptance:** Every document in `.planning/` (except `sprints/`) has at least one freshness annotation.
**Output:** 1 commit, doc edits only.

### AU-08 · Write `AUDIT.md` final + §Roast + open follow-up sprints
**Est:** 4h · **Deps:** AU-01 → AU-07 · **PR-able:** ✅
**Goal:** Sprint exit gate. Honest, prioritised, actionable.
**Tasks:**
- Stitch together AUDIT.md final from all the per-MS appends
- Write the §Roast section as if presenting to a hostile reviewer (see §6 of this doc)
- Punch list table: severity × effort × status, sorted by severity
- For every 🔴 not fixed inline: spawn a follow-up micro-sprint (add to MICRO-SPRINTS.md)
- For every 🟠: schedule into next 2 sprints
**Acceptance:** AUDIT.md complete; all 🔴 either fixed or have a tracked follow-up; the §Roast doesn't pull punches.
**Output:** Sprint closed. Audit findings linked from BACKLOG.md.

---

## 4. Day-by-day breakdown

### Day 1 — Reconnaissance

- [ ] Morning: §2.1 Security + §2.2 PRIV-01 violations + §2.3 Code quality sweep
- [ ] Afternoon: §2.4 per-page functionality (manual click-test all 7 surfaces, screenshots in `.planning/audit-2026-05/`)

**Done = `AUDIT.md` exists with §Security, §PRIV-01, §Dead code, §Per-page sections drafted.**

### Day 2 — Privacy + drift + fix-now items

- [ ] Morning: §2.5 Privacy + §2.6 Planning drift
- [ ] Afternoon: tackle the 🔴 Critical items from the punch list — anything else gets tracked as a follow-up sprint

**Done = `AUDIT.md` complete + 🔴 Critical findings either fixed or reduced to 🟠 High.**

---

## 5. AUDIT.md structure (deliverable)

```markdown
# AUDIT — 2026-05-{05}

## Verdict (TL;DR)

[1 paragraph honest take. "Career OS is in [STATE]. Top 3 risks: ..."]

## §Security

[per-finding: severity, file, line, mitigation, status]

## §PRIV-01 violations

[list of the 9+ ad-hoc reqwest sites + decision: fix-now or sprint]

## §Dead code

[verdicts per match: delete / refactor / keep]

## §Per-page functionality

[reality matrix as in §2.4 above]

## §Privacy claims

[PASS/FAIL/NEEDS-WORK per README claim]

## §Planning drift

[stale doc → updated section pointers]

## §Roast (final)

[the user-facing honest take. Don't pull punches.
"The X is bullshit because Y. The Z is real and works. The W
is half-finished and we should NOT ship it as-is."]

## §Punch list (prioritised)

| # | Finding | Severity | Effort | Status |
|---|---|---|---|---|
| 1 | ... | 🔴 | 2h | 🟢 fixed |
| 2 | ... | 🟠 | ½d | 🟡 deferred to sprint X |

## §Follow-up sprints

- Spawn dedicated sprint for [...] (estimate: ...)
```

---

## 5. Acceptance criteria

- [ ] `AUDIT.md` committed at `.planning/audit-2026-05/AUDIT.md`
- [ ] Every README privacy claim has a verdict
- [ ] Every TODO/FIXME in the codebase has a verdict (kill / track / fix)
- [ ] Every Tauri command audited for input validation
- [ ] Every page has a "real / mock / broken" verdict
- [ ] At least one 🔴 Critical fix shipped in this sprint (proof of action)
- [ ] Follow-up sprints spawned (or scheduled) for everything not fixed-now

---

## 6. The Roast (anti-bullshit clause)

This sprint exists *specifically* to be honest. Pulling punches defeats the purpose.

**Required tone in `AUDIT.md → §Roast`:**
- Say what's broken with file paths + line numbers
- Call out promises in the README that aren't delivered
- Identify "TODO" comments that have aged 30+ days as a smell
- Don't write "the codebase is in good shape" — be specific about what is and isn't
- If something is genuinely solid, say that too — but with proof

**Optional pre-roast:** before writing the final §Roast, read it aloud as if presenting to a hostile reviewer who's about to give the codebase 0/10. What would they catch? Write *that* down.

---

## 7. Workflow

- **Branch:** `chore/audit-roast`, off latest main
- **Commits:** atomic per audit dimension
- **PR:** opened in draft Day 1, marks each finding with a checkbox as it's resolved or deferred
- **Tests:** add the `cloud_egress_no_leaks` test from §2.2 if PRIV-01 is tackled in this sprint
- **Review:** the user reads `AUDIT.md` end-to-end before merge. PR is *not* mergeable without explicit approval after reading the §Roast.
