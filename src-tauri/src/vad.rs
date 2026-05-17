//! Voice-Activity-Detection-segmented capture.
//!
//! Ports Pluely's `run_vad_capture` pattern
//! (`pluely/src-tauri/src/speaker/commands.rs`, lines 135-257) onto OUR
//! audio source. The SCK / Core Audio Tap drain delivers f32 samples
//! into an `Arc<Mutex<Vec<f32>>>`. We poll that buffer in fixed-rate
//! ticks, feed the samples through a small VAD state machine, and
//! produce ONE complete WAV per utterance — silence-boundary cut, with
//! a ~270 ms pre-roll so the first phoneme isn't clipped.
//!
//! The output is consumed by `stt::transcribe_wav` (HTTP STT via our
//! Cloudflare Worker) which returns the final, formatted transcript
//! for that single utterance. Replaces the previous interviewer-side
//! AAI streaming WebSocket entirely (the user-voice / mic AAI stream
//! that drives the teleprompter cursor stays as-is).
//!
//! Why VAD-segment + HTTP STT instead of streaming?
//!   - Cost: one transcribe call per utterance vs continuous frames.
//!   - Reliability: the AAI v3 WebSocket has spurious 3007 / 3006
//!     close-code regressions; a stateless POST is dramatically
//!     simpler to debug.
//!   - Latency: we already debounce 4 s downstream before firing
//!     Claude — a per-utterance latency budget of ~1 s for the STT
//!     hop is invisible inside that window.
//!
//! Pluely emits a single `speech-detected` event per utterance carrying
//! the WAV as base64 over the Tauri event channel. We DON'T cross that
//! channel here: the VAD module hands the raw WAV bytes directly to
//! the caller via a `mpsc::Sender<Utterance>` so the STT call can
//! happen in the same Rust process without paying a JSON-over-IPC tax.

use anyhow::Result;
use hound::{SampleFormat as HoundSampleFormat, WavSpec, WavWriter};
use std::collections::VecDeque;
use std::io::Cursor;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::sync::mpsc;

// ── Configuration ────────────────────────────────────────────────────

/// VAD tuning. Ported VERBATIM from Pluely's `VadConfig::default()`
/// (lines 31-45 of `pluely/src-tauri/src/speaker/commands.rs`) plus
/// our own `max_recording_duration_secs` adjustment to 30s.
#[derive(Debug, Clone)]
pub struct VadConfig {
    pub hop_size: usize,
    pub sensitivity_rms: f32,
    pub peak_threshold: f32,
    pub silence_chunks: usize,
    pub min_speech_chunks: usize,
    pub pre_speech_chunks: usize,
    pub noise_gate_threshold: f32,
    pub max_recording_duration_secs: u64,
}

impl Default for VadConfig {
    fn default() -> Self {
        Self {
            // ~21 ms at 48 kHz. The hop size is what the rest of the
            // VAD ticks are counted in (silence_chunks / speech_chunks).
            hop_size: 1024,
            // RMS gate — anything below this is silence. 0.012 was
            // Pluely's tuning for direct-mic capture; in our setup the
            // interviewer audio comes through SCK (a system-mix tap)
            // with persistent low-level background hum from screen-
            // share, Zoom processing, etc. that briefly crosses 0.012
            // and keeps re-arming the silence counter — utterances
            // never end. Bumped to 0.020 (2026-05-17) so light background
            // doesn't look like speech but actual voice (typical RMS
            // 0.05-0.30) still clears the bar by a wide margin.
            sensitivity_rms: 0.020,
            // Per-chunk peak amplitude gate — catches sharp transients
            // (claps, key clicks) that fall below RMS but are clearly
            // not speech-shaped.
            peak_threshold: 0.035,
            // 30 hops × 1024 samples / 48 kHz ≈ 0.64 s of silence to
            // declare the utterance over. Was 45 (~0.96 s) but that
            // combined with our higher noise floor left utterances
            // running 20+ seconds. 0.64 s still captures natural
            // mid-sentence breathing without truncating thought.
            silence_chunks: 30,
            // 7 hops ≈ 150 ms — below this we discard the utterance as
            // background noise (filler shards that briefly cross the
            // RMS threshold).
            min_speech_chunks: 7,
            // 12 hops ≈ 260 ms — pre-roll prepended once speech starts
            // so the first phoneme isn't clipped.
            pre_speech_chunks: 12,
            // Soft knee gate that attenuates below-threshold samples
            // before they hit the RMS calculation. 0.003 is ~58 dB
            // below full-scale.
            noise_gate_threshold: 0.003,
            // Safety cap — at 12 s the speech buffer is force-emitted
            // even without a silence boundary. Was 30 s, lowered
            // 2026-05-17 because (a) interview questions rarely run
            // past 10 s without a natural pause, and (b) a 30 s blob
            // takes 3-5 s to round-trip AAI batch STT, which delays
            // the Claude trigger long enough to feel sluggish. 12 s
            // is comfortably above the median question length and
            // keeps round-trip latency under 2 s.
            max_recording_duration_secs: 12,
        }
    }
}

// ── Utterance produced by the VAD ────────────────────────────────────

/// A single VAD-segmented utterance ready for STT.
///
/// The WAV is mono 16-bit PCM at the source sample rate (typically
/// 48 kHz from SCK / Core Audio Tap). The Worker route will resample
/// internally as needed.
#[derive(Debug)]
pub struct Utterance {
    pub wav_bytes: Vec<u8>,
    pub duration_ms: u64,
}

// ── Public entry point ────────────────────────────────────────────────

/// Drain `audio_buf` on a fixed cadence, feed samples into the VAD
/// state machine, and send one `Utterance` per detected speech segment
/// down `tx`. Returns when `stop_flag` flips to `true` or `tx` is
/// dropped.
///
/// `audio_rate` is the source rate (e.g. 48 kHz from SCK). The output
/// WAV stays at that rate — downstream STT handles resampling.
///
/// `app` is the Tauri AppHandle, used to emit the lightweight
/// `vad-speech-start` event so the UI can show a "listening hot" pip;
/// we deliberately DO NOT emit the WAV blob over Tauri events (it
/// would cost a JSON-over-IPC roundtrip on every utterance for no
/// reason — the consumer lives in the same Rust process).
pub async fn run_vad_capture(
    app: tauri::AppHandle,
    audio_buf: Arc<Mutex<Vec<f32>>>,
    audio_rate: u32,
    stop_flag: Arc<AtomicBool>,
    tx: mpsc::Sender<Utterance>,
    config: VadConfig,
) {
    use tauri::Emitter;

    // Sample carry-over from one drain to the next so the VAD always
    // works on full hop_size chunks even when the drain returns a
    // partial tick.
    let mut carry: VecDeque<f32> = VecDeque::new();
    let mut pre_speech: VecDeque<f32> =
        VecDeque::with_capacity(config.pre_speech_chunks * config.hop_size);
    let mut speech_buffer: Vec<f32> = Vec::new();
    let mut in_speech = false;
    let mut silence_chunks = 0usize;
    let mut speech_chunks = 0usize;
    let max_samples = (audio_rate as usize) * (config.max_recording_duration_secs as usize);

    // Match the session.rs audio-drain cadence — 100 ms gives a hop-
    // size of ~4800 samples per tick at 48 kHz which is 4-5 VAD chunks
    // (1024 samples each) — plenty of granularity for silence
    // detection.
    const DRAIN_MS: u64 = 100;

    // Initial buffer skip: anything sitting in the source buffer at
    // VAD startup is BACKLOG accumulated between SCK init and us
    // getting here. Throwing it away avoids the very first utterance
    // being polluted by capture-thread warmup noise.
    {
        let mut buf = match audio_buf.lock() {
            Ok(g) => g,
            Err(p) => p.into_inner(),
        };
        buf.clear();
    }

    loop {
        if stop_flag.load(Ordering::SeqCst) {
            break;
        }
        tokio::time::sleep(Duration::from_millis(DRAIN_MS)).await;

        // ── Drain the source buffer ─────────────────────────────────
        let new_samples: Vec<f32> = {
            let mut buf = match audio_buf.lock() {
                Ok(g) => g,
                Err(p) => p.into_inner(),
            };
            // Same anti-bloat drain pattern as the previous WS reader:
            // take everything, clear the upstream buffer, no cursor.
            std::mem::take(&mut *buf)
        };

        if new_samples.is_empty() {
            continue;
        }
        for s in new_samples {
            carry.push_back(s);
        }

        // ── Process every full hop_size chunk we have available ─────
        while carry.len() >= config.hop_size {
            let mut mono: Vec<f32> = Vec::with_capacity(config.hop_size);
            for _ in 0..config.hop_size {
                if let Some(v) = carry.pop_front() {
                    mono.push(v);
                }
            }

            // Apply the noise gate BEFORE the RMS / peak calc — the
            // gate's soft knee attenuates everything below the
            // threshold, so the RMS we compute is the post-gate RMS
            // which is what the sensitivity_rms threshold expects.
            let gated = apply_noise_gate(&mono, config.noise_gate_threshold);
            let (rms, peak) = calculate_audio_metrics(&gated);
            let is_speech = rms > config.sensitivity_rms || peak > config.peak_threshold;

            if is_speech {
                if !in_speech {
                    // Speech START
                    in_speech = true;
                    speech_chunks = 0;
                    let pre_len_samples = pre_speech.len();
                    let pre_ms = (pre_len_samples as u64 * 1000) / audio_rate as u64;
                    speech_buffer.extend(pre_speech.drain(..));
                    tracing::info!("vad: speech-start ({pre_ms}ms pre-roll)");
                    let _ = app.emit("vad-speech-start", ());
                }

                speech_chunks += 1;
                speech_buffer.extend_from_slice(&gated);
                silence_chunks = 0;

                // Safety cap — runaway speech (someone monologuing for
                // 30+ seconds without a pause). Force-emit and reset.
                if speech_buffer.len() > max_samples {
                    let duration_ms =
                        (speech_buffer.len() as u64 * 1000) / audio_rate as u64;
                    let normalized = normalize_audio_level(&speech_buffer, 0.1);
                    if let Ok(wav) = samples_to_wav_bytes(audio_rate, &normalized) {
                        let wav_len = wav.len();
                        tracing::info!(
                            "vad: utterance complete (force-cap {} ms, {} bytes)",
                            duration_ms,
                            wav_len,
                        );
                        if tx
                            .send(Utterance {
                                wav_bytes: wav,
                                duration_ms,
                            })
                            .await
                            .is_err()
                        {
                            return;
                        }
                    }
                    speech_buffer.clear();
                    in_speech = false;
                    speech_chunks = 0;
                }
            } else {
                if in_speech {
                    // Silence INSIDE an utterance — keep collecting
                    // (we want natural inter-word gaps in the audio)
                    // until silence_chunks crosses the threshold.
                    silence_chunks += 1;
                    speech_buffer.extend_from_slice(&gated);

                    if silence_chunks >= config.silence_chunks {
                        // Utterance over. Decide whether to emit or
                        // discard based on minimum speech length.
                        if speech_chunks >= config.min_speech_chunks
                            && !speech_buffer.is_empty()
                        {
                            // Trim trailing silence but keep ~150 ms
                            // for a natural ending — speech audio cut
                            // dead at the threshold sounds robotic and
                            // STT engines slightly prefer a tail.
                            let silence_duration_samples =
                                silence_chunks * config.hop_size;
                            let keep_silence_samples =
                                (audio_rate as usize) * 15 / 100;
                            let trim_amount = silence_duration_samples
                                .saturating_sub(keep_silence_samples);
                            if speech_buffer.len() > trim_amount {
                                let new_len = speech_buffer.len() - trim_amount;
                                speech_buffer.truncate(new_len);
                            }

                            let word_estimate =
                                (speech_chunks as u64) / 9; // rough — ~9 hops per word
                            let duration_ms =
                                (speech_buffer.len() as u64 * 1000) / audio_rate as u64;
                            let normalized =
                                normalize_audio_level(&speech_buffer, 0.1);
                            match samples_to_wav_bytes(audio_rate, &normalized) {
                                Ok(wav) => {
                                    tracing::info!(
                                        "vad: utterance complete (~{} words, {} ms, {} bytes)",
                                        word_estimate,
                                        duration_ms,
                                        wav.len(),
                                    );
                                    if tx
                                        .send(Utterance {
                                            wav_bytes: wav,
                                            duration_ms,
                                        })
                                        .await
                                        .is_err()
                                    {
                                        return;
                                    }
                                }
                                Err(e) => {
                                    tracing::warn!("vad: WAV encode error: {e}");
                                }
                            }
                        } else {
                            tracing::info!(
                                "vad: utterance discarded (too short, {} chunks)",
                                speech_chunks
                            );
                        }
                        speech_buffer.clear();
                        in_speech = false;
                        silence_chunks = 0;
                        speech_chunks = 0;
                    }
                } else {
                    // Pre-speech rolling buffer. Push the gated samples
                    // (not the raw ones) so the pre-roll inherits the
                    // same noise-gate floor as the rest of the
                    // utterance — avoids a sudden gain bump at the
                    // start of the WAV.
                    for s in gated.iter().copied() {
                        pre_speech.push_back(s);
                    }
                    let cap = config.pre_speech_chunks * config.hop_size;
                    while pre_speech.len() > cap {
                        pre_speech.pop_front();
                    }
                }
            }
        }
    }
}

// ── Helpers — ported verbatim from Pluely ─────────────────────────────

/// Soft-knee noise gate. Samples below `threshold` are attenuated by
/// `(abs / threshold)^(1/KNEE_RATIO)` so we get gradual rolloff rather
/// than a hard cliff (= clicks). Above threshold the sample passes
/// untouched.
fn apply_noise_gate(samples: &[f32], threshold: f32) -> Vec<f32> {
    const KNEE_RATIO: f32 = 3.0;
    samples
        .iter()
        .map(|&s| {
            let abs = s.abs();
            if abs < threshold {
                s * (abs / threshold).powf(1.0 / KNEE_RATIO)
            } else {
                s
            }
        })
        .collect()
}

/// Per-chunk RMS and peak. One pass over the buffer, returns both so
/// the VAD can OR the two thresholds (RMS catches sustained speech,
/// peak catches plosives).
fn calculate_audio_metrics(chunk: &[f32]) -> (f32, f32) {
    if chunk.is_empty() {
        return (0.0, 0.0);
    }
    let mut sumsq = 0.0f32;
    let mut peak = 0.0f32;
    for &v in chunk {
        let a = v.abs();
        if a > peak {
            peak = a;
        }
        sumsq += v * v;
    }
    let rms = (sumsq / chunk.len() as f32).sqrt();
    (rms, peak)
}

/// RMS-based gain normalisation with a tanh-style soft-clip on the way
/// out so we don't hit hard digital clipping on a transient. STT
/// engines do much better on a consistent loudness level than on the
/// raw signal, and 48 kHz speech recorded from system audio is often
/// quiet (laptop speakers leaking back through SCK).
fn normalize_audio_level(samples: &[f32], target_rms: f32) -> Vec<f32> {
    if samples.is_empty() {
        return Vec::new();
    }
    let sum_squares: f32 = samples.iter().map(|&s| s * s).sum();
    let current_rms = (sum_squares / samples.len() as f32).sqrt();
    if current_rms < 0.001 {
        return samples.to_vec();
    }
    let gain = (target_rms / current_rms).min(10.0);
    samples
        .iter()
        .map(|&s| {
            let amplified = s * gain;
            if amplified.abs() > 1.0 {
                amplified.signum() * (1.0 - (-amplified.abs()).exp())
            } else {
                amplified
            }
        })
        .collect()
}

/// Encode mono f32 PCM at `sample_rate` to a 16-bit PCM WAV byte
/// buffer. The caller forwards these bytes to the STT route as a
/// multipart `wav` field.
fn samples_to_wav_bytes(sample_rate: u32, mono_f32: &[f32]) -> Result<Vec<u8>> {
    if mono_f32.is_empty() {
        anyhow::bail!("empty audio buffer");
    }
    let mut cursor = Cursor::new(Vec::new());
    let spec = WavSpec {
        channels: 1,
        sample_rate,
        bits_per_sample: 16,
        sample_format: HoundSampleFormat::Int,
    };
    let mut writer = WavWriter::new(&mut cursor, spec)?;
    for &s in mono_f32 {
        let clamped = s.clamp(-1.0, 1.0);
        let sample_i16 = (clamped * i16::MAX as f32) as i16;
        writer.write_sample(sample_i16)?;
    }
    writer.finalize()?;
    Ok(cursor.into_inner())
}
