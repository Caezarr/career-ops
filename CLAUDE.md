# CLAUDE.md — Career OS

> Originally scoped as "Interview Copilot" (Phases 0–6 = stealth live-interview overlay).
> Scope expanded into a full career operating system: Dashboard, Jobs, Applications,
> War Room, CV Manager, Prep, Live Copilot. The `.planning/` artifacts below were
> written under the original name and are preserved as historical record.

This file orients Claude (and humans) on this project. Read it first.

## What This Is

Mac desktop stealth overlay that assists during live job interviews (visio, phone, case study) in **finance, tech (AI), and strategy/consulting**. Captures mic + system audio with channel-of-origin diarization, generates structured bullets (frameworks STAR / MECE / Pyramid) in 2-5s, contextualised by Gabriel's CV + the JD + long-term memory.

**Core value:** During a real live interview, the app shows higher-quality answer bullets than Gabriel could produce alone under stress — invisible to the recruiter, in the interview's language (FR/EN), and pushing him to improve.

**Personal tool, not SaaS.** Single user (Gabriel).

## Stack

- **Desktop shell:** Tauri 2.10 (Rust + React/TS + Vite 6)
- **Native macOS bridge:** Swift sidecar binary (ScreenCaptureKit, AppKit windowing, CGS)
- **Audio capture:** ScreenCaptureKit (macOS 13+) — system audio via `SCStreamConfiguration.capturesAudio = true`, mic via AVCaptureSession. Channel-of-origin tagging (mic = Gabriel, system = recruiter).
- **STT:** Deepgram Nova-3 Multilingual primary (FR↔EN code-switching, `language=multi`) → AssemblyAI Universal-Streaming failover
- **LLM:** Claude Sonnet 4.5+ primary (90% prompt-cache discount on CV+JD context) → GPT-5/4o failover
- **Local degraded fallback:** whisper.cpp streaming + Ollama (Qwen 2.5 14B FR / Llama 3.3 8B EN) — pre-warmed at app launch
- **Vector store:** LanceDB embedded (4MB idle / 150MB query) — Rust crate, no IPC
- **Embeddings:** BGE-small ONNX local (privacy-first) — Voyage AI v3-large only if quality flags
- **Relational store:** SQLite via `sqlx`; transcripts as JSONL files referenced from SQLite
- **API key storage:** macOS Keychain via `keyring` crate (never SQLite plaintext, never frontend bundle)
- **Web research (prep brief):** Tavily
- **CV PDF parsing:** Docling (IBM, Python sidecar)
- **Hotkeys / permissions:** `tauri-plugin-global-shortcut` + `tauri-plugin-macos-permissions`

**Cost target:** ~$0.66/hour live interview (Deepgram + Claude + amortized brief).

## Critical Constraints

1. **macOS 15+ broke `NSWindow.sharingType = .none`** — ignored by ScreenCaptureKit on Sequoia. Primary stealth = screen-share **detection + masking** + second-display routing. `sharingType` + `setContentProtection` kept as best-effort Layer A only.
2. **Zero tolerance for CV hallucinations.** Citation-required prompting (each bullet citing a fact carries `[ref: CV.experience.<id>]`); post-generation validator drops bullets with unresolved refs; structured CV ingestion (Docling → JSON, lossless).
3. **Tier-1 reliability.** Failover STT (Deepgram → AssemblyAI), failover LLM (Claude → GPT-5), local degraded (Whisper.cpp + Ollama). Pre-flight check UI before each session. Watchdog at 7s. Cross-cloud vendor diversity.
4. **Stealth assumed (recruiter must not know).** No automatic disclosure prompts. App minimises legal exposure by default (transcripts only, no audio persistence on disk, easy purge) without fricting the user.
5. **All persistence local.** Data path under `~/Library/Application Support/com.caezarr.career-ops/` (NOT `~/Documents/` which can be iCloud-synced). No cloud sync ever.
6. **Single-egress `cloud::Client`.** Every outbound HTTP/WS call routes through one module — privacy boundary enforceable by code review.
7. **Languages:** FR + EN, with auto-detection and switch in-session.
8. **Latency budget:** ≤ 5s from question-end to first bullet, target 2.5-3.5s. Profile each stage at every milestone exit.

## Workflow (GSD)

This project uses [GSD](https://github.com/gsd-cli/gsd) — Get Shit Done. Configuration:

- **Mode:** YOLO (auto-approve)
- **Granularity:** standard (5-8 phases, 3-5 plans each)
- **Parallelization:** enabled
- **Workflow agents:** research + plan-check + verifier + nyquist validation all ON
- **Model profile:** balanced (Sonnet)
- **Commit docs:** yes (planning docs in git)

**Planning artifacts** in `.planning/`:

- `PROJECT.md` — project context (what, why, who, key decisions)
- `REQUIREMENTS.md` — atomic v1 requirements with REQ-IDs and traceability to phases
- `ROADMAP.md` — 7 phases (0-6 = v1 shippable; 7-9 deferred to v2)
- `STATE.md` — project memory pointer
- `config.json` — workflow config
- `research/` — STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md, SUMMARY.md

**Phase order (NOT negotiable):**

```
Phase 0  Foundations & Stealth Spike     (validates macOS 15+ stealth)
Phase 1  Audio Capture + Channel Diarization
Phase 2  STT Spine + Question Detection
Phase 3  CV/JD Ingestion + Snapshot + Context
Phase 4  LLM + Bullets + Domain Personae
Phase 5  Live UX + Overlay + Pitch Perso
Phase 6  Reliability / Failover           ← SHIPPABLE GATE
   ──────────────────────────────────────  v1 ships here
Phase 7  Memory / RAG (deferred)
Phase 8  Brief / Debrief / Domain content (deferred)
Phase 9  Live Case Coach + Polish (deferred)
```

**Cross-cutting privacy/legal posture** runs across all phases (PRIV-01..06).

## Common Commands

```bash
# Workflow
/gsd-progress           # check current state
/gsd-discuss-phase 0    # gather context for next phase
/gsd-plan-phase 0       # create executable plan
/gsd-execute-phase 0    # run all plans in phase
/gsd-verify-work        # UAT after phase

# Development (once Phase 0 ships scaffolding)
pnpm tauri dev          # run app in dev mode
pnpm tauri build        # build production bundle
cargo test              # run Rust tests
pnpm test               # run frontend tests
```

## What NOT to Do

- ❌ Persist raw audio on disk (privacy commitment + legal exposure)
- ❌ Hard-code API keys in frontend bundle (decompilable)
- ❌ Use BlackHole as primary system audio capture (kernel extension breaks across macOS updates)
- ❌ Use ML diarization for the 2-speaker case — channel-of-origin tagging is more reliable
- ❌ Trust `NSWindow.sharingType = .none` as primary stealth on macOS 15+
- ❌ Send raw audio to any vendor without zero-retention contract
- ❌ Add features outside the v1 scope without an explicit decision in PROJECT.md
- ❌ Mix snapshot data between offers (each interview is its own world)
- ❌ Generate bullets that cite facts not in the structured CV JSON
- ❌ Sync data via iCloud / Dropbox / any cloud (data path under Library/Application Support, not Documents)

## Repository

- **GitHub:** https://github.com/Caezarr/career-ops (originally `Caezarr/interview-copilot` — renamed)
- **Local:** `/Users/gabriel/Desktop/Wonka/code/interview-copilot/` *(folder still uses the original name; rename when convenient)*
- **Tracking note (Obsidian):** `Projects/interview-copilot.md` in vault

---
*Generated: 2026-04-26 after `/gsd-new-project` initialization*
