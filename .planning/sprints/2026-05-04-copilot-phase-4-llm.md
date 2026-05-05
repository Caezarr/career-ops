# Sprint — Live Copilot Phase 4: LLM + Bullet Generation + Personae

**Date opened:** 2026-05-04
**Branch:** `feat/copilot-phase-4-llm`
**Estimated duration:** 4-5 focused days
**Goal:** When Phase 2's QuestionEnd event fires, Career OS sends the question + Phase 3's snapshot context to Claude Sonnet 4.5 with prompt caching enabled. Claude streams 3 bullets in <5s. Each bullet citing a CV fact carries `[ref: CV.experience.<id>]`. A post-gen validator drops bullets with unresolved refs. Zero hallucinations on the user's CV.

---

## 1. Out of scope

- ❌ GPT-5 failover (Phase 6)
- ❌ Local Ollama degraded mode (Phase 6)
- ❌ Audio / STT / Overlay (other phases)
- ❌ Voice-driven follow-up questions

---

## 2. Architecture

```
QuestionEnd event from Phase 2
        │
        ▼
┌─ src-tauri/src/llm/ ───────────────────────────────┐
│  ├ claude.rs       — Anthropic API client (cached)  │
│  ├ prompt.rs       — system + user prompt builders   │
│  ├ validator.rs    — citation-ref enforcement        │
│  └ bullets.rs      — output schema + parsing         │
└────────────┬───────────────────────────────────────┘
             │ Tauri events (streaming tokens)
             ▼
┌─ Frontend Copilot overlay ─────────────────────────┐
│  3 bullet rows, streamed token-by-token            │
│  Each row: text + [ref: CV.experience.0]            │
│  Validator fails → bullet replaced with placeholder│
└────────────────────────────────────────────────────┘
```

---

## 3. Prompting strategy

**System prompt (cached):**
- Persona instructions (from Phase 3's persona system)
- The user's full CV (structured, with stable IDs `exp.0`, `exp.1`, ...)
- The JD text
- Hard constraints:
    - "Output exactly 3 bullets, max 25 words each"
    - "Every claim about the user's experience MUST cite as `[ref: CV.experience.<id>]`"
    - "Never invent a fact about the user. If you can't ground a bullet in their CV, say so explicitly"

**User prompt (per question):**
- The transcribed question
- The language hint (FR | EN auto-detected)
- The persona's framework (STAR | MECE | etc.)

**Caching:** the system prompt (CV + JD + persona) is identical across all questions in a session — Anthropic's prompt-cache discount drops cost by ~90%. We mark it explicitly with `cache_control: { type: "ephemeral" }`.

**Cost model:** 1 question = ~50 input tokens (uncached) + ~3-4k cached tokens (90% discount) + ~150 output tokens. ≈ $0.005/question. At 30 questions/hour that's ~$0.15 in LLM cost during a live interview.

---

## 4. Citation validation

After streaming completes (or progressively), `validator.rs` parses each bullet:
- Extracts all `[ref: CV.experience.<id>]` mentions
- Verifies each ID exists in the snapshot context
- If any ref is unresolved → bullet is **dropped** and replaced with a placeholder ("Not enough CV evidence for this bullet")
- Logs all validation failures for observability

This is the **zero-hallucinations-on-CV guarantee** that the README promises.

---

## 5. Micro-sprints (atomic tickets)

### P4-01 · Anthropic streaming Messages API client + cache markers
**Est:** 4h · **Deps:** — · **PR-able:** ✅
**Goal:** Anthropic streaming client with prompt cache markers wired correctly.
**Tasks:**
- `src-tauri/src/llm/claude.rs` — Messages API streaming via SSE
- `cache_control: { type: "ephemeral" }` markers on the system prompt
- Auth from Keychain (existing `keyring` pattern from `ai/anthropic.rs`)
- Smoke test: hello-world streaming response works
**Acceptance:** Test prints streamed tokens; second call shows `cache_read_input_tokens > 0`.
**Output:** 1 commit.

### P4-02 · Cache hit verification (recon)
**Est:** 1h · **Deps:** P4-01 · **PR-able:** ❌
**Goal:** Verify the 90% cost discount lands in real conditions.
**Tasks:**
- Run 5 sequential calls with the same large system prompt
- Log `cache_read_input_tokens` / `cache_creation_input_tokens` from each response
- Confirm cache hit rate ≥80% from call #2 onward
- Document in `.planning/research/CLAUDE-COSTS.md`
**Acceptance:** Documented numbers; spend on a test session calculated end-to-end.
**Output:** Recon doc, no code commit.

### P4-03 · `prompt::build_system_prompt` + `build_user_prompt`
**Est:** 3h · **Deps:** P3-05 · **PR-able:** ✅
**Goal:** Deterministic builders for the LLM input.
**Tasks:**
- `llm/prompt.rs::build_system_prompt(snapshot)` — persona file + CV + JD + hard constraints
- `build_user_prompt(question, language, persona)` — the per-question wrapper
- Snapshot tests: same snapshot → same byte-exact prompt (regression guard)
**Acceptance:** Snapshot tests for all 3 personas pass.
**Output:** 1 commit.

### P4-04 · Persona prompt template snapshot tests
**Est:** 2h · **Deps:** P3-06 + P4-03 · **PR-able:** ✅
**Goal:** Catch unintentional persona prompt drift.
**Tasks:**
- Golden output files in `src-tauri/tests/fixtures/prompts/`
- For a fixed (CV, JD) pair across 3 personas → 3 snapshot files
- `cargo test prompt_finance_snapshot`, `prompt_tech_ai_snapshot`, `prompt_consulting_snapshot`
**Acceptance:** Tests fail loudly when prompts change unintentionally.
**Output:** 1 commit + fixture files.

### P4-05 · `bullets.rs` — output schema + streaming parser
**Est:** 3h · **Deps:** P4-03 · **PR-able:** ✅
**Goal:** Stream parser emits partial bullets as tokens arrive.
**Tasks:**
- `Bullet { text, refs: Vec<String>, validated: bool }`
- Parser state machine: detect bullet starts (`•` or `→`), accumulate text, parse `[ref: CV.experience.<id>]` patterns
- Emit `bullet_start`, `bullet_token`, `bullet_end` Tauri events with stable ordering
**Acceptance:** Feed a known mock streaming response → 3 bullets emitted with correct refs.
**Output:** 1 commit.

### P4-06 · `validator.rs` — citation-ref enforcement
**Est:** 3h · **Deps:** P4-05 · **PR-able:** ✅
**Goal:** Drop bullets whose refs don't resolve in the snapshot.
**Tasks:**
- `validate_bullet(bullet, snapshot) -> Result<Bullet, ValidationError>`
- For each `[ref: CV.experience.X]`, look up `X` in snapshot.experiences
- Bullet with any unresolved ref → replaced with placeholder + warning event
- Test with valid + intentionally-fake refs
**Acceptance:** Fake `[ref: CV.experience.999]` → bullet dropped, warning event fired.
**Output:** 1 commit.

### P4-07 · Frontend overlay slot streaming render
**Est:** 3h · **Deps:** P4-05 · **PR-able:** ✅
**Goal:** Bullets appear token-by-token in the overlay's 3 slots.
**Tasks:**
- Subscribe to `bullet_start` / `bullet_token` / `bullet_end` events
- 3 slots with token-stream rendering (typewriter effect)
- On `bullet_end`: highlight ref tokens with [CV.exp.X] inline tooltip
- Replacement state for validator drops (red border + "Insufficient evidence")
**Acceptance:** Mock LLM response → 3 streaming bullets visible in overlay UI.
**Output:** 1 commit.

### P4-08 · E2E: QuestionEnd → bullets in <5s p95
**Est:** 5h · **Deps:** all above + P2-06 · **PR-able:** ✅
**Goal:** Sprint exit gate.
**Tasks:**
- Wire QuestionEnd event from Phase 2 → triggers `llm::generate(snapshot, question)` → streams to overlay
- Latency profiler: log p50 / p95 from QuestionEnd to first-token, full-3-bullets-complete
- Manual e2e with the user's real CV + 3 distinct JDs across all 3 personas
- README "Live Copilot — LLM" section
**Acceptance:** p95 first-token ≤2s, full bullets ≤5s. All 3 personas produce distinguishable output.
**Output:** Sprint closed.

---

## 6. Day-by-day breakdown

### Day 1 — Anthropic client + prompt cache verification

- [ ] `llm/claude.rs` — Anthropic Messages API client with streaming + prompt caching
- [ ] Verify the `cache_control` markers reduce cost on the second + subsequent calls (look at the API response's `cache_read_input_tokens` field)
- [ ] Auth from Keychain via existing pattern

**Done = a hello-world streaming call works, second call shows >0 `cache_read_input_tokens`.**

### Day 2 — Prompt builders + persona templates

- [ ] `llm/prompt.rs` — `build_system_prompt(snapshot)` returns the persona-specific instruction + CV + JD blob
- [ ] `build_user_prompt(question, language)` returns the user message
- [ ] All 3 persona templates (Finance / Tech-AI / Consulting) reviewed + finalised

**Done = `cargo test prompt::builds_finance` snapshot test passes.**

### Day 3 — Bullet schema + streaming parse

- [ ] `llm/bullets.rs` — output schema:
    ```rust
    pub struct Bullet {
        pub text: String,
        pub refs: Vec<String>,  // ["CV.experience.2", "CV.experience.4"]
        pub validated: bool,
    }
    ```
- [ ] Stream parser — emits partial bullets as they arrive (token-by-token), full bullets when complete
- [ ] Frontend renders streaming text in the overlay's 3 bullet slots

**Done = trigger a question manually → 3 bullets stream in, citation refs visible.**

### Day 4 — Validator + replacement flow

- [ ] `llm/validator.rs` — checks every ref against the snapshot's experience IDs
- [ ] Invalid bullets replaced with placeholder + warning logged
- [ ] Frontend handles the replacement event (e.g. red border + tooltip explaining why)

**Done = injecting a fake `[ref: CV.experience.999]` into a test → validator drops the bullet correctly.**

### Day 5 — End-to-end + latency profile

- [ ] Wire QuestionEnd from Phase 2 → triggers Phase 4 → streams bullets to overlay
- [ ] Latency profile: question-end-to-first-token p95 target <2s, full-3-bullets p95 target <5s
- [ ] Manual test with the user's real CV + 3 different roles' JDs across the 3 personas

**Done = full end-to-end Live Copilot loop works (Phase 1 → 2 → 3 → 4) for a non-stealth, non-failover interview.**

---

## 6. Risks + mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **Hallucinations on CV facts** | 🔴 Critical | Validator drops bullets with unresolved refs. Promised in README. Tested in Day 4. |
| **Latency >5s p95** | 🔴 Critical | Anthropic prompt cache + streaming. Profile in Day 5. If exceeded, consider parallelising bullet generation (3 separate calls instead of 1). |
| **Cost overrun** | 🟡 Med | Prompt caching covers it. Monitor in dev with response telemetry. |
| **Streaming event ordering** | 🟡 Med | Emit ordered events (`bullet_start`, `bullet_token`, `bullet_end`) so the frontend doesn't render incoherent partials. |
| **Persona prompt quality drift** | 🟡 Med | The 3 templates are checked into git as text files — diff-reviewable. Prompt engineering is a continuous concern, not a one-shot. |

---

## 7. Acceptance criteria

- [ ] Trigger a question manually (via dev hotkey) → 3 bullets stream into the overlay within 5s
- [ ] Each bullet has at least one `[ref: CV.experience.<id>]` for any factual claim
- [ ] Inject a fake invalid ref → that bullet is dropped + replaced with placeholder
- [ ] Switch persona Finance → Tech-AI → Consulting — output style noticeably changes
- [ ] FR question → FR bullets; EN question → EN bullets
- [ ] Run 30 questions in a session → second + later questions show >80% prompt-cache hit rate
- [ ] No bullet ever cites a fact not in the snapshot context

---

## 8. Workflow

- **Branch:** `feat/copilot-phase-4-llm`, off `feat/copilot-phase-3-context`
- **Commits:** atomic per day
- **PR:** draft from Day 1
- **Tests:** prompt snapshot tests, validator tests, cost-cache verification on Day 1
- **Review:** Live demo on Day 5 with the user's real CV + 3 different role JDs
