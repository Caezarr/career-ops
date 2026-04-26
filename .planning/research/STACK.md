# Stack Research — Interview Copilot (macOS Stealth Overlay)

**Domain:** Mac desktop AI overlay with live audio capture + STT streaming + LLM bullet generation
**Researched:** 2026-04-26
**Overall confidence:** HIGH on cloud APIs and Tauri ecosystem; MEDIUM on stealth/screen-share invisibility (Apple has actively closed the standard escape hatch in macOS 15+ — see `PITFALLS.md`)

---

## Executive Summary

The 2026 production stack for a stealth Mac interview copilot is well-defined for everything **except** the "invisible to screen-share" requirement, which has been broken by Apple since macOS 15 Sequoia. The standard recipe is:

- **Tauri 2.x** (Rust shell + React/TS frontend) for the desktop app — 10MB bundle, mature ecosystem, used by every public Cluely-clone (Pluely, Natively, OpenCluely)
- **Swift sidecar binary** invoked via Tauri's `tauri-plugin-shell` sidecar mechanism for ScreenCaptureKit audio capture — Tauri's Rust crates exist (`screencapturekit-rs`, `objc2-screen-capture-kit`) but the Swift path is more battle-tested and lets you also handle the macOS 15+ screen-share invisibility hack via Metal/CGS private APIs that are awkward from Rust
- **Deepgram Nova-3 multilingual** for STT (only provider with FR+EN code-switching in a single streaming session, GA April 2025) → **AssemblyAI Universal-Streaming** as failover
- **Claude Sonnet 4.5/4.6** as primary LLM (90% prompt-cache discount on the CV+JD context that you reuse every turn) → **GPT-5.x** as failover
- **LanceDB** as embedded vector store (4MB idle RAM, IVF_PQ, perfect for a Tauri app)
- **voyage-3-large** (or **voyage-3-lite** for cost) for embeddings — beats OpenAI v3-large by ~10% on multilingual benchmarks
- **whisper.cpp** (not MLX) for the local fallback — only it has true streaming (chunked mic input every 500ms); MLX-Whisper is faster batch but no streaming binary
- **Ollama** + Llama 3.3 8B / Qwen 2.5 14B as local LLM fallback — slower than MLX but has stable HTTP API, integrates trivially
- **Tavily** for the 5-10 min company brief — predictable cost, sub-500ms, good enough quality. Exa if you later want semantic over keyword.
- **Docling** (IBM) for CV PDF parsing — 97.9% accuracy on complex tables, handles French
- **`tauri-plugin-global-shortcut`** + **`tauri-plugin-macos-permissions`** for the discreet hotkey trigger

The **single biggest risk** is the macOS 15+ screen-share exclusion problem. `NSWindow.sharingType = .none` is officially ignored by ScreenCaptureKit since Sequoia. The only workarounds in the wild are (a) Cluely-style Metal/GPU display-output rendering (private/undocumented), (b) keep a "translucent + dock-hidden + screen-share-detect → blur" defensive posture (Pluely's approach), or (c) accept that the overlay may be visible if the recruiter actively screen-records, and rely on screen-share *detection* (mode paranoid) rather than true invisibility. **Plan for (b) + (c) in v1, investigate (a) only if validated.**

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Tauri** | 2.10.x (latest 2026-03) | Desktop shell (Rust + WebView) | 10MB bundle vs Electron's 100MB+. Used by Pluely, Natively, OpenCluely (every Cluely-alternative is Tauri). Native Rust = direct access to ScreenCaptureKit crates and macOS APIs without N-API overhead. WebView2/WKWebView gives full React/TS DX for the overlay UI. **HIGH confidence.** |
| **React** + **TypeScript** | React 19 / TS 5.6+ | Frontend / overlay UI | Standard. The bullet rendering needs streaming markdown + smooth animations — React is fine, no need for Solid/Svelte unless you measure perf issues. |
| **Vite** | 6.x | Frontend bundler | Tauri 2 default. Sub-second HMR. |
| **Rust** | 1.81+ (2024 edition) | Tauri backend, audio piping, STT WS clients | Required by Tauri. Use it for performance-critical paths (audio buffer routing, WebSocket multiplexing to Deepgram/AssemblyAI). |
| **Swift sidecar binary** | Swift 5.10+ / Xcode 16 | ScreenCaptureKit audio capture, screen-share detection, dock-hide, NSWindow tweaks | The Rust ScreenCaptureKit crates (`screencapturekit` 0.3.x, `objc2-screen-capture-kit` 0.3.x) work but lag Apple API surface. A 100-line Swift binary spawned as Tauri sidecar via stdio gives you the full SCStream API and is what every production app does. **HIGH confidence — this is the de-facto pattern.** |
| **Deepgram Nova-3 Multilingual** | API GA Feb 2025, multilingual GA Apr 2025 | Primary STT (streaming + diarization + FR↔EN code-switching) | Only provider with **single-stream FR+EN code-switching** (`language=multi` parameter). Up to 40× faster than competitors with diarization enabled. Median latency <300ms. Zero-retention contract available. $0.0058/min streaming + $0.002/min diarization ≈ **$0.46/hour**. Direct match for LIVE-01, LIVE-02, LIVE-07. **HIGH confidence.** |
| **AssemblyAI Universal-Streaming (Slam-1)** | Released Oct 2025 | Failover STT | Multilingual streaming with 6+ languages including FR/EN. ~3× cheaper than Deepgram at scale ($0.15-0.17/hour streaming). Slightly worse code-switching, but a solid failover. Supports zero-retention. |
| **Anthropic Claude Sonnet 4.5** (or 4.6 if available in API at build time) | API model `claude-sonnet-4-5-20250929` or successor | Primary LLM (bullet generation) | TTFT 500-1100ms streaming, 88% accuracy on backend reasoning benchmarks, **90% prompt-caching discount** on the CV+JD+memory context (huge — that context is reused every question). Zero-retention via DPA. ~$3/M input, $15/M output but with cache effective input drops to ~$0.30/M. Direct match for LIVE-04. **HIGH confidence.** |
| **OpenAI GPT-5.x** (or GPT-4o if 5.x not yet GA at build) | Latest API model | Failover LLM | Streaming, similar latency, fallback if Anthropic has an outage. Less prompt-caching savings. |
| **LanceDB** | 0.20+ (Rust crate `lancedb`) | Embedded vector store (long-term memory, RAG over past transcripts) | 4MB idle RAM / 150MB during search vs Qdrant's constant 400MB. Native Rust — embeds into Tauri Rust backend with zero IPC. Disk-based IVF_PQ scales beyond memory. **The "SQLite of vector DBs"** — exactly what an embedded local-first app needs. **HIGH confidence.** |
| **SQLite** + **`rusqlite`** | SQLite 3.46+ / rusqlite 0.32+ | Local relational store (transcripts, snapshots, JDs, profile, feedback) | Standard. Pair with LanceDB (separate file) — vector for semantic, SQLite for structured. |
| **voyage-3-large** | API (Voyage AI) | Embeddings (FR + EN) | Beats `text-embedding-3-large` by ~10% on MTEB multilingual; beats Cohere v3 multilingual by ~3%. 1024-dim default, 32k context. ~$0.18/1M tokens. **For a personal app the cost is negligible** ($1-2 lifetime for the user's transcript corpus). Use **voyage-3-lite** if you want to halve cost with marginal quality drop. **MEDIUM-HIGH confidence** (Voyage is less mainstream than OpenAI but consistently leads MTEB-Multilingual). |
| **whisper.cpp** | latest (ggml-org/whisper.cpp, large-v3-turbo q5_0) | Local STT fallback (degraded mode) | Has `stream` binary that does real-time mic transcription with 500ms chunks — only Whisper variant with proven streaming. MLX-Whisper is 30-40% faster but **only batch**. Quality of `large-v3-turbo` is good enough for bullets, even in FR. **HIGH confidence.** |
| **Ollama** | 0.5+ | Local LLM fallback (degraded mode) | Stable HTTP API at localhost:11434, automatic model loading, runs Llama 3.3 8B and Qwen 2.5 14B comfortably on M-series. Slower than raw MLX (40 tok/s vs 230 tok/s on M2 Ultra) but the API stability + ecosystem trumps for fallback path. Use **Qwen 2.5 14B** for FR quality, **Llama 3.3 8B** for speed. **HIGH confidence.** |
| **Tavily Search API** | Current (2026) | Company / role research (5-10 min brief) | Predictable flat $0.008/credit pricing, ultra-fast mode 90-200ms, designed for AI agents, returns clean snippets. PREP-03 fits this perfectly — you don't need Exa's semantic depth or Firecrawl's full-page extraction for "research the company in 10 min." **HIGH confidence.** |
| **Docling** | 2.x (IBM Research, docling-project/docling) | CV PDF/docx parsing | 97.9% accuracy on complex tables, layout-aware (DocLayNet), handles French. Better than Unstructured (faster + more accurate on tables) and `marker` (which is good for academic papers but less for résumé layouts). **HIGH confidence.** |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tauri-plugin-global-shortcut` | 2.x (matches Tauri 2.10) | Cmd+Shift+? hotkey for manual question trigger / overlay show-hide | LIVE-03 override hotkey. Requires `tauri-plugin-macos-permissions` to nudge the user through Accessibility. |
| `tauri-plugin-macos-permissions` | 2.3.0+ | Check + request Accessibility, Microphone, Screen Recording permissions | Mandatory on Sequoia — these prompts must be pre-checked before any audio capture or hotkey registration; otherwise the app silently fails. |
| `tauri-plugin-store` | 2.x | Local key-value config (preferences, last-used JD, hotkey config) | Tiny config that doesn't justify a SQLite table. |
| `tauri-plugin-fs` | 2.x | File access for CV upload + transcript export | Standard; lock down scopes carefully. |
| `tauri-plugin-shell` | 2.x | Spawn the Swift sidecar binary | Sidecar mechanism for the Swift audio-capture process. |
| `tauri-plugin-log` | 2.x | Local diagnostic logs | For Tier-1 reliability you need post-session logs to debug failover events. |
| `tauri-plugin-window-state` | 2.x | Remember overlay position/size across sessions | Quality-of-life. |
| `screencapturekit-rs` | 0.3.x | (Optional alt) Pure-Rust ScreenCaptureKit bindings | If you want to avoid the Swift sidecar entirely. Includes a Tauri example. **Lags Apple SDK by ~6 months** — use only if your audio needs are basic. |
| `cpal` | 0.15+ (with PR #894 merged) | Cross-platform audio if you want a portable layer | For mic capture only. ScreenCaptureKit handles system audio; cpal handles mic in pure Rust. PR #894 adds ScreenCapture loopback support. |
| `rdev` or `device_query` | latest | Lower-level keyboard listening if global-shortcut isn't enough | Fallback for tricky hotkey combos; uses CGEventTap on macOS (needs Accessibility perm). |
| `reqwest` (with `eventsource-stream`) | 0.12+ | HTTP/SSE client to Anthropic / OpenAI | Standard streaming HTTP. |
| `tokio-tungstenite` | 0.24+ | WebSocket client to Deepgram / AssemblyAI | Both STT vendors are WS-based. |
| `serde` + `serde_json` | 1.x | (De)serialization across Tauri IPC and APIs | Standard. |
| `tracing` + `tracing-subscriber` | latest | Structured logs in Rust backend | Pair with `tauri-plugin-log` for the app side. |
| `lancedb` Rust crate | 0.20+ | LanceDB native binding (no Python) | Embeds directly into the Tauri Rust process. |
| `arrow-rs` | 53+ | Underlying columnar format for LanceDB | Pulled in transitively. |
| `pdf-extract` or call Docling via Python sidecar | — | If avoiding Python: `pdf-extract` (Rust) gives basic text. Otherwise Docling Python package as sidecar. | Recommend **Docling sidecar** for quality. Layout/table extraction in pure Rust isn't there yet. |
| `whisper-rs` | 0.13+ | whisper.cpp Rust bindings | If you want to embed whisper.cpp in-process rather than spawn the binary. Slightly more complex but no IPC overhead. |
| `ollama-rs` | 0.2+ | Ollama HTTP client in Rust | Trivial wrapper; or just use `reqwest` directly (the API is 3 endpoints). |

### macOS-Specific Bridge Layer

| Component | Implementation | Purpose |
|-----------|----------------|---------|
| **Audio capture sidecar** | Swift binary using `SCStream` + `SCContentFilter` (system audio) + `AVCaptureSession` (mic). Sends interleaved 16kHz PCM frames over stdout to Tauri Rust backend. | Captures mic + system audio simultaneously with sample-aligned timestamps for downstream diarization (LIVE-01). |
| **Screen-share detector sidecar** | Swift binary using `SCShareableContent.current()` polling + Quartz `CGSConnection` private API to detect active screen-recording sessions. | Triggers paranoid mode (LIVE-06) — blur or hide overlay when active screen-share detected. |
| **Window stealth** | Swift sidecar applies: `NSWindow.sharingType = .none` (best-effort, broken on 15+), `NSWindow.collectionBehavior = [.canJoinAllSpaces, .stationary, .ignoresCycle]`, `setLevel(.screenSaver)` for always-on-top, `LSUIElement` Info.plist key to hide dock icon. | Maximize stealth on macOS 13/14 and degrade gracefully on 15+. |
| **Permissions UX** | `tauri-plugin-macos-permissions` walks user through Mic + Screen Recording + Accessibility prompts on first launch. | LIVE-01 and LIVE-03 require all three. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `cargo` + `cargo-watch` | Rust build | Standard. |
| `pnpm` | Frontend package manager | Tauri 2 default; faster than npm. |
| `tauri-cli` 2.x | Build / dev / bundle | `cargo install tauri-cli --version "^2.0"`. |
| Xcode 16 | Required for Swift sidecar build + codesigning | Even with Tauri, you need codesigning + notarization for the sidecar to run without Gatekeeper warnings. |
| `apple-codesign` Rust crate or `rcodesign` CLI | Codesign the bundle outside Xcode | If you want CI-friendly signing. |
| Apple Developer account ($99/yr) | Distribution + notarization | Required for friction-free install on user's Mac. |
| `mise` or `asdf` | Tool versioning | Pin Rust + Node + Swift toolchain. |

---

## Installation (representative)

```bash
# Tauri 2 + frontend
pnpm create tauri-app interview-copilot --template react-ts
cd interview-copilot
pnpm install
cargo install tauri-cli --version "^2.0"

# Tauri plugins (Cargo.toml + JS)
cargo add tauri-plugin-global-shortcut tauri-plugin-shell tauri-plugin-fs \
  tauri-plugin-store tauri-plugin-log tauri-plugin-window-state \
  tauri-plugin-macos-permissions

pnpm add @tauri-apps/plugin-global-shortcut @tauri-apps/plugin-shell \
  @tauri-apps/plugin-fs @tauri-apps/plugin-store @tauri-apps/plugin-log \
  @tauri-apps/plugin-window-state

# Audio + STT + LLM (Rust)
cargo add reqwest --features "json,stream,rustls-tls" \
  tokio --features "full" \
  tokio-tungstenite --features "rustls-tls-native-roots" \
  serde serde_json eventsource-stream tracing tracing-subscriber \
  lancedb whisper-rs ollama-rs

# Optional: pure-Rust ScreenCaptureKit (alternative to Swift sidecar)
cargo add screencapturekit objc2 objc2-screen-capture-kit

# Frontend dependencies
pnpm add @anthropic-ai/sdk openai @deepgram/sdk
pnpm add -D @types/node tailwindcss @types/react@^19

# Local fallback (user installs separately)
brew install whisper-cpp ollama
ollama pull qwen2.5:14b llama3.3:8b
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **Tauri 2** | **Native Swift / SwiftUI** | If you hit a hard wall on the macOS 15+ screen-share invisibility problem and the only fix is private CGS / Metal display-link APIs that are awkward from Rust. SwiftUI gives you direct access. **Cost:** rebuild the entire UI layer + lose the option to ever go cross-platform. Recommend Tauri first; pivot to native if Phase 4 (stealth) blocks. |
| **Tauri 2** | **Electron 33+** | Electron now supports ScreenCaptureKit loopback audio out of the box (less Swift sidecar work). But Electron bundles 100MB+, has higher memory, and the stealth/screen-share story is identical (broken on 15+). Tauri's lighter footprint matters more for a single-user perf-sensitive overlay. |
| **Deepgram Nova-3 Multilingual** | **Speechmatics** | Speechmatics has the strongest diarization brand and offers diarization as a base feature (no add-on cost). Use it as the third failover or if Deepgram's FR diarization quality disappoints in real testing. ~55 languages. |
| **Deepgram → AssemblyAI failover** | **OpenAI Realtime API** | NOT recommended as primary — OpenAI Realtime has no native diarization, biases on accents, no proven FR streaming quality at GA (Aug 2025). Skip it. |
| **Claude Sonnet 4.5** | **GPT-5.x** | GPT is the failover. Use as primary only if you have strong reasons (you already pay OpenAI heavily, or Anthropic geographic outage in your region). Sonnet's 90% prompt cache + lower TTFT on streaming wins for this exact use case. |
| **LanceDB** | **Qdrant local (embedded mode)** | If you need >95% recall on 10k+ vectors — Qdrant's HNSW beats LanceDB's IVF_PQ in recall. But for a personal app with maybe 5k chunks (transcripts of a year of interviews), LanceDB's RAM advantage wins. Qdrant constantly holds 400MB; LanceDB 4MB idle. |
| **LanceDB** | **sqlite-vec** | If you want a single SQLite file for *everything* (relational + vector). Trade-off: sqlite-vec is younger (1.0 not yet at time of writing), uses brute-force search (no ANN index pre-2025), and is slower beyond ~10k vectors. Fine for v1 if simplicity matters; LanceDB scales better to a year of transcripts. |
| **voyage-3-large** | **`text-embedding-3-small` (OpenAI)** | Cheaper (~$0.02/1M tokens vs $0.18/1M), simpler if you already use OpenAI. ~9% worse on MTEB-Multilingual. For 1 user, the absolute cost difference is rounding error — pick on quality. |
| **voyage-3-large** | **BGE-M3 (self-hosted)** | If you want zero cloud calls for embeddings (perfect privacy alignment). Run on the M-series NPU via MLX or on-CPU via fastembed. ~3% behind Voyage on FR. Adds 1-2GB model footprint to the app. **Strong v2 candidate** if you want to make the app fully local-capable. |
| **whisper.cpp (streaming)** | **MLX-Whisper** | Faster (1.0s vs 1.2s avg on large-v3 batch) but no streaming — only batch chunks. If you accept 5-second buffer windows and post-process in batch, MLX is better. For LIVE-04's 2-5s requirement, whisper.cpp's streaming is the right primitive. |
| **Ollama** | **LM Studio (MLX backend)** | LM Studio with MLX gets ~26-60% more tok/s on Apple Silicon. But LM Studio is GUI-first and its server is less documented for headless integration. For a fallback you'll trigger 1-2× per session, Ollama's stability and CLI scripting wins. |
| **Tavily** | **Exa** | Exa is semantic-first, indexes LinkedIn, has an explicit "company search" index. Better for "find Series B fintech companies in Singapore" — overkill for "give me 5 facts about Acme Corp for my interview brief." Use Tavily for v1, swap or stack Exa later if research quality flags. |
| **Tavily** | **Firecrawl** | Firecrawl is best for full-page clean extraction (e.g., scrape the company's about page, scrape the hiring manager's blog). Lower latency than Tavily for extraction but higher for search. **Stack both** if budget allows: Tavily for search, Firecrawl for deep-extract on top URLs. |
| **Docling** | **`unstructured`** | `unstructured` is slower (51s/page vs Docling sub-second on layout) and weaker on complex tables. Use only if you already have an `unstructured` pipeline. |
| **Docling** | **Marker** | Marker is excellent for academic PDFs (math, figures, multi-column). Résumés are simpler — Docling's table+layout focus is the right primitive. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Electron** | 100MB bundle, 200MB+ RAM, Node.js IPC overhead. Single advantage (built-in ScreenCaptureKit loopback in v33+) is offset by Tauri's tighter Rust integration with audio. | Tauri 2 + Swift sidecar |
| **`NSWindow.sharingType = .none`** as your *primary* stealth mechanism | **Officially ignored by ScreenCaptureKit on macOS 15+** (confirmed by Apple in dev forums + `tauri-apps/tauri#14200`). Will silently fail for any Sequoia user. | (a) Set it anyway as 13/14 best-effort. (b) Layer screen-share **detection** (poll `SCShareableContent.current()`) → blur overlay (LIVE-06). (c) Treat true invisibility as out-of-scope for v1; revisit only if you research the Cluely Metal-display-link technique and accept private-API risk. |
| **OpenAI Whisper API (`whisper-1`)** for live transcription | Batch-only (no streaming), no diarization, no code-switching | Deepgram Nova-3 Multilingual |
| **Pinecone / Weaviate Cloud** | Cloud-only, monthly minimums, latency hop, defeats the local-first privacy story | LanceDB (local) |
| **ChromaDB** | Python-first, awkward to embed in Rust/Tauri without a Python sidecar, less mature than LanceDB on disk format | LanceDB |
| **OpenAI Realtime API** as primary STT | No native diarization, biases on accents, no proven multilingual streaming, 25MB chunk limit. Designed for voice agents, not stenographer-grade ASR. | Deepgram Nova-3 |
| **Faster-whisper** for local fallback | CTranslate2 backend isn't optimized for Apple Silicon (no Metal). MLX or whisper.cpp both beat it on M-series. | whisper.cpp (streaming) or MLX-Whisper (batch) |
| **`text-embedding-ada-002`** | Deprecated; OpenAI v3 superseded it | voyage-3-large or `text-embedding-3-small` |
| **`pdf-extract` (Rust) alone** for CV parsing | Plain text only — loses bullet structure, dates, columns. Résumés are visually structured. | Docling (Python sidecar) |
| **Hard-coded API keys in Tauri frontend** | Frontend bundle is decompilable. Keys leak. | Store in Rust backend only; frontend never sees them. Use `tauri-plugin-store` with macOS Keychain integration (`keyring` crate) for the user's keys. |
| **Storing raw audio to disk** | Privacy commitment is "audio doesn't persist." Logging buffers to disk for debugging breaks that. | Stream → STT → drop. Only persist transcripts + embeddings. |

---

## Stack Patterns by Variant

**If macOS 15+ screen-share invisibility blocks you in Phase 4:**
- Plan A (recommended v1): Accept that the overlay may be visible to the screen-share user under recording, and double-down on (a) screen-share **detection** + auto-blur (LIVE-06), (b) dock-hidden via `LSUIElement`, (c) translucent overlay that's hard to OCR even if captured.
- Plan B (if validation shows that's not enough): Spawn a separate Swift overlay window using Metal CADisplayLink + `kCGSDebugOptionExcludeFromCapture` (private CGS API). High risk of breaking on minor macOS updates and possible App Store rejection (irrelevant here — direct distribution). This is what Cluely allegedly does.
- Plan C: Pivot to native SwiftUI for the overlay window only, keeping Tauri for everything else (a hybrid where Tauri owns the brain, Swift owns the eyeballs).

**If cloud APIs are slow / expensive in real testing:**
- Drop voyage-3-large to **voyage-3-lite** (cuts embed cost ~50%, marginal quality loss)
- Use Deepgram Nova-2 instead of Nova-3 if you don't need code-switching for a given session (slightly cheaper, identical latency)
- Switch to **Haiku 4.5** for first-bullet streaming and Sonnet 4.5 for the full answer — staged generation cuts perceived latency

**If you want to harden privacy further (user request):**
- Replace voyage-3 with **BGE-M3 self-hosted** via MLX
- Replace Deepgram with **whisper.cpp + simple-VAD-diarization** (degraded quality but fully local — currently your "Tier-1 down" mode, becomes the default in this variant)
- All cloud calls become opt-in. Accept the ~30% transcription quality loss and the fact that streaming becomes near-batch.

**If validation succeeds and you want to ship cross-platform later:**
- Tauri already supports Windows (loopback audio via WASAPI) and Linux (PulseAudio/PipeWire) — you'd write three audio sidecars total. Native Swift would be a rewrite.

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Tauri 2.10 | Rust 1.81+ | Tauri 2 stable since Oct 2024; 2.10 is current as of March 2026. |
| Tauri 2.10 | macOS 10.15+ | But you're targeting 13+ for ScreenCaptureKit. |
| ScreenCaptureKit | macOS 13.0+ for system audio; **macOS 15.0+ for native microphone capture in SCStream** | Pre-15 you need AVCaptureSession for mic + ScreenCaptureKit for system audio + your own mixing. 15+ unifies it. Document both code paths. |
| Deepgram Nova-3 Multilingual | WebSocket protocol v1 | Stable. `language=multi` parameter required for code-switching mode. |
| Anthropic API | streaming via SSE; prompt-cache via `cache_control: {"type": "ephemeral"}` headers | Cache TTL is 5 min default, 1 hour beta. The CV+JD context fits 5min easily within an interview. |
| LanceDB 0.20 | arrow-rs 53.x | Pulled transitively. |
| whisper.cpp | macOS 13+ for Metal acceleration; CoreML for Whisper on M-series via converted models | Build with `WHISPER_METAL=1` for full GPU offload. |
| Ollama 0.5+ | macOS 12+ | M-series uses Metal automatically. |

---

## FR + EN Specific Notes (LIVE-02)

- **Deepgram Nova-3 Multilingual** is the only mainstream STT with **single-stream FR↔EN code-switching** (live language switching mid-sentence) as of 2025. AssemblyAI Slam-1 (Oct 2025) supports multilingual streaming for 6 languages but with weaker code-switching mid-utterance. Use Deepgram primary; AssemblyAI failover.
- For embeddings, **voyage-3-large** outperforms OpenAI v3-large on FR benchmarks by ~10%. BGE-M3 is the strongest fully-local option for FR (>1000 languages, dense+sparse hybrid).
- For the LLM, both Claude Sonnet 4.5 and GPT-5.x are excellent in French. Anthropic has made noticeable French-quality progress in the 4.x line. No quality gap that would force a choice.
- For local fallback, **Qwen 2.5 14B** has substantially better FR than Llama 3.3 8B. Recommend Qwen as the FR fallback model and Llama 3.3 as the EN fallback (smaller, faster).
- For CV parsing, **Docling** handles French diacritics and accents reliably. Test with 2-3 real French CVs in v1 to confirm.

---

## Cost Estimates (per hour of live interview)

| Item | Rate | Per hour |
|------|------|----------|
| Deepgram Nova-3 Multilingual streaming + diarization | $0.0058/min + $0.002/min | **$0.46** |
| Claude Sonnet 4.5 (assume 8 questions × 5k input cached + 2k input fresh + 500 output tokens) | input: 5k @ $0.30/M cached + 2k @ $3/M; output: 500 @ $15/M = ~$0.015/turn × 8 = **$0.12** |
| voyage-3-large (RAG queries, ~10 queries × 1k tokens) | $0.18/1M | **$0.002** (negligible) |
| Tavily research (per brief, amortized once per JD) | $0.008/credit, ~10 credits per brief | **$0.08 amortized** |
| **Total per live interview hour** | | **~$0.66** (well under the $1-3 budget target) |

Failover paths (AssemblyAI + GPT-5) cost roughly the same order of magnitude. Local degraded mode is free at runtime (one-off model download).

---

## Confidence Assessment per Recommendation

| Recommendation | Confidence | Basis |
|----------------|------------|-------|
| Tauri 2 over Electron | HIGH | Three production stealth-overlay clones use it (Pluely, Natively, OpenCluely). Direct Rust → ScreenCaptureKit access. Audited stable since Oct 2024. |
| Swift sidecar over pure Rust SCK | HIGH | Confirmed by Tauri Discussion #9581, multiple production examples. Rust crates exist but lag Apple SDK. |
| Deepgram Nova-3 Multilingual primary | HIGH | Verified GA dates (Feb 2025 / multilingual Apr 2025), code-switching documented, zero-retention contract documented, pricing verified on Deepgram pricing page. |
| AssemblyAI failover | HIGH | Verified Slam-1 release Oct 2025, multilingual streaming. |
| Claude Sonnet 4.5/4.6 primary LLM | HIGH | Verified TTFT 500-1100ms, prompt caching 90% discount documented, current model in API. |
| LanceDB vector store | HIGH | Verified RAM profile (4MB idle), Tauri-friendliness, native Rust crate. |
| voyage-3-large embeddings | MEDIUM-HIGH | Verified MTEB-Multilingual leadership; less mainstream than OpenAI but consistently top-of-leaderboard. |
| whisper.cpp local fallback (vs MLX) | HIGH | Only Whisper variant with proven streaming binary; MLX is batch-faster but not streaming. |
| Ollama local LLM (vs LM Studio MLX) | HIGH for ops simplicity, MEDIUM for raw perf — LM Studio + MLX is faster but harder to script |
| Tavily for company brief | HIGH | Pricing + latency verified, fits use case. |
| Docling for CV parsing | HIGH | 97.9% accuracy verified in independent benchmark. |
| **NSWindow.sharingType = .none** as stealth | **LOW (it's broken on 15+)** | Officially confirmed broken; only useful as 13/14 best-effort. The stealth requirement (LIVE-05) needs a fundamental rethink — see PITFALLS.md. |

---

## Sources

### Tauri / Desktop shell
- [Tauri 2.0 Stable Release](https://v2.tauri.app/blog/tauri-20/) — confirmed stable since Oct 2024
- [Tauri releases](https://github.com/tauri-apps/tauri/releases) — 2.10.x current as of March 2026
- [tauri-apps/tauri Discussion #9581 — Native Swift with Tauri V2](https://github.com/tauri-apps/tauri/discussions/9581) — Swift sidecar pattern
- [Embedding External Binaries (Tauri sidecar docs)](https://v2.tauri.app/develop/sidecar/) — sidecar mechanism
- [Pluely (Tauri Cluely-alternative, 10MB)](https://github.com/iamsrikanthnani/pluely) — production Tauri stealth overlay reference
- [Natively (open-source Cluely alternative)](https://github.com/Natively-AI-assistant/natively-cluely-ai-assistant) — Rust-based <500ms latency reference

### Stealth / screen-share invisibility
- [tauri-apps/tauri Issue #14200 — macOS 15+ ScreenCaptureKit ignores setContentProtection / NSWindow.sharingType](https://github.com/tauri-apps/tauri/issues/14200) — **critical, confirms breakage on Sequoia**
- [Apple Developer Forums — On macOS 15.4+, NSWindow with sharingType .none](https://developer.apple.com/forums/thread/792152)
- [Michael Tsai — Sequoia Screen Recording Prompts](https://mjtsai.com/blog/2024/08/08/sequoia-screen-recording-prompts-and-the-persistent-content-capture-entitlement/)

### ScreenCaptureKit / audio capture
- [Apple ScreenCaptureKit docs](https://developer.apple.com/documentation/screencapturekit/)
- [Capturing screen content in macOS (Apple)](https://developer.apple.com/documentation/ScreenCaptureKit/capturing-screen-content-in-macos)
- [doom-fish/screencapturekit-rs (Rust crate, includes Tauri example)](https://github.com/doom-fish/screencapturekit-rs)
- [objc2-screen-capture-kit (lower-level objc2 bindings)](https://lib.rs/crates/objc2-screen-capture-kit)
- [Mixing ScreenCaptureKit audio with mic (Apple Forums)](https://developer.apple.com/forums/thread/747303)

### STT
- [Deepgram Nova-3 announcement](https://deepgram.com/learn/introducing-nova-3-speech-to-text-api)
- [Nova-3 Multilingual major WER improvements](https://deepgram.com/learn/nova-3-multilingual-major-wer-improvements-across-languages)
- [Deepgram Multilingual Code Switching docs](https://developers.deepgram.com/docs/multilingual-code-switching) — `language=multi` parameter
- [Deepgram pricing](https://deepgram.com/pricing) — $0.46/hour Nova-3
- [Deepgram HIPAA / data privacy](https://developers.deepgram.com/trust-security/data-privacy-compliance) — zero-retention details
- [AssemblyAI vs Deepgram comparison](https://brasstranscripts.com/blog/assemblyai-vs-deepgram-pricing-high-volume-comparison)
- [Speechmatics realtime diarization docs](https://docs.speechmatics.com/speech-to-text/realtime/realtime-diarization)
- [Best speech-to-text APIs comparison 2026 (Deepgram)](https://deepgram.com/learn/best-speech-to-text-apis-2026)

### LLM
- [Anthropic Claude prompt caching docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) — 90% discount on cached content
- [Anthropic models overview](https://docs.anthropic.com/en/docs/about-claude/models)
- [Artificial Analysis — Claude Sonnet 4.5 latency benchmarks](https://artificialanalysis.ai/models/claude-4-5-sonnet/providers) — TTFT 1.10s
- [Artificial Analysis — Claude Sonnet 4.6](https://artificialanalysis.ai/models/claude-sonnet-4-6/providers)
- [Anthropic API pricing 2026 guide](https://www.finout.io/blog/anthropic-api-pricing)

### Vector store
- [LanceDB vs Qdrant benchmark (Threads, B. Sunter)](https://www.threads.com/@bsunter/post/DQfwyv-iX5z) — 4MB idle vs 400MB
- [LanceDB vs Qdrant comparison (Sergei Petrov)](https://medium.com/@plaggy/lancedb-vs-qdrant-caf01c89965a)
- [Vector Database Comparison 2026 (4xxi)](https://4xxi.com/articles/vector-database-comparison/)
- [sqlite-vec GitHub](https://github.com/asg017/sqlite-vec)
- [Using sqlite-vec in Rust (Alex Garcia)](https://alexgarcia.xyz/sqlite-vec/rust.html)

### Embeddings
- [voyage-3-large announcement](https://blog.voyageai.com/2025/01/07/voyage-3-large/) — 9.74% over OpenAI v3-large multilingual
- [voyage-3 / voyage-3-lite](https://blog.voyageai.com/2024/09/18/voyage-3/)
- [Best Embedding Models 2025 (MTEB)](https://app.ailog.fr/en/blog/guides/choosing-embedding-models)
- [BGE-M3 model (BAAI)](https://huggingface.co/BAAI/bge-m3)

### Local fallback
- [whisper.cpp GitHub (ggml-org)](https://github.com/ggml-org/whisper.cpp) — has streaming binary
- [MLX-Whisper vs whisper.cpp benchmark 2026](https://notes.billmill.org/dev_blog/2026/01/updated_my_mlx_whisper_vs._whisper.cpp_benchmark.html)
- [Ollama vs LM Studio 2026](https://www.morphllm.com/comparisons/ollama-vs-lm-studio)
- [Local AI with MLX on the Mac (Schall)](https://www.markus-schall.de/en/2025/09/mlx-on-apple-silicon-as-local-ki-compared-with-ollama-co/) — MLX 230 tok/s vs Ollama 40 tok/s

### Web research APIs
- [Firecrawl Tavily alternatives breakdown](https://www.firecrawl.dev/blog/tavily-alternatives)
- [Best AI Search Engines for Agents 2026 (Firecrawl)](https://www.firecrawl.dev/blog/best-ai-search-engines-agents)
- [Exa vs Tavily comparison](https://exa.ai/versus/tavily)
- [Agentic Search benchmark 2026 (AIMultiple)](https://aimultiple.com/agentic-search)

### CV / PDF parsing
- [Docling GitHub (IBM Research)](https://github.com/docling-project/docling)
- [PDF Data Extraction Benchmark 2025 (Procycons)](https://procycons.com/en/blogs/pdf-data-extraction-benchmark/) — Docling 97.9% complex tables

### Tauri plugins
- [tauri-plugin-global-shortcut](https://v2.tauri.app/plugin/global-shortcut/)
- [tauri-plugin-macos-permissions 2.3.0](https://docs.rs/crate/tauri-plugin-macos-permissions/latest)

### Cluely / similar products (architecture references)
- [Pluely — Tauri-based Cluely alternative](https://github.com/iamsrikanthnani/pluely)
- [Natively — Rust-based AI interview copilot](https://github.com/Natively-AI-assistant/natively-cluely-ai-assistant)
- [How Cluely is detected (Fabric)](https://fabrichq.ai/blogs/how-to-detect-cluely-in-interviews) — describes Metal/GPU display-output rendering trick

---

*Stack research for: macOS stealth interview-copilot overlay (Tauri + Swift sidecar)*
*Researched: 2026-04-26*
