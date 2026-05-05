# Sprint — Live Copilot Phase 3: CV/JD Ingestion + Snapshot + ContextAssembler

**Date opened:** 2026-05-04
**Branch:** `feat/copilot-phase-3-context`
**Estimated duration:** 4-5 focused days
**Goal:** When the user starts a Live Copilot session for a specific job, the LLM in Phase 4 receives a clean, structured, citation-ready context object: their parsed CV (via Docling), the JD text, the persona prompt, and a per-offer "snapshot" so contexts never bleed between interviews.

The CV manager UI already exists. This sprint makes the parsing + context-assembly real, replaces mock CVs with actual parsed structure, and wires the per-offer snapshot pattern.

---

## 1. Out of scope

- ❌ The LLM call itself (Phase 4)
- ❌ Bullet generation (Phase 4)
- ❌ Multi-CV variants beyond what already ships in CV Manager
- ❌ Live narration of the JD (text-only ingestion)

---

## 2. Architecture

```
┌─ User actions ──────────────────────────────────────┐
│  Upload CV.pdf → Docling sidecar → Structured JSON   │
│  Paste JD text → Quick parse → Sections array        │
│  Start Live Copilot for job X → Snapshot freezes     │
│    { cv_id, jd_id, persona } at session start       │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─ src-tauri/src/context/ ────────────────────────────┐
│  ├ docling.rs   — Python sidecar bridge (CV)         │
│  ├ jd_parser.rs — JD → sections + keywords           │
│  ├ snapshot.rs  — per-session immutable bundle       │
│  └ assembler.rs — builds the LLM prompt context      │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─ Phase 4 LLM (out of scope) ────────────────────────┐
│  Receives: { cv_json, jd_text, persona, snapshot_id} │
│  Returns: bullets with [ref: CV.experience.<id>]    │
└────────────────────────────────────────────────────┘
```

---

## 3. Micro-sprints (atomic tickets)

### P3-01 · Docling Python sidecar bundling
**Est:** 4h · **Deps:** — · **PR-able:** ✅
**Goal:** Docling runs from inside the .app bundle without external Python install.
**Tasks:**
- PyInstaller bundle of Docling → standalone executable (~150MB)
- `tauri.conf.json::bundle.externalBin` registers it
- Build script for CI / local: `swift run` no longer needed
- Smoke test: spawn the sidecar, send a tiny PDF on stdin, parse JSON output
**Acceptance:** `pnpm tauri build` produces a .app that parses a sample CV without external Python.
**Output:** 1 commit.

### P3-02 · CV upload → Docling → structured JSON in `cv` table
**Est:** 3h · **Deps:** P3-01 · **PR-able:** ✅
**Goal:** A real PDF upload produces structured experience/education/skills sections.
**Tasks:**
- Extend `cv` SQLite table with `parsed_json BLOB` column (migration 0003)
- New Tauri command `cv_parse_with_docling(cv_id)` — spawns sidecar, parses, persists
- Frontend CV preview reads the JSON and renders structured sections (replace today's mock)
**Acceptance:** Upload Gabriel's real CV → see correct experience timeline, skill tags, education.
**Output:** 1 commit.

### P3-03 · JD parser: sections + keyword extraction
**Est:** 3h · **Deps:** — · **PR-able:** ✅
**Goal:** A pasted JD becomes `{ about, responsibilities, requirements, nice_to_have, benefits, keywords[] }`.
**Tasks:**
- `src-tauri/src/context/jd_parser.rs` — heuristic regex split on common section headers
- Keyword extraction: capitalised tokens + multi-word phrases from the requirements section
- Cap keywords at top-30 by frequency
- `cargo test jd_parse_anthropic_listing` snapshot test
**Acceptance:** Test passes for a known Anthropic JD; structure visible in War Room JD section.
**Output:** 1 commit.

### P3-04 · `interview_snapshot` table + immutable creation
**Est:** 3h · **Deps:** P3-02 + P3-03 · **PR-able:** ✅
**Goal:** Per-offer snapshot freezes (cv_id, jd_id, persona) so contexts never bleed.
**Tasks:**
- Migration 0004: `interview_snapshot { id, cv_id, jd_id, persona, created_at, snapshot_json }`
- `db::snapshot::create(cv_id, jd_id, persona)` — copies CV JSON + JD JSON into a frozen blob
- Tauri command `snapshot_create_for_session`
- DB index on (cv_id, jd_id) for cheap lookup
**Acceptance:** Starting a Live session creates one row; viewing the row in DB shows immutable JSON.
**Output:** 1 commit.

### P3-05 · `assembler.rs::build(snapshot_id) → LlmContext`
**Est:** 3h · **Deps:** P3-04 · **PR-able:** ✅
**Goal:** Produce the LLM-ready context object.
**Tasks:**
- `LlmContext` struct (cv_summary, cv_experiences, jd_text, jd_keywords, persona, language)
- Each `Experience` has stable ID `exp.<idx>` for citation refs
- Truncate JD to 4k tokens (rough char count); summarise CV experiences to ≤1k tokens via deterministic bullet extraction
- Auto-detect language from JD (FR vs EN) using simple heuristics
**Acceptance:** Deterministic — same input ⇒ same output; round-trip test in `cargo test`.
**Output:** 1 commit.

### P3-06 · 3 persona prompt templates
**Est:** 3h · **Deps:** — · **PR-able:** ✅
**Goal:** Finance / Tech-AI / Consulting persona prompt files reviewed and committed.
**Tasks:**
- `src-tauri/prompts/persona-finance.md`
- `src-tauri/prompts/persona-tech-ai.md`
- `src-tauri/prompts/persona-consulting.md`
- Each ~500 words: system instructions, style, framework (STAR / MECE / Pyramid), tone
- Documented in `.planning/research/PROMPTS.md`
**Acceptance:** All 3 reviewed by the user; committed as readable text.
**Output:** 1 commit, prompts only.

### P3-07 · Wire start-Live-Copilot button + snapshot test
**Est:** 3h · **Deps:** P3-05 + P3-06 · **PR-able:** ✅
**Goal:** Sprint exit gate.
**Tasks:**
- Copilot page: pick CV + Job + persona → "Start Live" button creates snapshot via P3-04 + builds context via P3-05
- `cargo test context::no_bleed_between_snapshots` — assert two consecutive sessions produce distinct snapshot_ids and don't share state
- README "Live Copilot — context" section explaining the snapshot model
**Acceptance:** Test passes + manual flow: switch jobs mid-session = brand new context.
**Output:** Sprint closed.

---

## 4. Day-by-day breakdown

### Day 1 — Docling sidecar

- [ ] Bundle the Docling Python tool as a sidecar (Tauri's `tauri::api::process::Command::new_sidecar`)
- [ ] On CV upload: Rust spawns Docling, pipes the PDF, parses the structured JSON output
- [ ] Persist the parsed JSON in the existing `cv` SQLite table's `parsed_text` field (extend to `parsed_json` BLOB if needed)

**Done = upload a real PDF, see structured experience / education / skills sections in the CV preview panel.**

### Day 2 — JD parser + per-offer snapshot

- [ ] `jd_parser.rs` — split JD text into sections (about / responsibilities / requirements / nice-to-have / benefits) via simple heuristic regex (keyword-driven)
- [ ] Extract a `keywords[]` array from requirements section (capitalised tokens, multi-word phrases)
- [ ] `snapshot.rs` — when user clicks "Start Live Copilot for <job>", create an immutable snapshot row in a new `interview_snapshot` table with `(cv_id, jd_id, persona, created_at, snapshot_json)`

**Done = starting a Live Copilot session creates a snapshot — viewable in DB but not yet exposed in UI.**

### Day 3 — ContextAssembler

- [ ] `assembler.rs` — produces the LLM prompt context from a snapshot:
    ```rust
    pub struct LlmContext {
        pub cv_summary: String,        // bullet form, ~1k tokens
        pub cv_experiences: Vec<Experience>,  // structured, with stable IDs
        pub jd_text: String,           // truncated if >4k tokens
        pub jd_keywords: Vec<String>,
        pub persona: Persona,          // Finance | Tech-AI | Consulting
        pub language: Language,        // FR | EN — auto-detected from JD
    }
    ```
- [ ] Closed-set CV grounding — every experience in the context has a stable ID (`exp.0`, `exp.1`, ...) that Phase 4's prompts will require as citation refs

**Done = `assembler::build(snapshot_id)` returns the full context object, ready for Phase 4.**

### Day 4 — Persona system

- [ ] Three persona profiles in `src-tauri/src/context/personas.rs`:
    - **Finance** — STAR framework, results in numbers, conservative tone
    - **Tech-AI** — technical depth, system design, MECE for case-y questions
    - **Consulting** — MECE, hypothesis-driven, pyramid principle
- [ ] User picks persona on the Copilot start screen (default = stored in `user.persona`)
- [ ] Persona prompt template loaded from a static file, parameterised with the snapshot's CV + JD

**Done = the 3 persona prompts are written and reviewable as text files.**

### Day 5 — Wiring + tests

- [ ] CV upload UI calls Docling, shows a progress bar, displays the parsed structure
- [ ] Start-Live-Copilot button creates snapshot + builds context, ready for Phase 4 to consume
- [ ] Smoke test: a known-good CV.pdf → assembler output matches expected structure (snapshot test)
- [ ] Documentation in `.planning/research/CONTEXT.md` describing the snapshot model + the "no context bleed between interviews" rule

---

## 4. Risks + mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **Docling Python sidecar bundling** | 🔴 High | Test on a fresh Mac without Python installed. Fallback: bundle a pre-warmed Docling executable via PyInstaller. |
| **CV parsing quality (PDF variability)** | 🟠 High | Test on 5+ real CVs (Gabriel's + 4 friends). Surface "parser confidence" warnings if extraction looks broken. |
| **Context bleed between offers** | 🔴 High (the FOUND-spec danger) | Snapshot is immutable, snapshot_id flows to every Phase 4 call, asserted in tests. |
| **Token budget overflow** | 🟡 Med | Truncate JD to 4k tokens, summarise CV to ~1k via deterministic bullet extraction. |

---

## 5. Acceptance criteria

- [ ] Upload a PDF → see structured CV in preview (experiences with start/end dates, skills tagged, education parsed)
- [ ] Paste a JD into a job → see sections (about / responsibilities / requirements) + extracted keywords
- [ ] Start a Live Copilot session for that job → snapshot row created in DB, context object built
- [ ] Switch to a different job, start a new Live Copilot session → new snapshot, new context — no data from the previous session leaks
- [ ] All 3 personas have written prompts
- [ ] `cargo test context::snapshot` passes (no-bleed assertion)

---

## 6. Workflow

- **Branch:** `feat/copilot-phase-3-context`, off main (independent of Phase 1/2)
- **Commits:** one per day's work, atomic
- **PR:** opened in draft Day 1
- **Tests:** Snapshot test on Day 5; manual CV upload test on Day 5
