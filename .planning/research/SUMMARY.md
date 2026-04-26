# Project Research Summary — Interview Copilot

**Project:** Interview Copilot (personal Mac stealth overlay for live interviews)
**Domain:** Real-time STT + LLM bullet generation, FR/EN, finance / tech-AI / strategy-consulting
**Researched:** 2026-04-26
**Confidence:** HIGH on stack, features, and pitfalls; MEDIUM on stealth (Apple closed the standard escape hatch in macOS 15+)

---

## Executive Summary

- **macOS 15+ broke the stealth model.** `NSWindow.sharingType = .none` is officially ignored by ScreenCaptureKit on Sequoia, which is what Zoom/Teams/Meet use. This **invalidates the current Key Decision in PROJECT.md** (LIVE-05). The product must be rearchitected around **screen-share detection + masking + second-display routing**, not capture exclusion. **A Phase 0 spike on Gabriel's actual macOS version is non-negotiable** — if validation fails, the entire UX shape changes.
- **The 2026 stack converges cleanly:** Tauri 2.10 + React/TS + Swift sidecar (ScreenCaptureKit) → Deepgram Nova-3 Multilingual (only mainstream STT with single-stream FR↔EN code-switching) → Claude Sonnet 4.5 (90% prompt-cache discount on the CV+JD context reused every turn) → LanceDB embedded vector store → AssemblyAI / GPT-5 / Whisper.cpp + Ollama as failover layers. Estimated runtime cost ~$0.66/hour live — well under the $1-3 budget.
- **The differentiation surface is real and defensible.** No live-overlay competitor today does (a) genuine FR↔EN auto-switch in-session, (b) domain-specialised personae + framework templates (DCF/MECE/AI deep-dive) with domain RAG, (c) long-term memory across past interviews, or (d) a live case-study coach with hypothesis-tree surfacing. Gabriel can credibly own the union of all four.
- **Three other show-stoppers must be designed in from day 1:** zero-tolerance hallucination of CV facts (citation-required mode + structured CV ingestion + validator), failover that doesn't actually fail over (shadow-mode probing, cross-cloud vendor diversity, pre-flight checks), recording-without-consent legal exposure (France Article 226-1 = 1 year + €45k; default to transcripts-only with per-session consent prompt).
- **Hot-path latency budget is tight but achievable: 2.5-3.5s realistic floor, 5s hard ceiling.** Channel-of-origin diarization (mic = Gabriel, system = recruiter) replaces ML diarization for reliability. SQLite/RAG/embeddings stay strictly off the hot path. Streaming bullets must be rAF-batched, not per-token `setState`.

---

## Stack Decisions

| Layer | Primary | Failover / Local | Rationale |
|---|---|---|---|
| Desktop shell | Tauri 2.10 (Rust + React/TS + Vite 6) | — | 10MB bundle vs Electron's 100MB+; native Rust → ScreenCaptureKit; used by Pluely/Natively/OpenCluely. Pivot to native SwiftUI only if stealth phase blocks. |
| Native macOS bridge | Swift sidecar binary (Tauri sidecar via stdio) | `screencapturekit-rs` 0.3.x as fallback | Apple SDK surface (SCStream, AppKit windowing, CGS) much cleaner from Swift than from `objc2`; battle-tested pattern. |
| Audio capture | ScreenCaptureKit (`SCStreamConfiguration.capturesAudio = true`, macOS 13+) for system audio + AVCaptureSession for mic | BlackHole 2ch as last-resort fallback | Avoid BlackHole as primary — kernel extension breaks across macOS updates. Channel-of-origin tagging by design (mic=Gabriel, system=recruiter). |
| VAD | Silero VAD (ONNX via `ort` or `silero-vad-rs`) | — | <30ms decision, runs on CPU. |
| STT primary | **Deepgram Nova-3 Multilingual** (`language=multi` for code-switching) | **AssemblyAI Universal-Streaming / Slam-1** | Only mainstream STT with single-stream FR↔EN. ~$0.46/hr. Zero-retention contracted. WS keep-alive every 5s. |
| STT degraded | — | **whisper.cpp** large-v3-turbo q5_0 streaming binary | Only Whisper variant with proven streaming (500ms chunks). MLX is faster but batch-only. |
| LLM primary | **Claude Sonnet 4.5** (model `claude-sonnet-4-5-20250929` or successor) | **GPT-5.x** (or GPT-4o until 5.x GA) | TTFT 600-1100ms streaming; 90% prompt-cache discount on CV+JD context = effective input ~$0.30/M. |
| LLM degraded | — | **Ollama + Qwen 2.5 14B (FR) / Llama 3.3 8B (EN)** | Stable HTTP API, Metal-accelerated on M-series. Qwen for FR quality. Pre-warm at app launch. |
| Vector store | **LanceDB 0.20** (Rust crate, embedded) | — | 4MB idle / 150MB query (vs Qdrant's 400MB constant); native Rust = zero IPC; "SQLite of vector DBs". |
| Embeddings | **voyage-3-large** (API) | **BGE-small / BGE-M3** (ONNX local, ~30MB) | voyage-3-large beats OpenAI v3-large by ~10% on multilingual MTEB. **Recommend BGE local for memory store** — memory should stay 100% local; voyage only if quality flags. |
| Relational store | SQLite 3.46+ via `sqlx` | — | Transcripts as JSONL files referenced from SQLite (cheap append, fast reload). |
| API key storage | macOS Keychain via `keyring` crate or Tauri Stronghold | — | Never SQLite plaintext. |
| Web research (prep brief) | Tavily | Exa (semantic), Firecrawl (extraction) | $0.008/credit, sub-500ms; cache per JD. |
| CV PDF parsing | Docling (IBM, Python sidecar) | — | 97.9% on complex tables, FR-safe. |
| Hotkeys / permissions | `tauri-plugin-global-shortcut` + `tauri-plugin-macos-permissions` 2.3+ | Native CGEventTap via shim | Required: Mic + Screen Recording + Accessibility (pre-flight at launch). |
| IPC pattern | `tauri::ipc::Channel<T>` for streams (transcripts, tokens) + `#[tauri::command]` for request/response + events for low-frequency notifications | — | Channel uses raw payloads (no JSON), critical for token streaming perf. |

**Cost estimate per interview hour:** ~$0.66 (Deepgram $0.46 + Claude $0.12 + Tavily/embeddings ~$0.08 amortized). Failover paths same order of magnitude. Local degraded mode = $0.

**What NOT to use:** Electron (bundle weight + memory), `NSWindow.sharingType = .none` as primary stealth (broken on 15+), OpenAI Whisper API (no streaming, no diarization), OpenAI Realtime API as primary STT (no native diarization), Pinecone/Weaviate Cloud (defeats local-first privacy), `text-embedding-ada-002` (deprecated), faster-whisper on Apple Silicon (no Metal), hard-coded API keys in frontend bundle, raw audio persisted to disk.

---

## Feature Landscape

### Table stakes (every competitor has these — no choice but to ship)

Real-time STT with mic + system audio split · diarization (who spoke) · question detection (silence + speaker turn) + override hotkey · live bullet generation in 2-5s · always-on-top overlay · stealth from screen-share · CV upload + structured extract · JD paste + parsing · resume-anchored answers (no hallucination) · STAR/framework templates · live transcript visible · post-interview transcript saved · multilingual (≥EN) · "tell me about yourself" pitch generator · basic post-interview AI debrief · hotkey controls.

If any of these are missing in v1 the product feels broken to anyone who's used Final Round / Cluely / LockedIn.

### Differentiators (Gabriel's defensible edge)

| # | Feature | Why it's open territory |
|---|---|---|
| 1 | **Verified live FR↔EN auto-switch in-session** | Every competitor "supports" multilingual but live mid-sentence code-switching is unverified across the board; Deepgram Nova-3 Multilingual + per-channel language ID makes this a checkable headline. |
| 2 | **Domain-specialised personae + framework templates** (Finance/Tech-AI/Consulting) | Live overlays today are all generic; domain-specific tools (Superday IB, CasePrepared, MECE Academy) are prep-only, not live. |
| 3 | **Domain RAG over real cases** (M&A precedents, AI product cases, consulting case bank) | Lets bullets cite "what a strong answer looks like" not just generic STAR. |
| 4 | **Live case-study coach** (hypothesis tree / MECE check / math sanity in real time) | The single biggest gap: practice tools exist, no live overlay does this. v2 candidate but unique long-term moat. |
| 5 | **Long-term memory across past interviews** (transcript-indexed RAG + recruiter-feedback weighting) | Only Natively touches it; no one operationalises "last time you got this question, you said X — recruiter feedback was Y — try framing it as Z." |
| 6 | **Snapshot-per-offer architecture** | Most tools have one global profile; reality is each offer is its own world. |
| 7 | **Tier-1 reliability** (failover STT + LLM + local degraded) | Cluely's 5-90s lag and Final Round's mid-interview failures are documented. "Always works" is itself a differentiator given the market scar. |
| 8 | **Coaching mode, not mimicry** (best-practice bullets, never voice-clone) | Already decided — also a positioning differentiator vs Pickle's avatar route. |
| 9 | **Privacy-first local persistence** | Cluely's 83k-user data breach (mid-2025) is the market scar. Local-only + zero-retention contracted with Deepgram + Anthropic is now a real value prop. |

### Anti-features (deliberately NOT building — write down to not waver)

Voice cloning / earpiece audio synthesis (deepfake liability, against coaching mission) · mock-interview simulator in v1 (Verve/Final Round own this; defer to v2) · slide / deck generation (out of scope) · mobile / phone companion (Mac speakerphone covers it) · browser extension (system audio loopback covers Zoom/Teams/Meet) · multi-tenant SaaS / auth / billing (Cluely's breach is the cautionary tale) · LinkedIn OAuth import · calendar sync · live notes / annotations during interview (cognitive-load conflict; debrief covers it) · AI clone avatar replacing user · mimicry of Gabriel's vocal tics · always-listening "ambient" mode · public question-bank community · real-time face / posture / eye-tracking.

---

## Architecture Shape

Three-layer Tauri app: **Rust core** (Tokio runtime — owns audio capture, VAD, STT supervisor with shadow-probe failover, TranscriptBus, QuestionDetector, ContextAssembler, LLM supervisor, RAG indexer, SQLite + LanceDB persistence, single-egress `cloud::Client` privacy boundary) ⇄ **TypeScript/React webview** (overlay UI, rAF-batched token rendering, never `setState` per token) ⇄ **Swift sidecar** (ScreenCaptureKit audio capture, `SCShareableContent` polling for screen-share detection, `NSWindow.sharingType` / `setContentProtection` best-effort, dock-hide via `LSUIElement`, global hotkey via CGEventTap). Hot path uses lock-free ring buffer + `tokio::broadcast`; cold path (CV parse, debrief, brief, indexing) is strictly off the latency-critical line. **Two parallel STT sessions** (one mic, one system) give channel-of-origin diarization with 99%+ accuracy and survive Whisper-fallback's lack of speaker labels. **Single egress module** (`cloud::Client`) makes the privacy invariant enforceable by code review.

### Latency budget (target ≤5s, ideal 2.5-3.5s)

| Stage | Target | Realistic floor | Knob |
|---|---|---|---|
| Mic frame → ring buffer | <5ms | <5ms | trivial |
| VAD decision (Silero ONNX CPU) | <30ms | ~20ms | — |
| STT first interim (Deepgram Nova-3) | 200-400ms | 200ms | vendor |
| STT final | 200-400ms after speech ends | ~300ms | — |
| Question-end detection | 500-1500ms | =silence threshold | **biggest knob — default 800ms; hotkey skips this entirely** |
| Context assembly + RAG retrieval (LanceDB local) | 50-200ms | ~80ms | local |
| LLM TTFT (Claude Sonnet streaming) | 600-1200ms | ~800ms | vendor |
| First token → UI rendered (Tauri Channel + rAF) | <50ms | ~30ms | — |
| **Total to first bullet visible** | **2-3.5s** | **~2.5s** | — |
| Full bullets streamed | +1-2s | | streams as Claude generates |

**Implication:** the 5s ceiling is achievable but not loose. **Profile each stage at every milestone exit.** Anything that creeps onto the hot path (SQLite writes per word, embedding calls per utterance, ML diarization on mixed channels, per-token `setState`) silently eats the budget.

---

## Critical Risks & Required Spikes (top 5)

### 1. Critical-01: macOS 15+ ScreenCaptureKit ignores `NSWindow.sharingType = .none`
**This invalidates LIVE-05 as currently written in PROJECT.md.** Apple confirmed (developer forums + Tauri issue #14200) that the flag is ignored on Sequoia+ because compositing pushes window contents through a single framebuffer before display, and capture happens at framebuffer level. There is no public API workaround.
- **Required spike (Phase 0, before any UI investment):** detect Gabriel's macOS version, then record a Zoom screen-share session with the overlay visible — confirm whether it appears in the recording.
- **If it leaks:** redesign LIVE-05/LIVE-06 around (a) screen-share **detection** via `SCShareableContent` polling (1 Hz) → auto-blur/hide overlay, (b) move overlay to a secondary monitor when one is connected, (c) window-share defense (recruiters often share a specific window — keep overlay on a non-shared window), (d) manual paranoid-mode hotkey as last resort. Treat sharingType + setContentProtection as Layer A best-effort only. Investigate the Cluely-style Metal/CGS private-API trick (`kCGSDebugOptionExcludeFromCapture`) only if validation absolutely demands true invisibility — high risk of breaking on minor macOS updates.

### 2. Critical-02: Hallucination of CV facts during live interview
Zero tolerance per Gabriel. Worst possible failure mode (model invents an experience → recruiter probes → trust collapses).
- **Required prevention (LLM phase, ships in v1):** structured CV ingestion (Docling → JSON, lossless) · "closed-set" prompt that forces the LLM to cite only facts in the CV JSON · citation-required mode (each bullet carries `[ref: CV.experience.<id>]`) · post-generation validator that drops bullets with unresolved refs · cold-start hallucination probe before each session · regression battery of "trap" questions · visual signal in overlay when a bullet is unverified (dim/italic).

### 3. Critical-03: Failover that doesn't actually fail over
LIVE-07 is non-negotiable but failover code is rarely exercised in practice. Risks: untested backup auth, schema drift between vendors, correlated outages (both vendors on AWS us-east-1), local fallback with a fundamentally different UX shape.
- **Required prevention (Reliability phase — its own phase, not bundled into STT):** continuous shadow-mode (both vendors receive same audio in dev, outputs compared) · pipeline normalization adapter (downstream code never sees vendor differences) · cross-cloud vendor diversity (Deepgram=AWS, AssemblyAI=different region/cloud) · synthetic monitoring before each session — pre-flight check UI showing STT primary / STT backup / LLM primary / LLM backup / local Whisper / local Ollama, each pass green/yellow/red · local fallback uses identical prompts and bullet schema (only quality drops, UX shape doesn't change) · 7-second watchdog on bullet generation forces fail to next pipeline.

### 4. Critical-04: Recording-without-consent legal exposure
France Article 226-1 = up to 1 year prison + €45k fine. California Penal Code 632. EU GDPR personal-data exposure on top. Even local-only audio retention is the legal offense.
- **Required prevention (Privacy phase, concurrent with MEM-01 — cannot ship MEM-01 without this):** **default to transcripts only, never persist raw audio** (audio → STT cloud zero-retention → discarded) · per-session consent prompt with jurisdiction question (CA / FR / DE / Quebec / WA / IL / FL …) · right-to-delete by snapshot from day 1 (GDPR 30-day window) · in-app legal-posture notice Gabriel could show a recruiter if challenged · no cloud syncing of transcripts ever · explicit AI-assistance-disclosure decision visible in onboarding (personal ethics call, not product decision — but make the choice visible).

### 5. Critical-05: Silent failure — UI looks fine, no bullets generated
Audio capture stops (BlackHole driver crashed silently after a macOS update; Bluetooth headset reconnected and audio routed elsewhere; ScreenCaptureKit dropped permission). UI still shows previous bullets or empty "thinking" state. Gabriel doesn't realize until the recruiter has asked three unanswered questions.
- **Required prevention (Audio + Observability phase):** audio liveness indicator in overlay (small VU meter / pulsing dot showing samples flow) · STT keepalive monitoring (30s no transcripts despite mic volume → recovery flow) · bullet staleness indicator (each bullet block tagged "as of question N at HH:MM:SS") · pipeline diagnostic panel (capture → STT → diarization → LLM → render heartbeats) · aggressive "expected vs received" logging.

**Honourable mentions to design in but not block on:** prompt injection from recruiter speech (structured output enforcement + delimited transcript blocks), bullets too long to read in 5s under stress (≤12 words/bullet, ≤5 bullets, no streaming text mid-read, position above the camera not below, freeze 8s before swap), code-switching breaks STT mid-sentence (use Deepgram Flux Multilingual + glossary boost + channel-based separation), RAG dominance amplifying past biases (diversity in retrieval + time decay + memory toggle), notifications appearing during screen-share (auto-DND), iCloud-synced data directory (store under `~/Library/Application Support/<app>`).

---

## Implications for Roadmap

### Mandatory phase order (not negotiable)

```
Phase 0  Foundations + Stealth Spike     ← validates Critical-01 BEFORE any UI investment
   │
   ├──► Phase 1  Audio Capture + Channel Diarization   ← Critical-05 + High-01 + High-04
   │      │
   │      └──► Phase 2  STT + Code-switching            ← High-07; trait + supervisor scaffold for failover
   │             │
   │             └──► Phase 3  CV/JD Ingestion + Context Assembly   ← Critical-02 prerequisite (lossless CV)
   │                    │
   │                    └──► Phase 4  LLM + Bullet Generation       ← Critical-02 (validator) + High-02 (injection)
   │                           │
   │                           └──► Phase 5  Live UX + Overlay      ← High-03 readability under stress
   │                                  │
   │                                  └──► Phase 6  Reliability / Failover    ← Critical-03 (its own phase)
   │                                         │
   │                                         └──► Phase 7  Memory / RAG       ← High-09 dominance, MEM-03..05
   │                                                │
   │                                                └──► Phase 8  Brief / Debrief / Domain    ← PREP-03, DOMAIN-*, MEM-02
   │                                                       │
   │                                                       └──► Phase 9  Polish + Live Case Coach (v2)
   │
   └──► Privacy / Data Handling  (CONCURRENT throughout — single-egress + ZDR contracts + transcripts-only default)
```

### Suggested phases (one-liner rationale each)

- **Phase 0 — Foundations & Stealth Spike.** Validate Critical-01 on Gabriel's actual macOS version before any UI investment. If `NSWindow.sharingType = .none` leaks on his Mac → redesign LIVE-05/06 around detection-based masking + second-display strategy. Also: Tauri 2 scaffold, SQLite migration, permission pre-flight (mic + screen recording + accessibility), Swift sidecar skeleton.
- **Phase 1 — Audio capture (mic + system) with channel diarization.** ScreenCaptureKit-first (BlackHole as fallback only). Two parallel audio streams. VU-meter liveness signal. Pre-session routing health check. **Channel-of-origin tagging from day 1** — never bolt on later.
- **Phase 2 — STT spine: Deepgram Nova-3 Multilingual + TranscriptBus + live caption.** WS connection pool, keepalive every 5s, `is_final=true` triggers. Glossary boost (EBITDA, M&A, MECE, DCF, RAG, fine-tuning, etc.). SttProvider trait with one impl (failover phase fills in others). Exits at "speak into mic, see transcript in <1s."
- **Phase 3 — CV / JD ingestion + context assembly.** Docling-based lossless CV → structured JSON. JD paste + parse. Snapshot-per-offer schema. ContextAssembler v1. **Critical-02 prerequisite.**
- **Phase 4 — LLM + bullet generation (Claude streaming).** Citation-required prompting. Structured output / JSON schema enforcement. Post-generation validator drops bullets with unresolved refs. Hallucination probe battery in CI. Prompt-cache the CV+JD context (5min TTL is plenty within an interview).
- **Phase 5 — Live UX: overlay + readability.** Always-on-top, frameless, transparent. ≤12 words/bullet, ≤5 bullets, no streaming text mid-read, freeze 8s before swap. Hierarchy (bullet 1 = headline). Position above the camera. Auto-DND mode. Hotkeys (override trigger, paranoid-hide, regenerate) with no Zoom/Teams/Meet conflicts. Under-stress test with Gabriel doing mental arithmetic.
- **Phase 6 — Reliability / Failover (the "shippable" gate).** AssemblyAI provider + STT supervisor with shadow probe + replay buffer. GPT-5 LLM failover with first-token timeout. Whisper.cpp + Ollama pre-warmed at app launch. Pre-flight check UI (each provider green/yellow/red with real audio probe, not just ping). Cross-cloud vendor diversity. Watchdog on bullet generation. **Critical-03 gate.**
- **Phase 7 — Memory / RAG.** LanceDB schemas. Local BGE-small ONNX embeddings. Background indexer (queue, batch every 30s, never on hot path). Post-session re-index with full Q&A pairs and recruiter-feedback weighting. Diversity in retrieval + time decay + memory toggle to prevent High-09. Memory only delivers value at interview #2-3 — frame in onboarding.
- **Phase 8 — Brief + debrief + domain specialisation.** Tavily-based deep prep brief (cached per JD). MEM-02 auto-debrief. MEM-04 feedback capture. MEM-05 pattern extraction. DOMAIN-01 question banks (curated content task), DOMAIN-02 personae (prompt task), DOMAIN-03 RAG over case corpus, DOMAIN-04 framework templates with two-stage generation (classify question → apply correct framework, fixes High-08).
- **Phase 9 — Polish + Live Case-Study Coach (v2 candidate).** COACH-01 hypothesis tree + MECE check + math sanity. Multi-person diarization on the system channel (panel interviews). Cost telemetry + monthly budget summary. Position memory + drag UX.

**Cross-cutting (NOT a phase, runs throughout):** Privacy / data handling — single-egress `cloud::Client` from Phase 0; ZDR contracts signed with Anthropic + OpenAI before failover ships; transcripts-only default + per-session consent prompt before MEM-01 ships; PII-stripped logger by default; data path under `~/Library/Application Support/<app>`, never `~/Documents`; Keychain for API keys.

### Shortest path to "Gabriel uses it in a real interview"

Phase 0 → 1 → 2 → 3 → 4 → 5 → 6. Phases 7-9 can wait until after interview #1. Estimated 4-6 weeks of focused work. **Reliability phase is on the critical path** even though feature-complete is at Phase 5 — Gabriel's "Tier-1 reliability" requirement makes Phase 6 a shipping gate, not a polish item.

---

## Open Questions

1. **Gabriel's macOS version.** PROJECT.md says "macOS récent (Apple Silicon supposé)" — is it 13.x, 14.x, 15.x, or 26.x? Determines whether Phase 0 stealth spike finds a working `sharingType` or must redesign around detection. **Highest-priority validation item.**
2. **Cluely-style Metal/CGS private-API trick.** Worth investigating in Phase 0 spike or treat as out-of-scope and rely on detection + second-display? Risks: breaks on minor macOS updates, App Store rejection (irrelevant here — direct distribution), but is the only known mechanism for true invisibility on 15+.
3. **AI-assistance disclosure stance.** Some jurisdictions and corporate codes prohibit undisclosed AI assistance in interviews. Personal ethics call for Gabriel — but the product needs to make the choice visible (consent prompt copy, in-app legal posture notice). Should be a REQUIREMENTS-level decision before Phase 4 prompts ship.
4. **ZDR contract acquisition timeline.** Anthropic and OpenAI ZDR are per-product, per-contract. **Must be signed before Phase 6 failover ships** to avoid Critical-04 + High-06 exposure. Lead time on commercial-org ZDR negotiation? Verify before Phase 6.
5. **Voyage AI vs local BGE for embeddings.** Recommendation is local BGE for privacy alignment but Voyage gives ~10% better FR multilingual quality. Decide per Gabriel's privacy preference — local-only is the safer default; switch to Voyage only if RAG quality flags during Phase 7 testing.
6. **Live Case Coach (COACH-01) — v1 or v2?** PROJECT.md lists it under "Coaching & présentations" Active. FEATURES.md and ARCHITECTURE.md both flag it as v2 due to high complexity (state machine, hypothesis trees, MECE checking, requires DOMAIN-03 RAG operational). REQUIREMENTS should make the call explicit.
7. **Snapshot-per-offer schema details.** PREP-04 is a foundational concept that touches every other feature (LLM context, RAG scoping, debrief, memory feedback loop). Schema decision should be made before Phase 3, not deferred.

---

## Confidence Assessment

| Area | Confidence | Notes |
|---|---|---|
| Stack | HIGH | Three production stealth-overlay clones use Tauri (Pluely, Natively, OpenCluely) — direct reference implementations. Deepgram Nova-3 Multilingual GA dates verified. Anthropic prompt-cache mechanics verified. LanceDB perf profile verified. Cost numbers verified against vendor pricing pages. |
| Features | HIGH | 10-tool competitor inventory with feature matrix. Gaps (long-term memory, live case coach, FR↔EN auto-switch in-session) confirmed across all 10. Anti-features anchored to PROJECT.md decisions and Cluely's 83k-user breach as market scar. |
| Architecture | MEDIUM-HIGH | Three-layer Tauri shape is dominant pattern. Channel-of-origin diarization is a clear win for 2-speaker case. **STT failover orchestration documented in only one OSS reference (Natively v2.5)** — flag for Phase 6 research. Hot/cold path separation, single-egress privacy boundary, rAF-batched streaming are well-supported. |
| Pitfalls | HIGH | Critical-01 (Sequoia stealth bypass) verified by Apple developer forums + Tauri issue #14200 + Apple engineer confirmation. CV-hallucination prevention patterns standard. Failover patterns documented. Legal exposure verified against French Article 226-1 + California Penal Code 632 + GDPR. |

**Overall confidence: HIGH** with one major caveat: **stealth on macOS 15+ is an open architectural question** that must be answered in Phase 0 before downstream design choices commit. If the spike fails, LIVE-05 redesign is mandatory and may push the second-display strategy to a primary defense.

---

*Research synthesised: 2026-04-26*
*Ready for REQUIREMENTS.md and ROADMAP.md*
