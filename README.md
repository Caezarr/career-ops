<div align="center">

# Career OS

### **The career operating system for people targeting top firms.**

Track every application, tailor every CV, drill every question, and — when the interview starts — get a stealth coach grounded in your own CV.

[![Platform](https://img.shields.io/badge/platform-macOS%2013%2B-black?logo=apple)](https://www.apple.com/macos/)
[![Built with Tauri](https://img.shields.io/badge/built%20with-Tauri%202-FFC131?logo=tauri&logoColor=black)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/rust-stable-orange?logo=rust)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/react-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Status](https://img.shields.io/badge/status-active%20development-yellow)]()

[**Why**](#-why) • [**What's inside**](#-whats-inside) • [**Live Copilot**](#-live-copilot) • [**Stack**](#-stack) • [**Get started**](#-get-started) • [**Privacy**](#-privacy-by-design)

</div>

---

## 💡 Why

Job hunting at the top end is a **process problem**, not a willpower problem.

You're juggling 40 applications across 8 funnels. You can't remember which CV variant you sent to which fund. You've answered "tell me about yourself" 22 times — and you still freeze on number 23. Your inbox is the source of truth, which means there is no source of truth.

**Career OS** is the operating system that fixes this. It's a native Mac app that lives next to your work, owns the entire job-hunt loop, and — when the moment comes — sits silently behind your video call as a coach grounded in your own CV.

> **Not a job board. Not a CV builder. A workshop where every artifact, every conversation, and every interview is one keystroke away.**

---

## 🧭 What's inside

Career OS ships as **one Mac app** with seven connected surfaces:

| Surface | What it does |
|---|---|
| **Dashboard** | Today's focus hero strip with priority-scored CTAs · live greeting · 14-day activity sparkline · weekly insight grounded in your real applications |
| **Jobs** | Browse, filter, and bookmark openings · AI-computed match score per posting · "Why you match" / "Gaps to fix" derived from your CV |
| **Applications** | Kanban across `sourced → applied → screen → interview → offer / rejected` · per-app timeline · drag-and-drop pipeline · materials checklist · sort by activity / match / stage |
| **War Room** *(per-job workspace)* | The headquarters for one specific job. Stage progress · match-score donut · interview-readiness donut · CV-vs-JD ATS analysis · likely-question prediction · prep hub · timeline with next-best actions · linked notes and follow-ups |
| **CV Manager** | Multiple CV variants (one per role focus) · ATS score + projected score · Claude-powered ATS analysis with strengths / weaknesses / missing keywords / surgical suggestions · history of tailoring runs · default-CV per persona |
| **Prep** | Adaptive question bank tailored to your current candidacy (Behavioral / Technical / Case / Culture Fit) · structure / conciseness / evidence / memorability scoring · today's plan with streak tracker · 8-week practice chart |
| **Live Copilot** | The stealth overlay. Real-time transcription · question-end detection · 3 CV-grounded answer bullets in under 5 seconds · invisible to screen-share · FR ↔ EN code-switching |

Everything is linked: a job in **Jobs** turns into an application in **Applications** that opens a **War Room** that drives a **Prep** plan that warms up a **Live Copilot** session — all sharing the same CV, the same JD snapshot, and the same persona context.

---

## 🎬 Live Copilot

The crown jewel. While you're in a Zoom / Meet / Teams call:

```
┌─────────────────────────────────────────────────┐
│ 🟢 Listening · Recruiter speaking · FR          │
├─────────────────────────────────────────────────┤
│ Q: "Parle-moi d'un échec marquant."             │
│                                                 │
│ → Projet X — chiffre raté de 40% [CV.exp.3]     │
│ → Cause racine: scope mal cadré en kickoff      │
│ → Apprentissage appliqué sur projet Y [CV.exp.4]│
│                                                 │
│ ⏱ 2.8s · Sonnet 4.5 · cached                    │
└─────────────────────────────────────────────────┘
```

**5 design choices that matter:**

1. **Two-channel audio** — mic = you, system = recruiter. No ML diarization, no BlackHole, no kernel extensions. ScreenCaptureKit only.
2. **Citation-required prompts** — every bullet citing a fact carries `[ref: CV.experience.<id>]`. A post-gen validator drops bullets with unresolved refs. **Zero hallucinations on your CV.**
3. **Triple-redundant pipeline** — Deepgram → AssemblyAI for STT, Claude → GPT-5 for LLM, full local fallback (Whisper.cpp + Ollama) when both clouds are down.
4. **Stealth that actually works on macOS 15+** — `NSWindow.sharingType = .none` is broken on Sequoia. We detect screen-share, mask the overlay, and offer second-display routing instead.
5. **Single-egress `cloud::Client`** — every outbound HTTP/WS call routes through one Rust module. The privacy boundary is a `grep`, not a guideline.

**Cost:** ~$0.66 / hour during a live interview (Deepgram + Claude + amortized prep brief).

---

## ⚡ How the Live Copilot pipeline works

```
🎤 Mic ────────┐
               ├──▶ Channel-tagged audio ──▶ Deepgram STT (FR↔EN)
🔊 System ─────┘                                       │
                                                       ▼
                                          Question-end detection
                                                       │
                                                       ▼
                                CV (Docling JSON) + JD + Snapshot
                                                       │
                                                       ▼
                                  Claude Sonnet 4.5 (cached, citation-required)
                                                       │
                                                       ▼
                              3 bullets · STAR / MECE · in <5s · validated
                                                       │
                                                       ▼
                                Stealth overlay (invisible on screen-share)
```

---

## 🛠 Stack

<table>
<tr><th align="left">Layer</th><th align="left">Choice</th><th align="left">Why</th></tr>
<tr><td>Desktop shell</td><td>Tauri 2 + React 19 + Vite 6</td><td>Native perf, tiny binary, Rust core</td></tr>
<tr><td>State</td><td>Zustand (sliced store)</td><td>Tiny, ergonomic, no Provider hell</td></tr>
<tr><td>UI</td><td>Hand-rolled CSS tokens · Lucide icons · cmdk · dnd-kit</td><td>Pixel-perfect, no design-system lock-in</td></tr>
<tr><td>macOS bridge</td><td>Swift sidecar (ScreenCaptureKit)</td><td>Only stable system-audio path on 13+</td></tr>
<tr><td>STT primary</td><td>Deepgram Nova-3 Multilingual</td><td>True FR↔EN code-switching, &lt;500 ms</td></tr>
<tr><td>STT failover</td><td>AssemblyAI Universal-Streaming</td><td>Cross-cloud vendor diversity</td></tr>
<tr><td>LLM primary</td><td>Claude Sonnet 4.5+</td><td>90% prompt-cache discount on CV/JD</td></tr>
<tr><td>LLM failover</td><td>GPT-5 / 4o</td><td>Same prompt contract, hot-swap</td></tr>
<tr><td>Local degraded</td><td>whisper.cpp + Ollama (Qwen 2.5 / Llama 3.3)</td><td>Pre-warmed, no internet required</td></tr>
<tr><td>Vector store</td><td>LanceDB embedded</td><td>4 MB idle, no IPC, Rust-native</td></tr>
<tr><td>Embeddings</td><td>BGE-small ONNX (local)</td><td>Privacy-first by default</td></tr>
<tr><td>Persistence</td><td>SQLite (sqlx) + JSONL transcripts</td><td>No raw audio, ever</td></tr>
<tr><td>Secrets</td><td>macOS Keychain (`keyring` crate)</td><td>Never in SQLite, never in bundle</td></tr>
<tr><td>CV parsing</td><td>Docling (IBM, Python sidecar)</td><td>Lossless structured extraction</td></tr>
</table>

---

## 🚀 Get started

> ⚠️ Active development. The dashboard, War Room, CV Manager, Applications, and Prep surfaces are usable today. The Live Copilot pipeline lands at Phase 6 (the shipping gate).

### Prerequisites

- macOS 13+ (15+ recommended for screen-share masking)
- Rust (stable) + Cargo
- Node 20+ and `pnpm`
- Xcode Command Line Tools
- API keys: Anthropic (required for ATS / tailoring), Deepgram + AssemblyAI + OpenAI (required for Live Copilot)

### Run it

```bash
git clone https://github.com/Caezarr/career-ops.git
cd career-ops
pnpm install
pnpm tauri dev
```

First launch walks you through Microphone, Screen Recording, and Accessibility permissions before any feature unlocks. API keys are entered once and stored in the macOS Keychain — never in plaintext, never in the frontend bundle.

### Common commands

```bash
pnpm tauri dev      # dev with hot reload
pnpm tauri build    # produces an unsigned .dmg (Gatekeeper will block on first launch)
pnpm typecheck      # tsc -b --noEmit
pnpm build          # frontend-only build (vite + tsc)
cargo test          # Rust tests
```

### Project layout

```
src/
  dashboard/        Career OS surfaces (Dashboard, Jobs, Applications, CV, Prep, Workspace)
    pages/          Top-level screens
    components/     Shared + per-page UI
    store/          Zustand sliced store
    data/           Seed mock data + adaptive prep bank
    styles/         CSS tokens + per-feature stylesheets
  copilot/          Live overlay app (stealth, frameless, always-on-top)
src-tauri/          Rust core: audio, STT, LLM, persistence, single-egress cloud
src-tauri/migrations/  SQLite migrations
.planning/          GSD planning artifacts (PROJECT, REQUIREMENTS, ROADMAP, research)
```

---

## 🗺 Roadmap

The Live Copilot ships in **7 phases (0–6) = shippable v1**. Order is not negotiable — Phase 6 (reliability / failover) is the gate, not polish.

| # | Phase | Status |
|---|-------|--------|
| 0 | Foundations & Stealth Spike | 🟡 in progress |
| 1 | Audio Capture + Channel Diarization | ⚪ planned |
| 2 | STT Spine + Question Detection | ⚪ planned |
| 3 | CV / JD Ingestion + Context Assembly | ⚪ planned |
| 4 | LLM + Bullet Generation + Domain Personae | ⚪ planned |
| 5 | Live UX + Overlay + Pitch Perso | ⚪ planned |
| 6 | **Reliability / Failover — SHIPPABLE GATE** | ⚪ planned |
| 7 | Memory / RAG | 🔵 v2 |
| 8 | Brief / Debrief / Domain content | 🔵 v2 |
| 9 | Live Case Coach + Polish | 🔵 v2 |

The dashboard surfaces (Jobs, Applications, CV, Prep, War Room) are built **in parallel** with Phases 0–6 — they don't gate Live Copilot, but they ground it (CV variants, snapshots, JD context all flow into the same pipeline).

Cross-cutting privacy posture (`PRIV-01..06`) runs across every phase.

📖 Full breakdown: [`.planning/ROADMAP.md`](.planning/ROADMAP.md) · Atomic requirements: [`.planning/REQUIREMENTS.md`](.planning/REQUIREMENTS.md)

---

## 🔒 Privacy by design

Career OS sees your CVs, your applications, and (for the Live Copilot) your interviews. That's a serious commitment. Here's what's enforced in code:

- ✅ **No raw audio on disk.** Transcripts only (JSONL). Easy purge.
- ✅ **All persistence local.** `~/Library/Application Support/com.caezarr.career-ops/`. **Never** iCloud / Dropbox / any cloud sync.
- ✅ **Single-egress `cloud::Client`.** One Rust module, every outbound call. Reviewable in 2 minutes with `grep`.
- ✅ **API keys in Keychain.** Never SQLite. Never bundled. Never logged.
- ✅ **Zero-retention contracts** required from every vendor before Phase 6 ships.
- ✅ **PII-stripped logger** by default.

---

## ⚠️ Critical constraints (lessons baked in)

- macOS 15+ broke `NSWindow.sharingType = .none` for ScreenCaptureKit. Don't trust it as primary stealth.
- BlackHole and other virtual audio drivers break across macOS updates. ScreenCaptureKit is the only sane path.
- ML diarization for 2 speakers is overkill and unreliable. Channel-of-origin tagging is the answer.
- Each interview is its own snapshot. Contexts must never bleed between offers.
- Latency budget ≤ 5 s, target 2.5–3.5 s. Profiled at every milestone exit.

---

## 🤝 Contributing

This is a personal project, but the planning is in the open. If you're building something similar:

- The research notes in [`.planning/research/`](.planning/research/) (`STACK`, `FEATURES`, `ARCHITECTURE`, `PITFALLS`) are the most reusable artifacts.
- The [`CLAUDE.md`](CLAUDE.md) file is the canonical project orientation — read it first.
- Issues and questions welcome. PRs are not accepted at this stage (single-user scope).

---

## 📜 License

Personal project. No redistribution license granted at this stage. Open an issue if you want to discuss using parts of it.

---

<div align="center">

### *A career operating system grounded in your own CV — not a cheat code, a coach you can keep on screen.*

Built with 🦀 Rust, ⚡ Tauri, ⚛️ React, and a healthy disrespect for `NSWindow.sharingType`.

</div>
