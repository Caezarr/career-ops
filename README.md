<div align="center">

# 🎙️ Interview Copilot

### **Your stealth wingman for live job interviews.**

Real-time transcription. CV-grounded answer bullets. Under 5 seconds. Invisible to the recruiter.

[![Platform](https://img.shields.io/badge/platform-macOS%2013%2B-black?logo=apple)](https://www.apple.com/macos/)
[![Built with Tauri](https://img.shields.io/badge/built%20with-Tauri%202-FFC131?logo=tauri&logoColor=black)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/rust-stable-orange?logo=rust)](https://www.rust-lang.org/)
[![React 19](https://img.shields.io/badge/react-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Status](https://img.shields.io/badge/status-active%20development-yellow)]()
[![License](https://img.shields.io/badge/license-personal-lightgrey)]()

[**Why**](#-why) • [**Demo**](#-demo) • [**How it works**](#-how-it-works) • [**Stack**](#-stack) • [**Get started**](#-get-started) • [**Roadmap**](#-roadmap)

</div>

---

## 💡 Why

Job interviews are a stress test, not a knowledge test.

You know your CV. You know the answer. But under stress, the right STAR story doesn't surface, the MECE breakdown collapses, and you walk out remembering the perfect answer 30 seconds too late.

**Interview Copilot is a teleprompter that thinks.** It listens to your interview live, detects when the recruiter finishes asking, and shows you 3 high-quality bullets — grounded in your actual CV, in the language of the conversation (FR ↔ EN), in under 5 seconds.

It's not a cheat code. It's a coach you can keep on screen.

---

## 🎬 Demo

> Coming as soon as Phase 5 ships. Until then, here's what the live overlay looks like in dev:

```
┌─────────────────────────────────────────────────┐
│ 🟢 Listening · Recruiter speaking · FR          │
├─────────────────────────────────────────────────┤
│ Q: "Parle-moi d'un échec marquant."             │
│                                                 │
│ → Projet X — chiffre raté de 40% [CV.exp.3]    │
│ → Cause racine: scope mal cadré en kickoff      │
│ → Apprentissage appliqué sur projet Y [CV.exp.4]│
│                                                 │
│ ⏱ 2.8s · Sonnet 4.5 · cached                    │
└─────────────────────────────────────────────────┘
```

The overlay is **invisible to screen-share**, frameless, always-on-top, draggable, and switches language with the conversation.

---

## ⚡ How it works

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

**5 design choices that matter:**

1. **Two-channel audio** — mic = me, system = recruiter. No ML diarization, no BlackHole, no kernel extensions. ScreenCaptureKit only.
2. **Citation-required prompts** — every bullet citing a fact carries `[ref: CV.experience.<id>]`. A post-gen validator drops bullets with unresolved refs. **Zero hallucinations on my CV.**
3. **Triple-redundant pipeline** — Deepgram → AssemblyAI for STT, Claude → GPT-5 for LLM, full local fallback (Whisper.cpp + Ollama) when both clouds are down.
4. **Stealth that actually works on macOS 15+** — `NSWindow.sharingType = .none` is broken on Sequoia. We detect screen-share + mask the overlay + offer second-display routing instead.
5. **Single-egress `cloud::Client`** — every outbound HTTP/WS call routes through one Rust module. Privacy boundary is a `grep`, not a guideline.

**Cost:** ~$0.66/hour during a live interview (Deepgram + Claude + amortized prep brief).

---

## 🛠 Stack

<table>
<tr><th align="left">Layer</th><th align="left">Choice</th><th align="left">Why</th></tr>
<tr><td>Desktop shell</td><td>Tauri 2.10 + React 19 + Vite 6</td><td>Native perf, tiny binary, Rust core</td></tr>
<tr><td>macOS bridge</td><td>Swift sidecar (ScreenCaptureKit)</td><td>Only stable system-audio path on 13+</td></tr>
<tr><td>STT primary</td><td>Deepgram Nova-3 Multilingual</td><td>True FR↔EN code-switching, &lt;500ms</td></tr>
<tr><td>STT failover</td><td>AssemblyAI Universal-Streaming</td><td>Cross-cloud vendor diversity</td></tr>
<tr><td>LLM primary</td><td>Claude Sonnet 4.5+</td><td>90% prompt-cache discount on CV/JD</td></tr>
<tr><td>LLM failover</td><td>GPT-5 / 4o</td><td>Same prompt contract, hot-swap</td></tr>
<tr><td>Local degraded</td><td>whisper.cpp + Ollama (Qwen 2.5 / Llama 3.3)</td><td>Pre-warmed, no internet required</td></tr>
<tr><td>Vector store</td><td>LanceDB embedded</td><td>4MB idle, no IPC, Rust-native</td></tr>
<tr><td>Embeddings</td><td>BGE-small ONNX (local)</td><td>Privacy-first by default</td></tr>
<tr><td>Persistence</td><td>SQLite (sqlx) + JSONL transcripts</td><td>No raw audio, ever</td></tr>
<tr><td>Secrets</td><td>macOS Keychain (`keyring` crate)</td><td>Never in SQLite, never in bundle</td></tr>
<tr><td>CV parsing</td><td>Docling (IBM, Python sidecar)</td><td>Lossless structured extraction</td></tr>
</table>

---

## 🚀 Get started

> ⚠️ This is a personal tool, in active development. Phase 0 is shipping now; the live interview experience lands at Phase 6.

### Prerequisites

- macOS 13+ (15+ recommended)
- Rust (stable) + Cargo
- Node 20+ and `pnpm`
- Xcode Command Line Tools
- API keys: Deepgram, AssemblyAI, Anthropic, OpenAI, Tavily

### Run it

```bash
git clone https://github.com/Caezarr/interview-copilot.git
cd interview-copilot
pnpm install
pnpm tauri dev
```

First launch walks you through Microphone, Screen Recording, and Accessibility permissions before any feature unlocks. API keys are entered once and stored in macOS Keychain — never in plaintext, never in the frontend bundle.

### Common commands

```bash
pnpm tauri dev      # dev mode with hot reload
pnpm tauri build    # signed/notarised .dmg
cargo test          # Rust tests
pnpm test           # frontend tests
```

### Project layout

```
src/                  React frontend (dashboard + copilot overlay)
src-tauri/            Rust core (audio, STT, LLM, persistence, single-egress cloud)
src-tauri/migrations/ SQLite migrations
.planning/            GSD planning artifacts (PROJECT, REQUIREMENTS, ROADMAP, research)
```

---

## 🗺 Roadmap

Built in 7 phases. Phases 0–6 = shippable v1. Order is **not negotiable**.

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

Cross-cutting privacy posture (`PRIV-01..06`) runs across every phase.

📖 Full breakdown: [`.planning/ROADMAP.md`](.planning/ROADMAP.md) · Atomic requirements: [`.planning/REQUIREMENTS.md`](.planning/REQUIREMENTS.md)

---

## 🔒 Privacy by design

This tool listens to your interviews. That's a serious commitment. Here's what's enforced in code:

- ✅ **No raw audio on disk.** Transcripts only (JSONL). Easy purge.
- ✅ **All persistence local.** `~/Library/Application Support/com.caezarr.interview-copilot/`. **Never** iCloud / Dropbox / any cloud sync.
- ✅ **Single-egress `cloud::Client`.** One Rust module, every outbound call. Reviewable in 2 minutes.
- ✅ **API keys in Keychain.** Never SQLite. Never bundled. Never logged.
- ✅ **Zero-retention contracts** required from every vendor before Phase 6 ships.
- ✅ **PII-stripped logger** by default.

---

## ⚠️ Critical constraints (lessons baked in)

- macOS 15+ broke `NSWindow.sharingType = .none` for ScreenCaptureKit. Don't trust it as primary stealth.
- BlackHole and other virtual audio drivers break across macOS updates. ScreenCaptureKit is the only sane path.
- ML diarization for 2 speakers is overkill and unreliable. Channel-of-origin tagging is the answer.
- Each interview is its own snapshot. Contexts must never bleed between offers.
- Latency budget ≤ 5s, target 2.5–3.5s. Profiled at every milestone exit.

---

## 🤝 Contributing

This is a personal project, but the planning is in the open. If you're building something similar:

- The research notes in [`.planning/research/`](.planning/research/) (STACK, FEATURES, ARCHITECTURE, PITFALLS) are the most reusable artifacts.
- The [`CLAUDE.md`](CLAUDE.md) file is the canonical project orientation — read it first.
- Issues and questions welcome. PRs are not accepted at this stage (single-user scope).

---

## 📜 License

Personal project. No redistribution license granted at this stage. Open an issue if you want to discuss using parts of it.

---

<div align="center">

### *A teleprompter grounded in your own CV — not a cheat code, a coach you can keep on screen.*

Built with 🦀 Rust, ⚡ Tauri, ⚛️ React, and a healthy disrespect for `NSWindow.sharingType`.

</div>
