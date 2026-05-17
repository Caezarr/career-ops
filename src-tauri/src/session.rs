//! Continuous session mode.
//!
//! ## Sprint 1 architecture (2026-05-17)
//!
//! INTERVIEWER side (system audio from SCK / Core Audio Tap):
//!   VAD-segments the f32 audio stream into one WAV per utterance,
//!   POSTs each WAV to the Career OS Worker's `/v1/copilot/stt` route
//!   (which calls AssemblyAI batch), then emits one
//!   `interviewer-utterance` Tauri event per transcribed utterance.
//!   That event drives the 4-second debouncer that fires Claude.
//!
//! USER side (candidate's mic — unchanged from Phase 4b):
//!   Continues to use the AssemblyAI streaming WebSocket with
//!   per-word partials at 4 Hz. The teleprompter cursor depends on
//!   these — never break this side.
//!
//! The pre-Sprint-1 interviewer-side AAI streaming WebSocket and all
//! its plumbing (`run_aai_stream(StreamSide::Interviewer, …)`,
//! `StreamSide` enum) were stripped. The user-side stream now uses
//! `run_user_aai_stream` directly without the polymorphic helper.

use crate::audio::SYSTEM_AUDIO_TAP_SENTINEL;
use crate::audio_capture_sck::LiveSystemAudioSck;
use crate::audio_tap::LiveSystemAudio;

// macOS Tahoe 26 added a Core Audio Tap regression that delivers
// all-zero buffers (Apple Developer Forums thread 825780). When the
// user routes to `SYSTEM_AUDIO_TAP_SENTINEL`, we now try
// ScreenCaptureKit first (independent capture path) and only fall
// back to the legacy tap if SCK can't start. The two impls have the
// same `buffer + rate` shape; this enum hides the source choice from
// the downstream WS reader.
enum SystemAudioSource {
    Sck(LiveSystemAudioSck),
    Tap(LiveSystemAudio),
}

impl SystemAudioSource {
    fn buffer(&self) -> Arc<Mutex<Vec<f32>>> {
        match self {
            Self::Sck(s) => s.buffer.clone(),
            Self::Tap(t) => t.buffer.clone(),
        }
    }
    fn rate(&self) -> u32 {
        match self {
            Self::Sck(s) => s.rate,
            Self::Tap(t) => t.rate,
        }
    }
    fn label(&self) -> &'static str {
        match self {
            Self::Sck(_) => "screencapturekit",
            Self::Tap(_) => "core-audio-tap",
        }
    }
}
use crate::{llm, stt, vad, CaptureConfig};
use anyhow::{anyhow, Context, Result};
use bytes::Bytes;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{SampleFormat, StreamConfig};
use futures_util::{SinkExt, StreamExt};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};
use tokio::sync::{mpsc, oneshot};
use tokio::task::JoinHandle;
use tokio_tungstenite::{connect_async, tungstenite::Message};
use tracing::{info, warn};

/// T1 (2026-05-16): minimum word count of an accumulated turn before we
/// allow the debouncer to fire Claude. Anything shorter than this is
/// almost always a filler greeting ("Bonjour", "Yes", "OK") or a noise
/// shard that AAI promoted to a turn without a real question behind it.
/// Tuned by observation — 4 words is the floor below which Pluely's
/// reference implementation also rejects auto-fires, and matches the
/// shortest plausible real-world question ("Tell me about yourself.").
const MIN_TRIGGER_WORDS: usize = 4;

// ── AssemblyAI real-time endpoint (v3) ────────────────────────────────────────
//
// Token-based auth (v3): the merchant API key never leaves the Career OS
// Cloudflare Worker. The dashboard exchanges its user JWT for a short-lived
// AssemblyAI token via `POST /v1/copilot/transcription-token`, then passes
// that temp token through `CaptureConfig::assemblyai_key`. We append it as
// a `?token=<…>` query parameter on the WebSocket URL — no Authorization
// header needed (and AssemblyAI v3 rejects the header anyway).
// Model selection saga 2026-05-16 (chasing close codes 3007 → 3006):
//
// 1. Original code (Phase 4b agent): `speech_model=u3-rt-pro`. AAI
//    closes after ~9 s with 3007. Turns out u3-rt-pro is a DIFFERENT
//    endpoint (`/v3/ws/u3-rt-pro`); on the plain `/v3/ws` URL it's
//    not a valid model.
// 2. Removed the param entirely → AAI closes IMMEDIATELY with 3006
//    (model required, no default).
// 3. Set to `universal-streaming-multilingual` — the correct alias
//    for the public `/v3/ws` endpoint, covers French AND English
//    which is what Career OS needs (MBB/IB/FAANG interviews swap
//    languages mid-conversation).
//
// Alternatives if `universal-streaming-multilingual` ever proves
// too lossy on accented English: `universal-streaming-english` is
// EN-only and slightly more accurate; `whisper-rt` is the highest-
// accuracy option but with a latency hit.
const AAI_WS_URL_BASE: &str =
    "wss://streaming.assemblyai.com/v3/ws\
     ?sample_rate=16000\
     &speech_model=universal-streaming-multilingual\
     &format_turns=true";

/// How many ms of audio we batch per WebSocket frame sent to AssemblyAI.
/// Reverted from 50 ms back to 100 ms — the 50 ms experiment killed
/// the transcript entirely in real-call testing. AAI v3 docs allow
/// 50 ms in theory, but in practice the server either throttles or
/// silently drops sub-100-ms frames depending on the region/load.
/// 100 ms is the sweet spot the SDKs default to.
const CHUNK_MS: u64 = 100;

// ── AssemblyAI transcript event ───────────────────────────────────────────────

#[derive(serde::Deserialize)]
struct AaiEvent {
    #[serde(rename = "type")]
    event_type: String,
    /// AAI v3 fills this with the assembled, **finalised** turn text:
    /// stays empty while a turn is in progress until at least one word
    /// becomes `word_is_final: true`, and only fully populated on
    /// `end_of_turn: true`. For live word-by-word teleprompter advance
    /// we need the `words` array instead — see `live_text()` below.
    #[serde(default)]
    transcript: String,
    /// `true` once AAI has applied formatting (punctuation, capitalisation)
    /// to the current transcript. **NOT** an end-of-turn signal — AAI
    /// emits multiple `turn_is_formatted: true` events per turn as it
    /// refines formatting. Mistaking this for end-of-turn caused the
    /// duplicate-text bug where finalised chunks accumulated within a
    /// single long question. Kept on the struct for diagnostics /
    /// future use; the receive loop now relies on `end_of_turn`.
    #[serde(default)]
    #[allow(dead_code)]
    turn_is_formatted: bool,
    /// `true` once the speaker has paused long enough for AAI to consider
    /// the turn complete. Per AAI docs: **the only reliable end-of-turn
    /// indicator**. We trigger Claude on this AND mark the frontend
    /// transcript as `is_final: true` so it can be promoted to the
    /// accumulated buffer.
    #[serde(default)]
    end_of_turn: bool,
    /// Per-word recognition stream. Each entry has the text and a
    /// `word_is_final` flag. AAI emits these BEFORE the word appears
    /// in `transcript` — joining `words[].text` gives us the live,
    /// in-progress text the teleprompter cursor needs to track.
    #[serde(default)]
    words: Vec<AaiWord>,
}

#[derive(serde::Deserialize, Default)]
struct AaiWord {
    #[serde(default)]
    text: String,
}

impl AaiEvent {
    /// Best-available text representation of the current turn —
    /// prefers the per-word stream (which contains in-progress words)
    /// and falls back to `transcript` when AAI didn't ship a words
    /// array (defensive: every observed message has had words so far,
    /// but we keep the fallback to avoid blanking the UI on a
    /// future protocol tweak).
    fn live_text(&self) -> String {
        if !self.words.is_empty() {
            let mut out = String::with_capacity(self.words.len() * 6);
            for (i, w) in self.words.iter().enumerate() {
                if w.text.is_empty() {
                    continue;
                }
                if i > 0 && !out.is_empty() {
                    out.push(' ');
                }
                out.push_str(&w.text);
            }
            if !out.is_empty() {
                return out;
            }
        }
        self.transcript.clone()
    }
}

// (Pre-Sprint-1 `TranscriptEvent` removed. The interviewer transcript
// is now delivered via `interviewer-utterance` (one event per VAD-
// segmented utterance), not the legacy partial-stream `transcript`
// event.)

/// Phase 4b: outbound `user-transcript` event sent to the frontend.
/// Same shape as `TranscriptEvent` but emitted from the candidate's
/// mic AAI stream. Drives the teleprompter cursor matcher.
#[derive(serde::Serialize)]
struct UserTranscriptEvent<'a> {
    text: &'a str,
    #[serde(rename = "final")]
    is_final: bool,
}

/// Sprint 1.3: outbound `interviewer-utterance` event sent to the
/// frontend. One per VAD-segmented utterance → STT roundtrip. This is
/// the SOLE source of interviewer transcript on the frontend now —
/// the old per-partial `transcript` stream is gone. The shape is the
/// transcribed text plus diagnostic timing so the UI can show the
/// per-utterance latency badge if it wants.
#[derive(serde::Serialize)]
struct InterviewerUtteranceEvent<'a> {
    text: &'a str,
    /// Unix epoch milliseconds at emit time. Frontend uses this to
    /// stamp the transcript bubble.
    ts: u64,
    /// Utterance audio length (VAD-measured, source-sample-rate).
    duration_ms: u64,
}

// ── Public entry point ────────────────────────────────────────────────────────

pub async fn run_session(
    app: AppHandle,
    config: CaptureConfig,
    stop_rx: oneshot::Receiver<()>,
    // T5 (2026-05-16): receiver for force-answer requests originating
    // from Cmd+Shift+A and the teleprompter's quick-action chips. The
    // string payload is an optional INTENT hint ("recap", "follow-up",
    // "push back", or empty for plain "answer now") — prepended to the
    // accumulated transcript before firing Claude so the model knows
    // what the candidate wants the response to look like. Force-fires
    // bypass T1 (min utterance length) and T2 (half-duplex) entirely,
    // but T3 (abort-in-flight) still applies so a manual trigger never
    // double-streams on top of an existing answer.
    mut force_answer_rx: mpsc::UnboundedReceiver<String>,
) -> Result<()> {
    // Sprint 1.3: the interviewer side no longer needs an AAI streaming
    // token — it goes through the VAD → /v1/copilot/stt path. The
    // `assemblyai_key` field on CaptureConfig stays alive (legacy
    // BYOK fallback for the `start_capture` one-shot recorder), but
    // we don't require it to be set on a live Copilot session
    // anymore. The user-side (mic) stream has its own dedicated
    // token field — `user_voice_assemblyai_token` — checked further
    // down before we attempt that connection.

    // ── Stop flag (shared across tasks) ──────────────────────────────────────
    let stop_flag = Arc::new(AtomicBool::new(false));
    let stop_for_signal = stop_flag.clone();
    tokio::spawn(async move {
        let _ = stop_rx.await;
        stop_for_signal.store(true, Ordering::SeqCst);
    });

    // ── Open audio devices in a blocking thread (cpal is !Send) ──────────────
    //
    // We now return TWO audio buffers from the blocking init:
    //   - the primary feed (= what we ship to AssemblyAI as the
    //     interviewer stream — either the Core Audio Tap, a cpal
    //     loopback, or the mic if no loopback is available)
    //   - the mic buffer (= the candidate's voice — Phase 4b only;
    //     `None` if no mic could be opened, which means the user-voice
    //     transcript is silently disabled)
    let (dev_tx, dev_rx) = oneshot::channel::<(
        Arc<Mutex<Vec<f32>>>,
        u32,
        Option<(Arc<Mutex<Vec<f32>>>, u32)>,
    )>();

    let stop_for_audio = stop_flag.clone();
    let config_audio   = config.clone();

    // Phase 2: when the loopback is the Core Audio Tap sentinel,
    // boot it OUTSIDE the cpal spawn_blocking — the tap lives on its
    // own dedicated drain thread (`audio_tap::LiveSystemAudio`).
    // Bringing it up before the mic gives us the source rate early
    // so the WS PCM reader downstream has a sensible primary feed.
    //
    // The async tap branch returns a `LiveSystemAudio` whose
    // `buffer` is the same `Arc<Mutex<Vec<f32>>>` shape as the cpal
    // `LiveDevice`, so the WS reader doesn't care which path
    // produced it.
    let use_system_audio = config_audio.loopback_device == SYSTEM_AUDIO_TAP_SENTINEL;
    // Tahoe-first ordering: ScreenCaptureKit pulls audio from a
    // subsystem that the macOS 26 Core Audio Tap regression
    // (Apple Developer Forums #825780) does NOT affect. We attempt
    // it first; only if SCK refuses to start do we degrade to the
    // legacy tap path that's known-broken on Tahoe.
    let tap_live: Option<SystemAudioSource> = if use_system_audio {
        match LiveSystemAudioSck::start(stop_for_audio.clone()) {
            Ok(live) => {
                info!(
                    "system-audio: ScreenCaptureKit online — {} Hz mono",
                    live.rate
                );
                Some(SystemAudioSource::Sck(live))
            }
            Err(sck_err) => {
                warn!(
                    "system-audio: SCK start failed ({sck_err:#}) — \
                     trying Core Audio Tap fallback"
                );
                match LiveSystemAudio::start(stop_for_audio.clone()) {
                    Ok(live) => {
                        info!(
                            "system-audio: Core Audio Tap online (fallback) — \
                             {} Hz system audio",
                            live.rate
                        );
                        Some(SystemAudioSource::Tap(live))
                    }
                    Err(tap_err) => {
                        warn!(
                            "system-audio: both SCK and Core Audio Tap failed \
                             (sck={sck_err:#}, tap={tap_err:#}) — \
                             degrading to mic-only"
                        );
                        None
                    }
                }
            }
        }
    } else {
        None
    };

    tokio::task::spawn_blocking(move || {
        let host = cpal::default_host();

        let mic = match open_input(&host, &config_audio.audio_device) {
            Ok(d)  => Some(d),
            Err(e) => { warn!("mic open error: {e}"); None }
        };
        // The legacy cpal loopback path is only used when the user
        // has explicitly configured a BlackHole-style device
        // (anything other than the Core Audio Tap sentinel AND not
        // empty).
        let loopback = if config_audio.loopback_device.is_empty()
            || config_audio.loopback_device == SYSTEM_AUDIO_TAP_SENTINEL
        {
            None
        } else {
            match open_input(&host, &config_audio.loopback_device) {
                Ok(d)  => Some(d),
                Err(e) => { warn!("loopback unavailable: {e}"); None }
            }
        };

        // Choose the primary feed for AAI streaming. Priority:
        //   1. Core Audio Tap (if it booted) — recruiter audio,
        //      Phase 2 default.
        //   2. cpal loopback (BlackHole) — Phase 1 fallback.
        //   3. Mic — single-input fallback.
        let (primary_buf, primary_rate, primary_is_mic) = if let Some(ref tap) = tap_live {
            (tap.buffer(), tap.rate(), false)
        } else if let Some(ref lb) = loopback {
            (lb.buffer.clone(), lb.rate, false)
        } else if let Some(ref m) = mic {
            (m.buffer.clone(), m.rate, true)
        } else {
            // No primary input at all — surface an empty buffer so
            // the downstream WS reader sits idle rather than panicking
            // on a missing channel.
            (Arc::new(Mutex::new(Vec::new())), 16_000, true)
        };

        // Phase 4b: the user-voice stream needs the MIC buffer,
        // distinct from the primary. If the primary already IS the
        // mic (no loopback / tap), we don't ship a second buffer —
        // both streams would carry the same audio, doubling the AAI
        // cost for zero benefit. The caller (frontend) shouldn't
        // request a user-voice token in that configuration anyway,
        // but we belt-and-braces it here.
        let mic_secondary = if primary_is_mic {
            None
        } else {
            mic.as_ref().map(|m| (m.buffer.clone(), m.rate))
        };

        info!(
            "audio ready: {}Hz, loopback={}, mic-secondary={}",
            primary_rate,
            if let Some(ref t) = tap_live {
                t.label()
            } else if loopback.is_some() {
                "cpal"
            } else {
                "off"
            },
            mic_secondary.is_some(),
        );
        let _ = dev_tx.send((primary_buf, primary_rate, mic_secondary));

        // Keep streams alive until session stops
        while !stop_for_audio.load(Ordering::SeqCst) {
            std::thread::sleep(Duration::from_millis(100));
        }
        drop(mic);
        drop(loopback);
        drop(tap_live);
    });

    let (primary_buf, primary_rate, mic_secondary) =
        dev_rx.await.context("audio device init failed")?;

    // ── Conversation history ──────────────────────────────────────────────────
    let history: Arc<Mutex<Vec<llm::HistoryEntry>>> =
        Arc::new(Mutex::new(Vec::new()));

    // ── Debouncer: accumulate formatted turns, fire Claude after N s silence ──
    // Prevents firing mid-question when the recruiter pauses between sentences.
    // ONLY the interviewer stream pushes into this channel — the
    // candidate's voice is never supposed to fire an LLM call.
    //
    // 2026-05-16 evolution (Pluely-inspired triggers):
    //   - T1: minimum utterance gate (skip ultra-short turns)
    //   - T2: half-duplex (skip if already streaming)
    //   - T3: abort-on-new-final (cancel in-flight stream when a fresh
    //         interviewer turn arrives) — surfaced through the
    //         `inflight_handle` mutex
    //   - T4: history bounded to last 6 turns
    //   - T5: force-fire path via `force_answer_rx` (Cmd+Shift+A +
    //         quick-action chips), bypasses T1/T2 but respects T3
    let (question_tx, mut question_rx) = mpsc::channel::<String>(8);
    {
        let app_d  = app.clone();
        let cfg_d  = config.clone();
        let hist_d = history.clone();
        // T2: half-duplex flag. Set true the instant we spawn a Claude
        // streamer; cleared in both the Ok and Err completion paths.
        // The debouncer's auto-fire branch checks this before spawning
        // — force-fires (T5) deliberately bypass.
        let is_generating: Arc<AtomicBool> = Arc::new(AtomicBool::new(false));
        // T3: handle of the currently-streaming Claude task. When a new
        // interviewer turn arrives, abort the previous handle (if any)
        // before spawning a fresh one — prevents stale answers from
        // continuing to stream into the teleprompter after the
        // candidate has already moved on.
        let inflight_handle: Arc<Mutex<Option<JoinHandle<()>>>> =
            Arc::new(Mutex::new(None));
        tokio::spawn(async move {
            // 2.5 s debouncer — combines VAD-segmented utterances that
            // belong to the same logical question.
            //
            // History of this value:
            //   - 2s: too aggressive on the old AAI-streaming path. The
            //     interviewer's mid-sentence pause ("Tell me about a
            //     time… [1.8s pause] when you led a team") fired Claude
            //     on the first half.
            //   - 4s: safe but added 4s on top of the already-slow STT
            //     round-trip (~3-5s for batch). Users reported "trop
            //     long" — total wait ~8s after speech stops.
            //   - 2.5s (current, 2026-05-17): post-Sprint-1, the VAD
            //     pipeline already enforces ~640ms of silence inside
            //     each utterance, so consecutive VAD utterances are
            //     genuinely separate thoughts. The debouncer's job
            //     is now to coalesce true multi-clause questions
            //     ("First, X. [breath] Second, Y."), which run < 2s
            //     gap. 2.5s catches those, drops the user-perceived
            //     wait by 1.5s.
            //
            // If users report Claude firing on incomplete questions:
            // back up to 3-3.5s. If they report it still feels slow:
            // VAD silence_chunks is the next dial.
            const DEBOUNCE_MS: u64 = 2_500;
            let mut accumulated = String::new();

            // The Claude streamer is inlined in both the force-fire
            // and the natural-debounce branches below. Each spawn:
            //   - flips `is_generating` (T2) on entry and clears it
            //     in BOTH the Ok and Err completion paths
            //   - emits `answer-stream-start` (D2) so the frontend
            //     wipes the previous answer + resets the cursor
            //   - on success, appends to `hist_d` and trims to the
            //     6-turn cap (T4)
            // (Inlined rather than factored into a helper — Rust's
            // lack of nested-async-fn sugar makes a free function
            // clearer than a one-call helper, and the two call sites
            // diverge slightly on the abort-previous semantics.)
            loop {
                tokio::select! {
                    // ── T5: force-fire path ─────────────────────────
                    // Always wins races with the question channel + the
                    // debounce timer (`tokio::select!` polls in source
                    // order and `biased` makes that explicit).
                    biased;

                    maybe_intent = force_answer_rx.recv() => {
                        match maybe_intent {
                            Some(intent) => {
                                // T5: bypass T1 (min words) AND T2
                                // (half-duplex) — the user explicitly
                                // asked for an answer NOW, that's the
                                // contract of the hotkey. T3 still
                                // applies: abort any in-flight stream
                                // so we don't double-render.
                                let raw = std::mem::take(&mut accumulated);
                                let question = if intent.is_empty() {
                                    raw
                                } else if raw.is_empty() {
                                    // No accumulated transcript yet —
                                    // fire with just the intent so the
                                    // chip works even on session start
                                    // (e.g. "Recap" with no prior
                                    // context = brief role pitch).
                                    format!("[user-intent: {intent}]")
                                } else {
                                    format!("[user-intent: {intent}] {raw}")
                                };
                                {
                                    let mut h = inflight_handle.lock().unwrap();
                                    if let Some(prev) = h.take() {
                                        if !prev.is_finished() {
                                            tracing::info!("trigger force: aborted previous generation");
                                            prev.abort();
                                            // Clear the flag manually
                                            // because the abort path
                                            // skips the streamer's own
                                            // cleanup.
                                            is_generating.store(false, Ordering::SeqCst);
                                        }
                                    }
                                }
                                let hist_snapshot = hist_d.lock().unwrap().clone();
                                tracing::info!(
                                    "trigger force: firing Claude (intent={:?}, words={}, history size = {})",
                                    if intent.is_empty() { "none" } else { intent.as_str() },
                                    question.split_whitespace().count(),
                                    hist_snapshot.len(),
                                );
                                let app2  = app_d.clone();
                                let cfg2  = cfg_d.clone();
                                let hist2 = hist_d.clone();
                                let gen2  = is_generating.clone();
                                gen2.store(true, Ordering::SeqCst);
                                let handle = tokio::spawn(async move {
                                    app2.emit("status", "thinking").ok();
                                    // Tell the frontend to clear the
                                    // teleprompter cursor + buffered
                                    // answer so the new stream replaces
                                    // (D2) — frontend listens for
                                    // `answer-stream-start`.
                                    app2.emit("answer-stream-start", ()).ok();
                                    let result = if cfg2.app_mode == "pitch" {
                                        llm::generate_pitch_streaming(
                                            &cfg2, &question, &hist_snapshot, &app2,
                                        ).await
                                    } else {
                                        llm::generate_answer_streaming(
                                            &cfg2, &question, &hist_snapshot, &app2,
                                        ).await
                                    };
                                    match result {
                                        Ok(answer) => {
                                            let mut h = hist2.lock().unwrap();
                                            h.push(llm::HistoryEntry { question, answer_text: answer });
                                            // T4: bounded to 6 turns
                                            // (was 3) — enough context
                                            // for the model to reference
                                            // earlier callbacks without
                                            // blowing the prompt budget.
                                            if h.len() > 6 { h.remove(0); }
                                        }
                                        Err(e) => { app2.emit("error", format!("{e:#}")).ok(); }
                                    }
                                    gen2.store(false, Ordering::SeqCst);
                                    app2.emit("status", "listening").ok();
                                });
                                *inflight_handle.lock().unwrap() = Some(handle);
                            }
                            None => {
                                // Sender dropped (session stopping) —
                                // keep the loop alive on the other
                                // branches; the question_rx None path
                                // will tear us down cleanly.
                            }
                        }
                    }

                    // ── Normal path: AAI turn or debounce timeout ───
                    res = tokio::time::timeout(
                        Duration::from_millis(DEBOUNCE_MS),
                        question_rx.recv(),
                    ) => {
                        match res {
                            // New turn — keep accumulating, reset timer
                            // implicitly. DO NOT abort the in-flight
                            // Claude here.
                            //
                            // 2026-05-17 (Pluely-style fix): the prior
                            // version called `prev.abort()` on every
                            // incoming utterance. In a continuous
                            // interviewer monologue (case-interview
                            // prompt, panel question with three sub-
                            // parts, etc.) that killed Claude before
                            // ANY token reached the teleprompter —
                            // observed in logs as "trigger fired" /
                            // "trigger aborted previous generation"
                            // landing in the same millisecond, dozens
                            // of times across a 2-min session, zero
                            // answers ever shown.
                            //
                            // New behaviour: incoming utterances
                            // ACCUMULATE into the buffer. T2's
                            // is_generating gate (checked on the
                            // timeout branch below) ensures we don't
                            // start a SECOND Claude while the first
                            // is still streaming. When the first
                            // finishes, the timeout branch sees the
                            // newly-accumulated buffer and fires
                            // Claude on the combined text — exactly
                            // Pluely's "let the answer finish, queue
                            // the next question" pattern.
                            //
                            // The user-driven abort path (force_answer
                            // / Cmd+Shift+A) above STILL aborts, since
                            // there the user explicitly wants to
                            // interrupt and re-direct the model.
                            Ok(Some(turn)) => {
                                if !accumulated.is_empty() { accumulated.push(' '); }
                                accumulated.push_str(&turn);
                            }
                            // Channel closed — session ended
                            Ok(None) => break,
                            // N s silence with pending text → consider firing Claude
                            Err(_) if !accumulated.is_empty() => {
                                // T1: minimum utterance gate. Anything
                                // shorter than MIN_TRIGGER_WORDS is
                                // almost always a greeting / filler /
                                // noise shard. Keep accumulating so a
                                // longer follow-on turn still rolls
                                // forward; don't clear the buffer.
                                let word_count = accumulated.split_whitespace().count();
                                if word_count < MIN_TRIGGER_WORDS {
                                    tracing::info!(
                                        "trigger gated: too short ({} words)",
                                        word_count,
                                    );
                                    continue;
                                }
                                // T2: half-duplex. If a previous Claude
                                // stream is still in flight, hold the
                                // buffer until it finishes. The next
                                // tick re-checks; if the user really
                                // wants to interrupt they can hit
                                // Cmd+Shift+A (force-fire bypasses).
                                if is_generating.load(Ordering::SeqCst) {
                                    tracing::info!("trigger gated: already generating");
                                    continue;
                                }

                                let question      = std::mem::take(&mut accumulated);
                                let hist_snapshot = hist_d.lock().unwrap().clone();
                                tracing::info!(
                                    "trigger fired: firing Claude (words={}, history size = {})",
                                    word_count,
                                    hist_snapshot.len(),
                                );
                                let app2  = app_d.clone();
                                let cfg2  = cfg_d.clone();
                                let hist2 = hist_d.clone();
                                let gen2  = is_generating.clone();
                                gen2.store(true, Ordering::SeqCst);
                                let handle = tokio::spawn(async move {
                                    app2.emit("status", "thinking").ok();
                                    // D2: signal the frontend to wipe
                                    // its previous answer + reset the
                                    // teleprompter cursor.
                                    app2.emit("answer-stream-start", ()).ok();
                                    let result = if cfg2.app_mode == "pitch" {
                                        llm::generate_pitch_streaming(
                                            &cfg2, &question, &hist_snapshot, &app2,
                                        ).await
                                    } else {
                                        llm::generate_answer_streaming(
                                            &cfg2, &question, &hist_snapshot, &app2,
                                        ).await
                                    };
                                    match result {
                                        Ok(answer) => {
                                            let mut h = hist2.lock().unwrap();
                                            h.push(llm::HistoryEntry { question, answer_text: answer });
                                            // T4: 6-turn bound (was 3).
                                            if h.len() > 6 { h.remove(0); }
                                        }
                                        Err(e) => { app2.emit("error", format!("{e:#}")).ok(); }
                                    }
                                    gen2.store(false, Ordering::SeqCst);
                                    app2.emit("status", "listening").ok();
                                });
                                *inflight_handle.lock().unwrap() = Some(handle);
                            }
                            // Timeout but nothing pending — keep waiting
                            Err(_) => {}
                        }
                    }
                }
            }
        });
    }

    // ── Phase 4b: spawn the user-voice stream (best-effort) ────────────────
    //
    // When both the second token AND a distinct mic buffer are
    // available, fire up a second AAI WebSocket dedicated to the
    // candidate's voice. Connection failures here are non-fatal:
    // log a warning and continue with the interviewer stream alone.
    // The frontend teleprompter will fall back to Phase 4a timer-only
    // advance.
    if !config.user_voice_assemblyai_token.is_empty() {
        if let Some((mic_buf, mic_rate)) = mic_secondary.clone() {
            let app_user  = app.clone();
            let stop_user = stop_flag.clone();
            let token     = config.user_voice_assemblyai_token.clone();
            tokio::spawn(async move {
                if let Err(e) = run_user_aai_stream(
                    app_user,
                    token,
                    mic_buf,
                    mic_rate,
                    stop_user,
                )
                .await
                {
                    warn!("user-voice AAI stream ended with error: {e:#}");
                }
            });
        } else {
            warn!(
                "user-voice token provided but no secondary mic buffer — \
                 mic may be the primary input (no loopback / tap). \
                 Phase 4b ASR cursor disabled for this session."
            );
        }
    }

    // ── Sprint 1.3: interviewer pipeline — VAD → STT → debouncer ─────
    //
    // Replaces the pre-Sprint-1 AAI streaming WebSocket for the
    // interviewer side. The audio buffer (system audio from SCK / Core
    // Audio Tap) feeds the VAD state machine in `vad::run_vad_capture`,
    // which emits one `Utterance` per silence-boundary segment on the
    // `utt_tx` channel. For each utterance we POST the WAV to our
    // Worker's `/v1/copilot/stt`, emit `interviewer-utterance` to the
    // frontend, and push the text into `question_tx` so the existing
    // 4 s debouncer (T1–T5 in the closure above) takes over unchanged.
    //
    // The function returns when the VAD loop exits, which happens
    // when `stop_flag` flips or all `utt_tx` clones are dropped.
    app.emit("status", "listening").ok();

    let (utt_tx, mut utt_rx) = mpsc::channel::<vad::Utterance>(8);

    // STT consumer: spawn one task that drains `utt_rx` and fires the
    // STT call. Sequencing matters here: utterances arrive in real-
    // world order, the Worker call is ~200-2000 ms, and the
    // downstream debouncer expects same-order pushes (otherwise a
    // late-resolved "second sentence" could land before its earlier
    // peer and the recruiter's question would parse out of order).
    // So we process them one at a time on a single task rather than
    // a `JoinSet` parallel fan-out.
    let app_stt = app.clone();
    let question_tx_stt = question_tx.clone();
    let stt_task: JoinHandle<()> = tokio::spawn(async move {
        // Pull the JWT once at task start. Re-reading from Keychain
        // every utterance would cost a few ms per call for no benefit
        // — the JWT lifetime is in days, not utterances.
        let jwt = match crate::secrets::get(crate::secrets::SecretSlot::AuthJwt) {
            Ok(Some(t)) => t,
            Ok(None) => {
                tracing::error!(
                    "stt: no JWT in Keychain — interviewer transcription disabled"
                );
                return;
            }
            Err(e) => {
                tracing::error!("stt: keychain read error: {e}");
                return;
            }
        };
        while let Some(utt) = utt_rx.recv().await {
            let t0 = Instant::now();
            let wav_bytes = utt.wav_bytes.len();
            match stt::transcribe_wav(utt.wav_bytes, &jwt, Some("auto")).await {
                Ok(res) => {
                    let api_ms = t0.elapsed().as_millis() as u64;
                    let text_trim = res.text.trim();
                    if text_trim.is_empty() {
                        tracing::info!(
                            "stt: transcribed empty ({} ms api latency, {} wav bytes)",
                            api_ms,
                            wav_bytes,
                        );
                        continue;
                    }
                    let preview: String = text_trim.chars().take(60).collect();
                    tracing::info!(
                        "stt: transcribed ({} ms api latency) → \"{}…\"",
                        api_ms,
                        preview,
                    );

                    // Emit to the frontend. `ts` is Unix millis at the
                    // moment of emit — the frontend stamps the bubble
                    // with this rather than its own `Date.now()` so
                    // the timeline is consistent across the IPC hop.
                    let ts = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .map(|d| d.as_millis() as u64)
                        .unwrap_or(0);
                    let payload = InterviewerUtteranceEvent {
                        text: text_trim,
                        ts,
                        duration_ms: utt.duration_ms,
                    };
                    let _ = app_stt.emit("interviewer-utterance", &payload);

                    // Feed the debouncer — T1 (min words) / T2 (half-
                    // duplex) / T3 (abort-in-flight) / T4 (history cap)
                    // are all enforced downstream by the closure
                    // spawned earlier. Force-fires (T5) go through the
                    // separate `force_answer_rx` path.
                    if question_tx_stt.send(text_trim.to_string()).await.is_err() {
                        // Receiver dropped — session is tearing down,
                        // stop trying to push.
                        break;
                    }
                }
                Err(e) => {
                    let api_ms = t0.elapsed().as_millis() as u64;
                    tracing::warn!(
                        "stt: transcription failed after {} ms ({} wav bytes): {e:#}",
                        api_ms,
                        wav_bytes,
                    );
                    // Surface persistent failures to the UI so the
                    // user knows the session is degraded. We keep
                    // looping; a transient 5xx on one utterance
                    // shouldn't tear the whole session down.
                    let _ = app_stt.emit("error", format!("STT: {e:#}"));
                }
            }
        }
    });

    // VAD loop — runs to completion on this task. Drops `utt_tx`
    // (and therefore closes the STT consumer's input channel) when
    // it returns.
    let vad_app = app.clone();
    let vad_stop = stop_flag.clone();
    vad::run_vad_capture(
        vad_app,
        primary_buf,
        primary_rate,
        vad_stop,
        utt_tx,
        vad::VadConfig::default(),
    )
    .await;

    // Wait for the STT consumer to drain any in-flight utterance
    // before we declare the session done. Bounded wait — if the STT
    // task is stuck on a hung HTTP call we don't want to block
    // session teardown forever.
    let _ = tokio::time::timeout(Duration::from_secs(5), stt_task).await;

    stop_flag.store(true, Ordering::SeqCst);
    app.emit("status", "idle").ok();
    info!("session ended");
    Ok(())
}

// ── User-voice AAI streaming helper (mic, drives the teleprompter cursor) ────

/// Open the AssemblyAI v3 WebSocket on the candidate's mic and emit
/// `user-transcript` events on each Turn (partial throttled at 4 Hz,
/// final unthrottled). Deliberately NOT writing into the Claude
/// debouncer — the candidate's own voice must never fire an LLM call.
///
/// Returns when the WebSocket closes or `stop_flag` flips.
///
/// Stripped down from the pre-Sprint-1 `run_aai_stream(side, …)`:
/// since the interviewer side now uses VAD → HTTP STT, this helper
/// no longer needs the `StreamSide` polymorphism. Everything that
/// was guarded by `match side` is inlined for the user case.
async fn run_user_aai_stream(
    app: AppHandle,
    token: String,
    audio_buf: Arc<Mutex<Vec<f32>>>,
    audio_rate: u32,
    stop_flag: Arc<AtomicBool>,
) -> Result<()> {
    // ── Connect to AssemblyAI WebSocket ───────────────────────────────
    // AssemblyAI v3 streaming uses query-param token auth, not headers.
    let ws_url = format!("{AAI_WS_URL_BASE}&token={token}");
    let request = {
        use tokio_tungstenite::tungstenite::client::IntoClientRequest;
        ws_url
            .as_str()
            .into_client_request()
            .context("build AAI request (user)")?
    };

    let (ws_conn, _) = connect_async(request)
        .await
        .context("AssemblyAI WebSocket connect failed (user) — token may be expired")?;

    info!("AssemblyAI connected (user)");

    let (mut ws_sink, mut ws_rx) = ws_conn.split();

    // ── Audio reader → pcm channel ────────────────────────────────────
    let (pcm_tx, mut pcm_rx) = mpsc::channel::<Bytes>(64);

    let stop_reader = stop_flag.clone();
    tokio::spawn(async move {
        // Discard the backlog accumulated between mic init and AAI
        // WebSocket connect — sending it as one giant frame would
        // trip AAI's 1000 ms / oversized-frame protection (close 3007).
        let mut last_idx: usize = match audio_buf.lock() {
            Ok(g) => g.len(),
            Err(p) => p.into_inner().len(),
        };

        // AAI v3 rejects sub-50 ms frames. Accumulate locally and flush
        // only when we have ≥ 50 ms (= 800 samples × 2 bytes = 1600 b).
        const MIN_FRAME_BYTES: usize = 1600; // 50 ms @ 16 kHz mono i16
        let mut pcm_acc: Vec<u8> = Vec::with_capacity(MIN_FRAME_BYTES * 4);

        let mut levels_seen = 0u64;
        let mut peak_window: f32 = 0.0;

        loop {
            if stop_reader.load(Ordering::SeqCst) { break; }
            tokio::time::sleep(Duration::from_millis(CHUNK_MS)).await;

            let new_samples: Vec<f32> = {
                let mut buf = match audio_buf.lock() {
                    Ok(g) => g,
                    Err(p) => p.into_inner(),
                };
                // Drain pattern — prevents unbounded growth on the mic
                // buffer (see history in the pre-Sprint-1 commit
                // comment for the original freeze diagnosis).
                let start = last_idx.min(buf.len());
                let new = if start < buf.len() {
                    buf[start..].to_vec()
                } else {
                    Vec::new()
                };
                buf.clear();
                last_idx = 0;
                new
            };

            if !new_samples.is_empty() {
                for &s in &new_samples {
                    let a = s.abs();
                    if a > peak_window { peak_window = a; }
                }
                let resampled = resample_to_16k(&new_samples, audio_rate);
                pcm_acc.extend(resampled.iter().flat_map(|&s| {
                    let i = (s.clamp(-1.0, 1.0) * i16::MAX as f32) as i16;
                    i.to_le_bytes()
                }));
            }

            if pcm_acc.len() >= MIN_FRAME_BYTES {
                let frame = std::mem::take(&mut pcm_acc);
                pcm_acc.reserve(MIN_FRAME_BYTES * 4);
                if pcm_tx.send(Bytes::from(frame)).await.is_err() { break; }

                levels_seen += 1;
                if levels_seen % 10 == 0 {
                    // Per-second diagnostic — useful during pipeline
                    // tuning, too spammy for a production log. Demote
                    // to debug so RUST_LOG=info stays clean and
                    // RUST_LOG=career_ops_lib=debug surfaces it again.
                    tracing::debug!(
                        "audio level (user): peak={:.4} (last 10 frames)",
                        peak_window,
                    );
                    peak_window = 0.0;
                }
            }
        }
    });

    // ── pcm channel → WebSocket binary frames ─────────────────────────
    let stop_sender = stop_flag.clone();
    tokio::spawn(async move {
        let mut frames_sent: u64 = 0;
        let mut bytes_sent: u64 = 0;
        while let Some(pcm) = pcm_rx.recv().await {
            if stop_sender.load(Ordering::SeqCst) { break; }
            bytes_sent += pcm.len() as u64;
            if ws_sink.send(Message::Binary(pcm.into())).await.is_err() { break; }
            frames_sent += 1;
            if frames_sent % 10 == 0 {
                // Per-second diagnostic. Demoted to debug to keep info
                // clean — final tx total stays at info for end-of-session
                // accounting.
                tracing::debug!(
                    "AAI tx (user): {frames_sent} frames, {bytes_sent} bytes",
                );
            }
        }
        tracing::info!(
            "AAI tx done (user): {frames_sent} frames, {bytes_sent} bytes total",
        );
        let _ = ws_sink
            .send(Message::Text(r#"{"type":"Terminate"}"#.to_string()))
            .await;
        let _ = ws_sink.close().await;
    });

    // ── Receive loop: emit user-transcript on each Turn ───────────────
    //
    // Partial throttling: 4 Hz (250 ms). The cursor matcher needs
    // partials to advance word-by-word, but humans speak ~3 words/sec,
    // so 4 Hz is enough granularity. Finals (end_of_turn=true) always
    // bypass the throttle so the cursor matcher gets a clean lock at
    // the end of every utterance.
    let mut turn_dump_remaining: u32 = 5;
    const USER_COALESCE_MS: u128 = 250;
    let mut last_partial_emit: Option<Instant> = None;

    while let Some(msg) = ws_rx.next().await {
        if stop_flag.load(Ordering::SeqCst) { break; }

        let text = match msg {
            Ok(Message::Text(t))  => t,
            Ok(Message::Close(frame)) => {
                if let Some(cf) = frame {
                    tracing::warn!(
                        "AAI WS closed (user): code={}, reason={:?}",
                        cf.code,
                        cf.reason.as_ref(),
                    );
                } else {
                    tracing::warn!("AAI WS closed (user) with no close frame");
                }
                break;
            }
            Err(e) => { warn!("WS recv error (user): {e}"); break; }
            _      => continue,
        };

        let ev = match serde_json::from_str::<AaiEvent>(&text) {
            Ok(e)  => e,
            Err(_) => {
                tracing::warn!(
                    "AAI unparseable msg (user): {}",
                    text.chars().take(500).collect::<String>(),
                );
                continue;
            }
        };

        // First 5 Turn payloads per session at debug — only useful
        // when debugging the AAI v3 wire format (e.g. confirming the
        // `words[]` shape after a schema change). Quiet by default.
        if ev.event_type == "Turn" && turn_dump_remaining > 0 {
            tracing::debug!(
                "AAI Turn raw (user): {}",
                text.chars().take(1200).collect::<String>(),
            );
            turn_dump_remaining -= 1;
        }

        match ev.event_type.as_str() {
            "Turn" => {
                let live = ev.live_text();
                if live.is_empty() {
                    continue;
                }
                if !ev.end_of_turn {
                    let now = Instant::now();
                    if let Some(last) = last_partial_emit {
                        if now.duration_since(last).as_millis() < USER_COALESCE_MS {
                            continue;
                        }
                    }
                    last_partial_emit = Some(now);
                }
                let payload = UserTranscriptEvent {
                    text: &live,
                    is_final: ev.end_of_turn,
                };
                app.emit("user-transcript", &payload).ok();
                // Deliberately NOT forwarding to question_tx — the
                // candidate's own voice must not fire an LLM call.
            }
            "Termination" => break,
            "Error" => {
                tracing::warn!(
                    "AAI Error (user): {}",
                    text.chars().take(800).collect::<String>(),
                );
            }
            other => {
                tracing::info!(
                    "AAI msg (user) type={} transcript_len={} end_of_turn={}",
                    other,
                    ev.transcript.len(),
                    ev.end_of_turn,
                );
            }
        }
    }

    Ok(())
}

// ── Continuous capture device ─────────────────────────────────────────────────

struct LiveDevice {
    #[allow(dead_code)]
    name: String,
    rate: u32,
    buffer: Arc<Mutex<Vec<f32>>>,
    _stream: cpal::Stream,
}

fn open_input(host: &cpal::Host, device_name: &str) -> Result<LiveDevice> {
    let device = if device_name.is_empty() {
        host.default_input_device()
            .ok_or_else(|| anyhow!("no default input device"))?
    } else {
        host.input_devices()?
            .find(|d| d.name().map(|n| n == device_name).unwrap_or(false))
            .ok_or_else(|| anyhow!("input device not found: {device_name}"))?
    };
    let name = device.name().unwrap_or_else(|_| "(unknown)".into());

    let supported    = device.default_input_config()?;
    let sample_format = supported.sample_format();
    let channels     = supported.channels() as usize;
    let rate         = supported.sample_rate().0;

    let buffer: Arc<Mutex<Vec<f32>>> =
        Arc::new(Mutex::new(Vec::with_capacity(rate as usize * 30)));
    let buf_clone = buffer.clone();

    let stream = match sample_format {
        SampleFormat::F32 => {
            let cfg: StreamConfig = supported.into();
            device.build_input_stream(
                &cfg,
                move |data: &[f32], _| {
                    let mut b = match buf_clone.lock() {
                        Ok(g) => g,
                        Err(p) => p.into_inner(),
                    };
                    if channels == 1 {
                        b.extend_from_slice(data);
                    } else {
                        for frame in data.chunks(channels) {
                            b.push(frame.iter().sum::<f32>() / channels as f32);
                        }
                    }
                },
                |err| tracing::error!("audio error: {err}"),
                None,
            )?
        }
        SampleFormat::I16 => {
            let cfg: StreamConfig = supported.into();
            device.build_input_stream(
                &cfg,
                move |data: &[i16], _| {
                    let mut b = match buf_clone.lock() {
                        Ok(g) => g,
                        Err(p) => p.into_inner(),
                    };
                    if channels == 1 {
                        b.extend(data.iter().map(|&s| s as f32 / i16::MAX as f32));
                    } else {
                        for frame in data.chunks(channels) {
                            let avg = frame
                                .iter()
                                .map(|&s| s as f32 / i16::MAX as f32)
                                .sum::<f32>()
                                / channels as f32;
                            b.push(avg);
                        }
                    }
                },
                |err| tracing::error!("audio error: {err}"),
                None,
            )?
        }
        SampleFormat::U16 => {
            let cfg: StreamConfig = supported.into();
            device.build_input_stream(
                &cfg,
                move |data: &[u16], _| {
                    let mut b = match buf_clone.lock() {
                        Ok(g) => g,
                        Err(p) => p.into_inner(),
                    };
                    let scale = u16::MAX as f32 / 2.0;
                    if channels == 1 {
                        b.extend(data.iter().map(|&s| (s as f32 - scale) / scale));
                    } else {
                        for frame in data.chunks(channels) {
                            let avg = frame
                                .iter()
                                .map(|&s| (s as f32 - scale) / scale)
                                .sum::<f32>()
                                / channels as f32;
                            b.push(avg);
                        }
                    }
                },
                |err| tracing::error!("audio error: {err}"),
                None,
            )?
        }
        other => return Err(anyhow!("unsupported sample format {other:?}")),
    };

    stream.play()?;
    Ok(LiveDevice { name, rate, buffer, _stream: stream })
}

fn resample_to_16k(input: &[f32], input_rate: u32) -> Vec<f32> {
    if input_rate == 16_000 {
        return input.to_vec();
    }
    let ratio   = input_rate as f32 / 16_000.0;
    let out_len = (input.len() as f32 / ratio) as usize;
    let mut out = Vec::with_capacity(out_len);
    for i in 0..out_len {
        let src  = i as f32 * ratio;
        let idx  = src as usize;
        let frac = src - idx as f32;
        let s0   = input.get(idx).copied().unwrap_or(0.0);
        let s1   = input.get(idx + 1).copied().unwrap_or(s0);
        out.push(s0 + (s1 - s0) * frac);
    }
    out
}
