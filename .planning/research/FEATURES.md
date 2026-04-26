# Feature Research — Interview Copilot

**Domain:** Live job interview assistant (Mac desktop overlay) — finance / tech-AI / strategy-consulting
**Researched:** 2026-04-26
**Confidence:** HIGH on competitor inventory, table stakes, anti-features. MEDIUM on differentiator viability (no competitor has fully solved long-term memory or live case coaching, so we're partly extrapolating from gap analysis).

---

## Executive summary

The "interview copilot" market exploded in 2025 around the Cluely / Final Round AI / Interview Coder triangle. Beneath the noise, the tools converge on a near-identical feature set: real-time STT, on-screen bullets, stealth from screen-share, resume + JD context, post-interview transcript. The competitive battles are almost entirely on **(1) stealth / undetectability**, **(2) coding interview quality**, and **(3) latency**. Almost everyone is single-session — no long-term memory across interviews. Almost no one specialises by domain (finance / consulting cases) beyond a question bank. Multilingual is "supported" but live FR/EN auto-switch in-session is rarely demonstrated. Live case-study coaching with hypothesis tree / MECE structure surfacing is essentially non-existent in copilots — it lives in dedicated practice tools (CasePrepared, CaseMate, MECE Academy) that are NOT live overlays.

**Gabriel's three biggest defensible angles:**
1. **Domain specialisation** (finance + AI + consulting cases, with framework templates per domain) — virtually no one does this in a live copilot.
2. **Long-term memory across past interviews** — Natively touches it via local vector search, no one operationalises it as "this answer worked for you 3 interviews ago."
3. **Live case-study coach** — the gap. Practice tools exist, live overlays don't.

**Three things to NOT build (and to write down so you don't waver):**
- Voice cloning / voice synthesis / earpiece audio (already excluded — keep it that way; explicit anti-feature).
- Mock interview simulator in v1 (deferred — Cluely / Verve / CasePrepared all do this; not your edge).
- Multi-tenant SaaS (perso first — confirms scope discipline; Cluely's 83k-user data breach in 2025 is the cautionary tale).

---

## Competitor inventory (10 tools studied)

### Tier 1 — Live overlay copilots (direct competitors)

#### 1. Final Round AI — the market leader by reach

| Dimension | What it does |
|---|---|
| Live behaviour | Listens, transcribes, generates structured answers (bullets / STAR). Coding mode included. Switches LLM (GPT-5.2, Claude Opus, Gemini 3) per question type. |
| Stealth | "Stealth mode" — but the taskbar icon is reportedly visible to proctoring software. NOT GPU-level invisible like Cluely. |
| Domain | General. Question bank covers SWE / PM / Data / Marketing / Finance / Sales / HR / Healthcare / Consulting / Mgmt. |
| Prep | CV upload, JD parsing, mock interviews, "AI Engine 3x faster" (May 2025 update). |
| Post-interview | Performance scores, speech clarity, engagement, AI improvement suggestions. |
| Pricing | $148/mo Essential, $96/mo Pro, $81/mo "God mode". The most expensive in the market. Free trial = 5 min. |
| Live trick | Bullet style + structured frameworks; opening line then bullets you riff on. |
| Issue | Steep price; mixed reviews on actual live latency; ZipRecruiter partnership shows pivot to legitimacy. |

#### 2. Cluely — the controversial one (Interview Coder rebranded)

| Dimension | What it does |
|---|---|
| Live behaviour | Transcribes, generates bullets / full responses, screenshot OCR for coding screens. |
| Stealth | **GPU-level overlay** (DirectX on Win, Metal on macOS) — renders directly on the GPU's local display output, invisible to ScreenCaptureKit / screen-share. State of the art for stealth. |
| Domain | General; pivoting to "cheat on everything" (meetings, exams, sales calls). |
| Prep | Resume / context upload. |
| Post-interview | Limited; focus is the live moment. |
| Pricing | $20/mo or $100/yr unlimited. |
| Live trick | Translucent overlay over coding env. |
| Issues | (a) **5-90 second response delays** in independent testing (BI), (b) hallucinated work experiences in BI test, (c) **83k-user data breach** in mid-2025 exposed transcripts/screenshots, (d) Truely / Validia / Proctaroo built specifically to detect Cluely. $5.3M seed → $20M total (a16z). |

#### 3. LockedIn AI — the polished alternative

| Dimension | What it does |
|---|---|
| Live behaviour | Dual-layer Copilot + Coach. Live coding split-screen. Customisable opacity. |
| Stealth | "Invisible Interview Assistant" — no Dock icon on macOS, no Windows taskbar entry, runs as background utility. Better than Final Round, claimed not as deep as Cluely's GPU hook. |
| Domain | General; supports 42+ languages with bilingual mixed-language. |
| Prep | CV + JD; pre-interview screening tools, technical quizzes. |
| Post-interview | Transcripts, embedded video stream, real-time feedback. |
| Pricing | Mid-tier. |
| Live trick | Dual Copilot (answer) + Coach (process) layers. |

#### 4. Sensei AI — the budget-friendly

| Dimension | What it does |
|---|---|
| Live behaviour | Real-time Q&A. Coding copilot included. Behavioral answer structuring. |
| Stealth | Standard overlay. |
| Domain | General; 30+ languages. |
| Prep | AI resume builder, AI story builder. |
| Post-interview | Limited. |
| Pricing | Free 15-min sessions; premium from $89/mo. |
| Live trick | Story-builder turning rambles into concise narratives. |

#### 5. Verve AI — the all-in-one "career toolbox"

| Dimension | What it does |
|---|---|
| Live behaviour | Live Interview Support, real-time transcription + question analysis. |
| Stealth | Standard. |
| Domain | General; 2,500+ real interview questions library. |
| Prep | Unlimited mock interviews with AI avatar (Jan 2025). 20+ career toolbox features. |
| Post-interview | Detailed performance reports. |
| Pricing | Forever free + paid tiers (cheap). |
| Live trick | Mock-first product; "live" is a secondary mode. |

#### 6. Parakeet AI — the multilingual specialist

| Dimension | What it does |
|---|---|
| Live behaviour | Real-time bullets / answers; behavioral structuring. |
| Stealth | "Undetectable integration" (claim). Privacy: secure, unrecorded, deleted after use. |
| Domain | General; **52 languages** supported — strongest multilingual claim. |
| Prep | Resume context. |
| Post-interview | Limited. |
| Pricing | Lower-mid. |
| Live trick | Concise behavioral narrative restructuring. |

#### 7. Pickle (Glass) — the open-source mover

| Dimension | What it does |
|---|---|
| Live behaviour | Real-time meeting/interview audio listen, auto notes + summaries, contextual answers. |
| Stealth | Stealth design — no screen recording, no screenshots, no Dock. |
| Domain | General meeting assistant; interview is one use case among many. |
| Prep | Light. |
| Post-interview | Auto meeting notes. |
| Pricing | Free (open source) — also has Pickle.com paid AI clone product (separate). |
| Live trick | "Digital brain extension" framing — long-term memory is part of Pickle's roadmap (not yet shipped). |
| Note | Glass is open-source under Pickle umbrella; Pickle.com is the paid AI-clone-for-video-calls product (different beast). |

### Tier 2 — Open source you can read

#### 8. Natively — most complete OSS

> **Stack:** Electron + Rust. Latency claim: <500ms end-to-end. License: AGPL-3.0.
> **Features (per their COMPARISON.md and README):** real-time transcription, undetectable stealth (hides from Dock, disguises process names, syncs state across windows), **local RAG memory of past meetings via local vector search**, separate system audio + mic capture, screenshot OCR, custom persona modes (Tech / Sales / Recruiting), reference file upload (PDF), BYOK (any LLM), local data, full management dashboard with Markdown / JSON / Text export.
> **Closest existing thing to what Gabriel wants.** Worth cloning ideas from. AGPL means you can study it but can't statically link without going AGPL yourself.

#### 9. Pluely — the lightweight Tauri OSS

> **Stack:** Tauri (Rust + web). 10 MB bundle vs Cluely's 270 MB. Claims <100ms launch, 50% less CPU/RAM.
> **Features:** undetectable in video calls / screen shares / recordings, runs entirely locally, zero telemetry, all chat history on machine, Linux support.
> **Less RAG / memory than Natively, but the Tauri stack is exactly Gabriel's planned stack — read the source for stealth + audio capture patterns.**

#### 10. Other notable OSS to skim

- `innovatorved/realtime-interview-copilot` — Deepgram + LLM web PWA. Reference impl for Deepgram streaming.
- `hariiprasad/interviewcopilot` — Next.js + Azure Speech + Gemini/OpenAI.
- `interview-copilot/Interview-Copilot` — GPT-based, simple.
- `elias-soykat/interview-copilot` — desktop, "screen-share safe."
- `seven7-AI/AI-real-time-conversation-copilot` — generic real-time conversation copilot, useful patterns.

### Tier 3 — Adjacent (NOT live overlays, but instructive)

- **Yoodli** ($0–$20/mo) — practice / coaching, post-session analytics on pace, filler words, posture. NO live mode. **Use case overlap = post-interview debrief.**
- **CasePrepared / CaseMate / MECE Academy / Prepmatter / Soreno** — AI case-interview practice (McKinsey / BCG / Bain). Voice-based mock cases with rubric scoring on structure / hypothesis / MECE / math / synthesis / communication. **No live overlay.** This is the gap Gabriel can fill on cases.
- **Superday AI** — IB-specific question bank (DCF, LBO, M&A, capital markets) trained on real questions. **Domain-specialised question bank is rare and valuable.**
- **Interviewbrowser, Interview Solver, Shadecoder, Linkjob, Ophy, ScreenApp, Stealthinterview, Offerin** — long tail of stealth-focused tools, mostly coding-focused, all converge on the same overlay + STT + LLM stack. Differentiation is mostly marketing.

---

## Cross-tool feature matrix

| Feature | Final Round | Cluely | LockedIn | Sensei | Verve | Parakeet | Natively (OSS) | Pluely (OSS) |
|---|---|---|---|---|---|---|---|---|
| Real-time STT | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Mic + system audio split | Implicit | Yes | Yes | Yes | Yes | Yes | **Yes (explicit)** | Yes |
| Diarization (who's talking) | Auto | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Live bullet generation | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| STAR / framework templates | STAR | Generic | STAR | Story | STAR | Behavioral | Persona modes | Generic |
| Coding live help | Yes | Yes (top) | Yes (split-screen) | Yes | Yes | No-emph | Yes | Yes |
| GPU-level stealth | No (taskbar visible) | **Yes** | Partial (no Dock) | Partial | Partial | Claim | Yes | Yes |
| Resume + JD context | Yes | Yes | Yes | Yes | Yes | Yes | Yes (file ref) | Yes |
| Company research | Yes | Limited | Yes | No | Yes | No | Manual | No |
| Mock interview | Yes | No | Limited | No | **Yes (avatar)** | No | No | No |
| Multilingual | 50+ | 50+ / 12 personalised | 42+ EN/ES bilingual | 30+ | 50+ | **52** | Any (BYOK) | Any (BYOK) |
| FR/EN auto-switch in-session | Unverified | Unverified | Unverified | Unverified | Unverified | Unverified | Unverified | Unverified |
| Post-interview transcript | Yes | Yes | Yes | Limited | Yes | Limited | **Yes (export)** | Local |
| Post-interview AI debrief | Yes | Limited | Yes | No | **Yes (detailed)** | Limited | Manual | No |
| Filler-word / pace analytics | Limited | No | Yes | No | Yes (Yoodli-like) | No | No | No |
| **Long-term memory across interviews** | No | No | No | No | No | No | **Partial (local vector search)** | No |
| Domain-specific question bank | General | None | General | None | General (2.5k) | None | Persona | None |
| Domain RAG (cases / DCF / AI prod) | No | No | No | No | No | No | Reference files | No |
| **Live case-study coach (hypothesis tree)** | **No** | **No** | **No** | **No** | **No** | **No** | **No** | **No** |

**Reading:** every column above the bold line is table stakes. Everything bold is an open gap → Gabriel's differentiation surface.

---

## Feature Landscape

### Table Stakes (must-have, otherwise it doesn't compete)

| Feature | Why expected | Complexity | Notes |
|---|---|---|---|
| Real-time STT (mic + system audio loopback) | Universal across all 10 competitors. No copilot exists without this. | **L** | Deepgram streaming covers it; system audio via ScreenCaptureKit (macOS 13+) or BlackHole fallback. Maps to LIVE-01, LIVE-02. |
| Speaker diarization (Gabriel vs recruiter) | Every tool has it. Without it, you can't differentiate "the question" from "your answer." | **M** | Deepgram native diarization. Reliable enough at 2-speaker scenarios. Maps to LIVE-01. |
| Question detection (when did the recruiter finish asking) | Universal. Triggers the bullet generation. | **M** | Silence + speaker turn + heuristics. Override hotkey (LIVE-03) is THE reliability pattern — every serious tool has it. |
| Live bullet generation in 2-5s | Universal expectation. Cluely's 5-90s delay is its biggest weakness; competitors who beat it win. | **L** | Claude Sonnet streaming (TTFT < 1s). Maps to LIVE-04. |
| On-screen overlay, always-on-top | Universal. The visual delivery channel. | **M** | Tauri WebView w/ NSWindow level + ignoreCursorEvents. Maps to LIVE-05. |
| Stealth from screen-share (window-level exclusion) | Every competitor markets this hard. **Gating factor for trust.** | **L** | `NSWindow.sharingType = .none` works on macOS 13/14. **Broken on macOS 15+ ScreenCaptureKit.** Cluely-style GPU-level overlay is the only known reliable approach on 15+. See PITFALLS.md. Maps to LIVE-05, LIVE-06. |
| CV upload + structured extraction | Universal. Personalisation foundation. | **S** | PDF parse → LLM structured extract (experience / skills / achievements). Maps to PREP-01. |
| JD paste + parsing | Universal. The "what they want" half of the equation. | **S** | Plain text → LLM parse → structured fields. Maps to PREP-02. |
| Resume-anchored answers (no hallucinated experience) | Cluely's BI test failure (inventing experiences) is a market scar. **Trust requirement.** | **M** | Strict prompt + retrieval over CV facts only. Maps to LIVE-04 + the CV-hallucination constraint in PROJECT.md. |
| Behavioral STAR / framework templates | Universal. Every tool offers STAR for "tell me about a time…" | **S** | Prompt templates per question type. |
| Real-time transcript visible during session | Universal. User needs to verify what the system heard. | **S** | Streamed text in overlay panel. |
| Post-interview transcript saved | Universal. Foundation for everything post-session. | **S** | SQLite write + metadata. Maps to MEM-01. |
| Multilingual support (EN minimum) | Universal. EN is the floor. | **S** | Deepgram + Claude both cover EN+FR natively. |
| "Tell me about yourself" pitch generator | Universal. The single most-asked question across all interview types. | **S** | Present-Past-Future framework template. Maps to COACH-02. |
| Post-interview AI debrief (basic) | Now table stakes. Final Round, LockedIn, Verve, Yoodli all ship it. | **M** | LLM analyses transcript → strengths / weaknesses / suggestions. Maps to MEM-02. |
| Hotkey controls (override trigger, hide, regenerate) | Universal — every reliable tool has them. | **S** | Tauri global shortcuts. Maps to LIVE-03. |

**Verdict:** if any of these are missing in v1, the product feels broken to anyone who's used a competitor.

### Differentiators (Gabriel's edge)

| Feature | Value proposition | Complexity | Notes |
|---|---|---|---|
| **Live FR/EN auto-switch in-session** | Genuine bilingual interviews (rare in tech-AI in Paris/EU) often mix languages — every competitor "supports" multiple languages but verified live mid-session switch is unproven. | **M** | Deepgram per-segment language ID + prompt language signalling to Claude. Maps to LIVE-02. **Verifiable killer feature for Gabriel's exact use case.** |
| **Domain-specialised personae + framework templates** (Finance / Tech-AI / Consulting) | No live copilot truly specialises. Superday does IB but is prep-only. Live + domain-specialised + framework-aware is open territory. | **M** | Per-domain system prompts + framework cheatsheets (DCF walk-through, MECE issue tree, AI tech deep-dive structure). Maps to DOMAIN-01, DOMAIN-02, DOMAIN-04. |
| **Domain RAG over real cases** (M&A precedents, AI product cases, consulting case bank) | Lets Gabriel cite "what a good answer to this exact case looks like" not just generic STAR. | **L** | LanceDB / Qdrant local + curated corpus per domain. Maps to DOMAIN-03. |
| **Live case-study coach (hypothesis tree / MECE in real time)** | **The single biggest gap in the market.** Practice tools exist (CasePrepared, CaseMate, MECE Academy). Live overlays do not. | **L** | State machine: detect "case" mode → suggest issue-tree branches → propose hypotheses → flag math errors → suggest MECE re-cuts. Maps to COACH-01. |
| **Long-term memory across past interviews** (transcript-indexed RAG) | Only Natively does this and barely. "Last time you got this question, you said X. The recruiter feedback was Y. Try framing it as Z." is a unique compounding moat. | **L** | Embedding pipeline on transcripts → vector store → retrieval at question-detection time. Maps to MEM-03, MEM-04, MEM-05. |
| **Snapshot-per-offer architecture** (1 context per JD) | Most tools have a single global profile. The reality is each offer is its own world (company, JD, process, recruiter style). | **M** | Workspace concept — each interview = one snapshot {CV, JD, brief, transcripts, debriefs}. Maps to PREP-04. |
| **Tier-1 reliability (failover STT + LLM + local degraded mode)** | Cluely's 5-90s lag and Final Round's mid-interview failures are well-documented. **"Always works" is itself a differentiator.** | **L** | Deepgram → AssemblyAI failover; Claude → GPT failover; Whisper.cpp + Ollama local fallback. Maps to LIVE-07. |
| **Post-interview pattern auto-extraction** (tics / fillers / hedge words / answer length) | Yoodli does this but in practice mode only. Folding it into post-live debrief = unique. | **M** | NLP pass on transcripts. Maps to MEM-05. |
| **Coaching mode, not mimicry** (best-practice bullets, never voice-clone) | Decision is already made (PROJECT.md). It's also a positioning differentiator vs Pickle's avatar route. Mention in onboarding copy. | **S** | Prompt design + UI copy. Already decided. |
| **Privacy-first local-only persistence** (transcripts never leave) | Cluely 83k-user breach is the market scar. "Your interview transcripts never reach our servers" is now a real value prop. | **S** | SQLite + local vector store. Architecture choice. |

### Anti-features (deliberately NOT building, with reasoning)

| Anti-feature | Why someone might want it | Why we reject | Better alternative |
|---|---|---|---|
| **Voice cloning / earpiece audio synthesis** | "Read me the answer in my own voice." Pickle is going this direction. | Crosses the line from "coaching" to "deception." Already excluded by Gabriel's "coaching not mimicry" decision. Strong philosophical anchor. Also a deepfake liability risk if leaked. | Visual bullets only. The user does the talking — that's the point. |
| **Mock-interview simulator in v1** | Verve and Final Round push this. Practice is genuinely useful. | Different problem space (simulation vs live). v1 must nail the live moment. Defer to v2 — Gabriel can simulate by having a friend do video calls. | Use real interviews + post-debrief loop instead. Defer to v2. |
| **Slide / deck generation** | Some users prep with decks. | Out of scope. Coaching of presentation = pitch perso + live case, not deck creation. | Pitch + case coaching cover this for the actual interview moment. |
| **Mobile / phone companion app** | Some screening interviews are by phone with no laptop. | Mac desktop covers all visios via system audio loopback. Phone interviews can use Mac speakerphone or split capture. Mobile = double the engineering for a thin slice. | Mac speakerphone routing for the rare phone-only interview. |
| **Browser extension** | Lower friction than installing a desktop app. | System audio capture covers Zoom/Teams/Meet without touching the browser. Browser extensions can't do reliable stealth from screen-share (Cluely's whole point). | Native app is the right surface. |
| **Multi-tenant SaaS / auth / billing** | Future business model. | Cluely's data breach (83k users, transcripts + screenshots leaked) is what happens when you go SaaS too early. Keeping it perso = drastically simpler scope, no auth, no billing, no breach surface. | Refactor later if validated. |
| **LinkedIn OAuth profile import** | Auto-fill candidate profile. | CV upload is enough; the OAuth scope isn't worth the auth flow + privacy review. | Manual profile + CV upload. |
| **Calendar sync / interview reminders** | Convenience. | Not the bottleneck. Gabriel knows when his interviews are. | Manual launch (current decision). |
| **Live notes / annotation surface during interview** | Take notes while listening. | Cognitive load conflict — Gabriel needs to focus on speaking, not typing. Auto-debrief covers post-session. | Auto-debrief handles all post-session annotation. |
| **AI clone avatar replacing user on call (Pickle.com style)** | Some products do this. | This is fraud territory, not coaching. Hard pass philosophically and legally. | None. Not a thing we ever consider. |
| **Mimicry of Gabriel's vocal tics / verbal style in bullets** | Make bullets sound like the user already speaks. | Counter to coaching mission — the goal is **progression**. Mimicry locks in current habits. (PROJECT.md decision.) | Best-practice bullets; debrief identifies gaps user-vs-bullet. |
| **Always-listening "ambient" mode outside interview sessions** | Pickle / Glass aim here as life logging. | Massive privacy / battery / scope creep. Sessions are bounded events. | User starts a session manually. |
| **Public question-bank contribution / community features** | Crowdsourced question library. | Multi-user feature in a single-user tool. Out of scope. | Curated banks per domain; Gabriel can add manually. |
| **Real-time face / posture / eye-tracking feedback** | Yoodli does this in practice mode. | Useless during live — Gabriel can't act on body-language feedback while answering live. Save for debrief. Also requires camera access, more permissions. | Post-session debrief if ever wanted. |

### Domain-specific feature call-outs

#### Finance (IB / corp dev / banking)

| Feature | Notes |
|---|---|
| DCF walkthrough framework template | The single most-asked finance question (~third most frequent per Superday). Must have a templated structure: revenue projection → FCF → discount → TV → sensitivity. |
| LBO / M&A precedent RAG | Curated examples retrievable at query time. |
| Comparable-companies & precedent-transactions framework | Prompted scaffolding when "valuation" detected. |
| Capital structure / accounting flow templates | Income statement → balance sheet → cash flow integration drilling. |
| Sector-specific quirks (FIG, restructuring, capital markets) | Optional persona overlays. |

#### Tech (AI / ML)

| Feature | Notes |
|---|---|
| Technical deep-dive structure | Problem framing → constraints → approach → tradeoffs → metrics → failure modes. |
| AI product case framework | User → use case → model choice → data → eval → guardrails → cost. |
| System design templates | Standard but with AI-system flavour (training pipeline, inference latency, drift, eval harness). |
| Coding-mode (LeetCode-ish) | Less of a priority for senior AI roles — algorithmic interviews aren't typically how AI/ML seniors are screened. Lower priority than Final Round / Cluely target audience. |

#### Strategy / consulting cases

| Feature | Notes |
|---|---|
| Issue tree / hypothesis tree live overlay | The big differentiator. Surface 2-3 candidate branches when a case opens. |
| MECE checking | Flag overlap / gaps in user's structure. |
| Math sanity check | Quick mental-math validation (Gabriel says X bn × Y% — is that consistent?). |
| Case archetypes (profitability, market entry, M&A, ops) | Auto-detect archetype, suggest relevant frame. |
| McKinsey vs BCG vs Bain style differentiator | McKinsey = interviewer-led structured / BCG = candidate-led conversational / Bain = practical impact. Persona switch per firm. |
| Synthesis prompt at end of case | "Time to wrap — your top 3 recommendations + ask for next step?" |

---

## Feature Dependencies

```
Foundation
─────────
[Audio capture mic+sys (LIVE-01)]
    └── enables ──> [STT streaming (LIVE-02)]
                        ├── enables ──> [Diarization]
                        │                   └── enables ──> [Question detection (LIVE-03)]
                        │                                       └── enables ──> [Live bullet gen (LIVE-04)]
                        └── enables ──> [Real-time transcript]
                                            └── enables ──> [Transcript saved (MEM-01)]

Personalisation
───────────────
[CV extract (PREP-01)]   ┐
[JD parse (PREP-02)]     ├──> required by ──> [Resume-anchored bullets (LIVE-04)]
                         │                        └──> enables ──> [Pitch perso (COACH-02)]
[Snapshot per offer (PREP-04)]  ─ scopes all of the above per interview

Stealth / UX
────────────
[Overlay (LIVE-05)] ─ requires ─> [Window-level exclusion + GPU stealth research (LIVE-06)]
[Hotkeys] ─ enhances ─> [Question detection + override]

Post-interview
──────────────
[Transcript (MEM-01)]
    ├── enables ──> [Auto debrief (MEM-02)]
    │                  └── enables ──> [Pattern extraction (MEM-05)]
    ├── enables ──> [Long-term memory RAG (MEM-03)]
    │                  └── feeds back into ──> [Live bullet gen (LIVE-04)]
    └── enables ──> [Feedback capture (MEM-04)]
                       └── feeds back into ──> [Long-term memory weighting]

Domain
──────
[Domain personae (DOMAIN-02)] ─ enhances ─> [Live bullet gen]
[Domain question bank (DOMAIN-01)] ─ enhances ─> [Brief de prep (PREP-03)]
[Domain RAG (DOMAIN-03)] ─ enhances ─> [Live bullet gen + Live case coach]
[Framework templates (DOMAIN-04)] ─ enhances ─> [Live bullet gen]

Coaching
────────
[Live case coach (COACH-01)] ─ requires ─> [Question/case detection + Domain RAG + Framework templates]
[Pitch perso (COACH-02)] ─ requires ─> [CV + JD + brief]

Reliability
───────────
[Failover STT + LLM (LIVE-07)] ─ wraps ─> [STT, LLM] with retry + degraded local fallback
                                              ↑
                                              └─ requires ─ [Whisper.cpp + Ollama setup]
```

### Critical path observations

- **LIVE-01 (audio) is the keystone.** If it's flaky, nothing downstream works. Tier-1 engineering investment justified.
- **LIVE-04 depends on essentially everything.** It's where CV + JD + domain + question detection + transcripts + RAG all converge. Build the upstream first; don't try to build LIVE-04 until you have a clean pipeline above it.
- **MEM-03 (long-term memory) requires MEM-01 (transcripts) operational across multiple sessions.** Won't deliver value until interview #2 or #3. Don't ship it as an empty feature.
- **COACH-01 (live case coach) requires DOMAIN-03 (RAG) + DOMAIN-04 (framework templates) + accurate question/case detection.** It is the most upstream-dependent feature in the system. Schedule late.
- **Stealth (LIVE-05/06) is largely orthogonal** to the rest of the pipeline. Can be built in parallel — and should be, because it's the highest-risk technical research item (macOS 15+ broke `NSWindow.sharingType`).
- **DOMAIN features stack:** DOMAIN-01 (banks) is a content task; DOMAIN-02 (personae) is a prompt task; DOMAIN-03 (RAG) is an infra task; DOMAIN-04 (templates) is a prompt+UX task. They can be developed independently and merged into LIVE-04.
- **Feedback loop (MEM-04 → MEM-03):** the unique value compounds with usage. The first interview is just data; the third is leverage. Frame this in onboarding so Gabriel doesn't churn before the loop kicks in.

---

## MVP Definition

### v1 (Launch — first real interview)

These are gated by the actual goal in PROJECT.md: "during a real live interview, the app shows ≤5s bullets of higher quality than Gabriel produces under stress."

**Live mode (cœur):**
- LIVE-01: Audio capture mic + system, with diarization
- LIVE-02: Streaming STT FR+EN with mid-session switch
- LIVE-03: Question detection + override hotkey
- LIVE-04: Live bullet generation (3-5 points, framework-adapted) ≤5s
- LIVE-05: Always-on-top overlay, window-level exclusion
- LIVE-06: Screen-share detection + masking (paranoid mode) — **OR** documented degradation if macOS 15+ blocks
- LIVE-07: Failover STT + LLM + local degraded mode

**Prep:**
- PREP-01: CV upload + extraction
- PREP-02: JD paste + parsing
- PREP-04: Snapshot-per-offer

**Domain (light):**
- DOMAIN-02: Personae per domain (3 personae, prompt-only — no RAG yet)
- DOMAIN-04: 3-5 framework templates per domain

**Memory (light):**
- MEM-01: Transcript saved
- MEM-02: Basic AI debrief

**Coaching (light):**
- COACH-02: Pitch perso "tell me about yourself" generator

> Why these and not more? Without LIVE-01..07 working reliably, nothing else matters. PREP-01/02/04 + DOMAIN-02/04 are the minimum context to make LIVE-04 specific instead of generic. MEM-01/02 is the minimum closure loop. COACH-02 is the most-asked question — high ROI for low complexity.

### v1.x (Add after first 2-3 real interviews)

- PREP-03: Auto deep-prep brief (web research + likely questions)
- DOMAIN-01: Curated question banks
- DOMAIN-03: Domain RAG (M&A cases, AI product cases, consulting cases)
- MEM-03: Long-term memory across interviews — **needs ≥3 prior transcripts to provide value**
- MEM-04: Feedback signal capture
- MEM-05: Auto pattern extraction (filler words, length, tics)

### v2+ (Future)

- COACH-01: Live case-study coach with hypothesis tree (high complexity, requires solid DOMAIN-03 first)
- Mock interview / simulation mode
- Cross-language style coaching ("you sound natural in EN, formal in FR — here's why")
- Voice analytics if ever needed (probably not)
- Calendar / scheduling integrations
- Interview prep companion (study mode between interviews using past patterns)

---

## Feature Prioritization Matrix

| Feature | User value | Implementation cost | Priority |
|---|---|---|---|
| LIVE-01 audio capture mic+sys | HIGH | HIGH | P1 |
| LIVE-02 streaming STT + FR/EN switch | HIGH | MEDIUM | P1 |
| LIVE-03 question detection + override | HIGH | MEDIUM | P1 |
| LIVE-04 live bullet generation 2-5s | HIGH | MEDIUM | P1 |
| LIVE-05 overlay + window-level exclusion | HIGH | MEDIUM | P1 |
| LIVE-06 screen-share detection + mask | HIGH | HIGH (macOS 15+ research) | P1 |
| LIVE-07 failover STT + LLM + local | HIGH | HIGH | P1 |
| PREP-01 CV extract | HIGH | LOW | P1 |
| PREP-02 JD parse | HIGH | LOW | P1 |
| PREP-04 snapshot-per-offer | HIGH | LOW | P1 |
| DOMAIN-02 personae per domain | HIGH | LOW | P1 |
| DOMAIN-04 framework templates | HIGH | LOW | P1 |
| MEM-01 transcript saved | HIGH | LOW | P1 |
| MEM-02 basic debrief | MEDIUM | LOW | P1 |
| COACH-02 pitch perso generator | HIGH | LOW | P1 |
| PREP-03 auto deep-prep brief (web research) | MEDIUM | MEDIUM | P2 |
| DOMAIN-01 question banks | MEDIUM | MEDIUM | P2 |
| DOMAIN-03 domain RAG | HIGH | HIGH | P2 |
| MEM-03 long-term memory across interviews | HIGH | HIGH | P2 |
| MEM-04 feedback signal | MEDIUM | LOW | P2 |
| MEM-05 pattern extraction | MEDIUM | MEDIUM | P2 |
| COACH-01 live case coach | HIGH | HIGH | P3 |

---

## Competitor Feature Analysis (final synthesis)

| Feature | Cluely | Final Round | LockedIn | Natively (OSS) | **Our approach** |
|---|---|---|---|---|---|
| Stealth | GPU-level overlay (best in class on ≤14) | Taskbar visible (weak) | No-Dock background utility | Hide Dock + disguise process | Native window-level exclusion + GPU-level investigation for macOS 15+; honest degraded mode if not solvable. |
| Live latency | 5-90s (poor) | "3x faster" claim | Fast | <500ms claimed | ≤5s hard target; ≤3s soft target. Streaming Claude + chunked UI render. |
| Domain specialisation | None | Generic question bank | Generic | Persona modes (Tech/Sales/Recruiting) | **Three personae (Finance / AI / Consulting) with framework templates AND domain RAG.** Real edge. |
| Multilingual | 50+ claim | 50+ claim | 42+ EN/ES bilingual | BYOK any | **Verified live FR/EN auto-switch in-session** as headline differentiator. |
| Long-term memory | None | None | None | Local vector search | **Indexed RAG over past transcripts + recruiter feedback signals.** Compounding moat. |
| Live case coach | None | None | None | None | **Issue tree + hypothesis suggestion + MECE check overlay** — open territory, schedule v2. |
| Privacy | Cloud + 83k breach | Cloud | Cloud | Local + AGPL | Local-only persistence, zero-retention contracted with Deepgram + Anthropic. |
| Mimicry | Sometimes hallucinates user CV | Resume-anchored | Resume-anchored | Reference files | **Strict CV grounding — never invent a fact about the candidate.** |
| Stack | Proprietary | Proprietary | Proprietary | Electron + Rust | Tauri + Rust (smaller bundle, native ScreenCaptureKit access). |
| Mock simulator | None | Yes | Limited | None | **Out of scope v1.** Real interviews + debrief loop instead. |
| Voice clone / avatar | No | No | No | No | **Hard NO. Coaching, not mimicry.** |

---

## Sources

### Direct competitor research
- [Final Round AI](https://www.finalroundai.com/) — flagship product page
- [Final Round AI in-depth review (skywork.ai, 2025)](https://skywork.ai/skypage/en/Final-Round-AI-In-Depth-Review-(2025):-My-Hands-On-Test-of-the-AI-Interview-Copilot/1974875358924304384)
- [Sensei AI review of Final Round](https://www.senseicopilot.com/blog/finalround-ai-review)
- [Final Round AI 2026 review (jobcopilot)](https://jobcopilot.com/final-round-ai-review/)
- [Cluely (Wikipedia)](https://en.wikipedia.org/wiki/Cluely)
- [Cluely review (analyticsvidhya)](https://www.analyticsvidhya.com/blog/2025/04/cluely-ai/)
- [Cluely review (eesel)](https://www.eesel.ai/blog/cluely-reviews)
- [Cluely review (linkjob)](https://www.linkjob.ai/hub/cluely-review/)
- [Cluely $5.3M seed (TechCrunch)](https://techcrunch.com/2025/04/21/columbia-student-suspended-over-interview-cheating-tool-raises-5-3m-to-cheat-on-everything/)
- [Cluely funding (Fortune)](https://fortune.com/article/cluely-ai-cheating-columbia-student-seed-funding/)
- [LockedIn vs Sensei comparison](https://www.lockedinai.com/blog/sensei-ai-vs-lockedinai-comprehensive-review)
- [Sensei comparison review](https://www.senseicopilot.com/blog/sensei-ai-vs-lockedin-ai)
- [LockedIn AI desktop app](https://www.lockedinai.com/desktop-app)
- [Verve AI](https://www.vervecopilot.com)
- [Verve AI 2025 deep dive](https://skywork.ai/skypage/en/Verve-AI-Copilot-An-In-Depth-2025-Review/1976128357533413376)
- [Yoodli pricing](https://yoodli.ai/pricing)
- [Yoodli interview prep](https://yoodli.ai/use-cases/interview-preparation)
- [Parakeet AI](https://www.parakeet-ai.com/)
- [Parakeet comparison (best AI assistants)](https://blog.parakeet-ai.com/best-ai-interview-assistants-comparison/)
- [Pickle company on LinkedIn](https://www.linkedin.com/company/get-pickle-ai)
- [Glass by Pickle GitHub](https://github.com/pickle-com/glass)
- [Glass viral coverage (aibase)](https://www.aibase.com/news/19506)
- [Cluely vs Glass analysis (hyperlush)](https://hyperlush.com/cluely-vs-glass/)
- [Pickle OS / memory vision](https://www.adwaitx.com/pickle-os-launch-memory-ai-operating-system/)

### Open-source projects
- [Natively](https://github.com/Natively-AI-assistant/natively-cluely-ai-assistant) — Electron + Rust, AGPL-3.0
- [Natively COMPARISON.md](https://github.com/evinjohnn/natively-cluely-ai-assistant/blob/main/COMPARISON.md)
- [Pluely](https://github.com/iamsrikanthnani/pluely) — Tauri, ~10MB, OSS
- [Realtime Interview Copilot (innovatorved)](https://github.com/innovatorved/realtime-interview-copilot) — Deepgram + LLM
- [Interview Copilot (hariiprasad)](https://github.com/hariiprasad/interviewcopilot) — Next.js + Azure Speech + Gemini/OpenAI
- [Interview Copilot (interview-copilot org)](https://github.com/interview-copilot/Interview-Copilot)
- [Interview Copilot (antonvice)](https://github.com/antonvice/Interview-Copilot)
- [Copilot Realtime Interviewer (carlitose)](https://github.com/carlitose/copilot_real_time_interview)
- [Interview Copilot (elias-soykat)](https://github.com/elias-soykat/interview-copilot)
- [AI real-time conversation copilot (seven7)](https://github.com/seven7-AI/AI-real-time-conversation-copilot)

### Domain-specific (consulting cases / finance)
- [Soreno consulting case AI](https://www.soreno.ai/consulting)
- [MECE Academy](https://mece.academy/)
- [CasePrepared](https://www.caseprepared.com/interviews)
- [CaseMate AI](https://www.casemateai.live/landing)
- [Prepmatter](https://prepmatter.com/)
- [MyConsultingOffer hypothesis tree](https://www.myconsultingoffer.org/case-study-interview-prep/hypothesis-tree/)
- [MyConsultingOffer issue tree](https://www.myconsultingoffer.org/case-study-interview-prep/issue-tree/)
- [Sensei AI: Bain vs BCG vs McKinsey differences](https://www.senseicopilot.com/blog/bain-vs-bcg-vs-mckinsey-interview-differences-explained)
- [Superday AI (IB-specific)](https://www.superdayai.com/features/interview-copilot)
- [Verve AI: best for IB](https://www.vervecopilot.com/hot-blogs/ai-copilot-investment-banking)
- [LockedIn finance playbook](https://www.lockedinai.com/blog/finance-interview-playbook-2026-questions-answers-frameworks)

### Stealth / detection / macOS
- [Tauri issue: macOS 15+ ScreenCaptureKit ignores setContentProtection](https://github.com/tauri-apps/tauri/issues/14200)
- [Apple developer forums: NSWindow on macOS 15.4+](https://developer.apple.com/forums/thread/792152)
- [How interview cheating tools hide from Zoom (Adam Svoboda)](https://adamsvoboda.net/how-interview-cheating-tools-hide-from-zoom/)
- [Building a kind-of invisible Mac app (Pierce Freeman)](https://pierce.dev/notes/building-a-kind-of-invisible-mac-app)
- [Truely / anti-Cluely (Columbia Spectator)](https://www.columbiaspectator.com/news/2025/07/28/the-anti-cluely-columbia-students-launch-truely-new-ai-detection-software-challenging-interview-coder/)
- [Detection startups race (TechCrunch)](https://techcrunch.com/2025/04/29/startups-launch-products-to-catch-people-using-ai-cheating-app-cluely/)
- [State of cheating in interviews 2026 (Fabric)](https://www.fabrichq.ai/blogs/state-of-cheating-in-interviews-in-2026-tools-trends-and-prevention)
- [Eye-tracking detection in virtual interviews (Sensei AI)](https://www.senseicopilot.com/blog/how-companies-use-eye-tracking-in-virtual-interviews)
- [Speaker diarization 2025 guide (Shadecoder)](https://www.shadecoder.com/topics/speaker-diarization-a-comprehensive-guide-for-2025)

### Audio / system capture
- [BlackHole macOS loopback driver](https://github.com/existentialaudio/blackhole)
- [How to capture Mac system audio for free (HowToGeek)](https://www.howtogeek.com/how-to-capture-mac-system-audio-for-free-and-what-you-can-do-with-it/)

### "Tell me about yourself" generators
- [Interview Solver TMAY tool](https://interviewsolver.com/tools/tell-me-about-yourself)
- [HyperWrite elevator pitch generator](https://www.hyperwriteai.com/aitools/job-elevator-pitch-generator)

### Comparative review compendia
- [9 Best AI Interview Assistant Tools 2025 (favtutor)](https://favtutor.com/articles/best-ai-interview-assistant-tools-for-job-seekers/)
- [10 Best AI Interview Helpers 2026 (Interview Sidekick)](https://interviewsidekick.com/blog/ai-interview-helpers)
- [10 Best AI Interview Copilot Tools 2026 (DEV)](https://dev.to/finalroundai/the-10-best-interview-copilot-tools-for-2026-4a8j)
- [Best AI Interview Assistants 2025 (Sensei)](https://www.senseicopilot.com/blog/top-ai-interview-tools-2025)
- [10 Best AI Interview Assistants 2026 (ScreenApp)](https://screenapp.io/blog/best-ai-interview-assistants-2025)
- [Most discreet interview copilot review (Verve)](https://www.vervecopilot.com/blog/most-undetectable-interview-copilot)

---

*Feature research for: live interview copilot (Mac desktop, FR/EN, finance / tech-AI / consulting)*
*Researched: 2026-04-26*
