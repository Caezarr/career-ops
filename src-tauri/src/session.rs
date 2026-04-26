//! Continuous "session" mode: streams audio from mic + loopback in parallel,
//! detects question-end via energy-based VAD on the loopback (recruiter) channel,
//! and auto-fires the Whisper → Claude pipeline whenever a question completes.
//!
//! Replaces the single-shot 6s hotkey capture with a hands-free flow:
//! the user starts a session at the beginning of the interview, sees bullets
//! appear automatically after every question, and stops the session at the end.

use crate::{llm, stt, CaptureConfig};
use anyhow::{anyhow, Context, Result};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{SampleFormat, StreamConfig};
use hound::{SampleFormat as HoundFormat, WavSpec, WavWriter};
use std::io::Cursor;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};
use tokio::sync::oneshot;
use tracing::{info, warn};

/// VAD tuning. Energy is RMS of f32 samples in [-1, 1].
const SPEECH_RMS: f32 = 0.012; // above this = speech
const SILENCE_RMS: f32 = 0.006; // below this = silence
const MIN_SPEECH_MS: u64 = 350; // sustained speech to "open" a question
const MIN_SILENCE_MS: u64 = 900; // sustained silence to "close" a question
const MIN_QUESTION_MS: u64 = 800; // discard utterances shorter than this
const MAX_QUESTION_MS: u64 = 30_000; // hard cap on a single question slice
const POLL_MS: u64 = 80; // VAD tick

/// Spawn a session task. Returns once the audio devices are open.
/// The session runs until `stop_rx` fires (sent by `stop_capture`).
pub async fn run_session(
    app: AppHandle,
    config: CaptureConfig,
    stop_rx: oneshot::Receiver<()>,
) -> Result<()> {
    let stop_flag = Arc::new(AtomicBool::new(false));
    let stop_for_signal = stop_flag.clone();
    tokio::spawn(async move {
        let _ = stop_rx.await;
        stop_for_signal.store(true, Ordering::SeqCst);
    });

    let stop_flag_blocking = stop_flag.clone();
    let app_for_blocking = app.clone();
    let config_for_blocking = config.clone();

    // Whole capture stays on a dedicated OS thread (cpal Stream is !Send on macOS).
    tokio::task::spawn_blocking(move || {
        if let Err(e) = run_session_blocking(app_for_blocking, config_for_blocking, stop_flag_blocking)
        {
            warn!("session loop ended with error: {e:?}");
        }
    });

    Ok(())
}

fn run_session_blocking(
    app: AppHandle,
    config: CaptureConfig,
    stop: Arc<AtomicBool>,
) -> Result<()> {
    let host = cpal::default_host();

    let mic = open_input(&host, &config.audio_device).context("opening mic")?;
    let loopback = if config.loopback_device.is_empty() {
        None
    } else {
        match open_input(&host, &config.loopback_device) {
            Ok(d) => Some(d),
            Err(e) => {
                warn!("loopback unavailable: {e:?} — session will use mic only");
                None
            }
        }
    };

    info!(
        "session starting — mic='{}', loopback='{}'",
        mic.name,
        loopback
            .as_ref()
            .map(|d| d.name.as_str())
            .unwrap_or("(none)"),
    );

    // Active VAD source: loopback when present (we want to detect when the recruiter
    // finishes speaking), else mic.
    let primary_buf = loopback
        .as_ref()
        .map(|d| d.buffer.clone())
        .unwrap_or_else(|| mic.buffer.clone());
    let primary_rate = loopback.as_ref().map(|d| d.rate).unwrap_or(mic.rate);
    let mic_buf = mic.buffer.clone();
    let mic_rate = mic.rate;

    app.emit("status", "listening").ok();

    // VAD state machine
    let mut state = VadState::Silent;
    let mut speech_started_at: Option<Instant> = None;
    let mut silence_started_at: Option<Instant> = None;
    let mut question_start_idx: usize = primary_buf.lock().unwrap().len();
    let mut question_start_idx_mic: usize = mic_buf.lock().unwrap().len();

    let mut last_processed_to_idx_primary = primary_buf.lock().unwrap().len();
    let mut last_processed_to_idx_mic = mic_buf.lock().unwrap().len();

    while !stop.load(Ordering::SeqCst) {
        std::thread::sleep(Duration::from_millis(POLL_MS));

        let snapshot_len = primary_buf.lock().unwrap().len();
        if snapshot_len <= last_processed_to_idx_primary {
            continue; // no new samples
        }

        // Compute RMS of the last ~POLL_MS worth of samples
        let window_size = (primary_rate as u64 * POLL_MS / 1000) as usize;
        let buf = primary_buf.lock().unwrap();
        let start = snapshot_len.saturating_sub(window_size);
        let rms = compute_rms(&buf[start..snapshot_len]);
        drop(buf);
        last_processed_to_idx_primary = snapshot_len;
        last_processed_to_idx_mic = mic_buf.lock().unwrap().len();

        let now = Instant::now();
        match state {
            VadState::Silent => {
                if rms > SPEECH_RMS {
                    speech_started_at = Some(now);
                    state = VadState::MaybeSpeech;
                }
            }
            VadState::MaybeSpeech => {
                if rms < SILENCE_RMS {
                    state = VadState::Silent;
                    speech_started_at = None;
                } else if let Some(t) = speech_started_at {
                    if now.duration_since(t).as_millis() as u64 >= MIN_SPEECH_MS {
                        // Confirmed speech start. Mark question start.
                        question_start_idx = snapshot_len.saturating_sub(window_size * 5).max(0);
                        question_start_idx_mic = last_processed_to_idx_mic
                            .saturating_sub(((mic_rate as u64) * MIN_SPEECH_MS / 1000) as usize);
                        state = VadState::Speech;
                        info!("[vad] speech detected");
                    }
                }
            }
            VadState::Speech => {
                if rms < SILENCE_RMS {
                    silence_started_at = Some(now);
                    state = VadState::MaybeSilence;
                } else {
                    // Cap utterance length
                    let active_ms = now
                        .duration_since(speech_started_at.unwrap_or(now))
                        .as_millis() as u64;
                    if active_ms >= MAX_QUESTION_MS {
                        info!("[vad] max question length hit, forcing fire");
                        fire_pipeline(
                            app.clone(),
                            config.clone(),
                            primary_buf.clone(),
                            primary_rate,
                            question_start_idx,
                            snapshot_len,
                            mic_buf.clone(),
                            mic_rate,
                            question_start_idx_mic,
                            last_processed_to_idx_mic,
                        );
                        state = VadState::Silent;
                        speech_started_at = None;
                        silence_started_at = None;
                    }
                }
            }
            VadState::MaybeSilence => {
                if rms > SPEECH_RMS {
                    state = VadState::Speech;
                    silence_started_at = None;
                } else if let Some(t) = silence_started_at {
                    if now.duration_since(t).as_millis() as u64 >= MIN_SILENCE_MS {
                        // Confirmed end of utterance. Fire pipeline.
                        let utterance_ms = (snapshot_len - question_start_idx) as u64 * 1000
                            / primary_rate as u64;
                        if utterance_ms >= MIN_QUESTION_MS {
                            info!("[vad] question end, ~{}ms — firing", utterance_ms);
                            fire_pipeline(
                                app.clone(),
                                config.clone(),
                                primary_buf.clone(),
                                primary_rate,
                                question_start_idx,
                                snapshot_len,
                                mic_buf.clone(),
                                mic_rate,
                                question_start_idx_mic,
                                last_processed_to_idx_mic,
                            );
                        } else {
                            info!("[vad] short utterance ({utterance_ms}ms), skip");
                        }
                        state = VadState::Silent;
                        speech_started_at = None;
                        silence_started_at = None;
                    }
                }
            }
        }
    }

    info!("session stopping");
    app.emit("status", "idle").ok();
    // streams drop here -> capture stops
    drop(mic);
    drop(loopback);
    Ok(())
}

#[derive(Debug, Clone, Copy)]
enum VadState {
    Silent,
    MaybeSpeech,
    Speech,
    MaybeSilence,
}

fn compute_rms(samples: &[f32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }
    let sum_sq: f32 = samples.iter().map(|s| s * s).sum();
    (sum_sq / samples.len() as f32).sqrt()
}

#[allow(clippy::too_many_arguments)]
fn fire_pipeline(
    app: AppHandle,
    config: CaptureConfig,
    primary_buf: Arc<Mutex<Vec<f32>>>,
    primary_rate: u32,
    primary_start: usize,
    primary_end: usize,
    mic_buf: Arc<Mutex<Vec<f32>>>,
    mic_rate: u32,
    mic_start: usize,
    mic_end: usize,
) {
    // Snapshot the slices on the audio thread, then run the network pipeline async.
    let primary_slice: Vec<f32> = {
        let buf = primary_buf.lock().unwrap();
        let start = primary_start.min(buf.len());
        let end = primary_end.min(buf.len());
        if end > start { buf[start..end].to_vec() } else { Vec::new() }
    };
    let mic_slice: Vec<f32> = {
        let buf = mic_buf.lock().unwrap();
        let start = mic_start.min(buf.len());
        let end = mic_end.min(buf.len());
        if end > start { buf[start..end].to_vec() } else { Vec::new() }
    };

    tokio::spawn(async move {
        if let Err(e) = process_question(
            app.clone(),
            config,
            primary_slice,
            primary_rate,
            mic_slice,
            mic_rate,
        )
        .await
        {
            let _ = app.emit("error", e.to_string());
        }
    });
}

async fn process_question(
    app: AppHandle,
    config: CaptureConfig,
    primary_samples: Vec<f32>,
    primary_rate: u32,
    mic_samples: Vec<f32>,
    mic_rate: u32,
) -> Result<()> {
    app.emit("status", "thinking")?;

    let primary_wav = encode_wav_16k_mono(&resample_to_16k(&primary_samples, primary_rate))?;
    let mic_wav = if mic_samples.is_empty() {
        None
    } else {
        Some(encode_wav_16k_mono(&resample_to_16k(&mic_samples, mic_rate))?)
    };

    // Transcribe both (parallel)
    let (recruiter_res, user_res) = tokio::join!(
        stt::transcribe(&primary_wav, &config.openai_key),
        async {
            if let Some(w) = &mic_wav {
                stt::transcribe(w, &config.openai_key).await
            } else {
                Ok(String::new())
            }
        }
    );

    let recruiter = recruiter_res.unwrap_or_else(|e| {
        warn!("recruiter STT failed: {e:?}");
        String::new()
    });
    let user = user_res.unwrap_or_else(|e| {
        warn!("user STT failed: {e:?}");
        String::new()
    });

    let mut labeled = String::new();
    if !user.is_empty() {
        labeled.push_str("user: ");
        labeled.push_str(&user);
        labeled.push('\n');
    }
    if !recruiter.is_empty() {
        labeled.push_str("recruiter: ");
        labeled.push_str(&recruiter);
    }
    if labeled.is_empty() {
        labeled = "[silent / unintelligible]".to_string();
    }
    app.emit("transcript", &labeled)?;

    // Generate bullets only if we got recruiter content
    let question = if !recruiter.is_empty() { recruiter } else { user };
    if !question.is_empty() {
        let bullets = llm::generate_bullets(&config, &question).await?;
        app.emit("bullets", &bullets)?;
    }

    app.emit("status", "listening")?;
    Ok(())
}

// ============================================================================
// Continuous capture device (separate from the single-shot record_blocking)
// ============================================================================

struct LiveDevice {
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

    let supported = device.default_input_config()?;
    let sample_format = supported.sample_format();
    let channels = supported.channels() as usize;
    let rate = supported.sample_rate().0;

    let buffer: Arc<Mutex<Vec<f32>>> = Arc::new(Mutex::new(Vec::with_capacity(rate as usize * 30)));
    let buf_clone = buffer.clone();

    let stream = match sample_format {
        SampleFormat::F32 => {
            let cfg: StreamConfig = supported.into();
            device.build_input_stream(
                &cfg,
                move |data: &[f32], _| {
                    let mut b = buf_clone.lock().unwrap();
                    if channels == 1 {
                        b.extend_from_slice(data);
                    } else {
                        for frame in data.chunks(channels) {
                            let avg = frame.iter().sum::<f32>() / channels as f32;
                            b.push(avg);
                        }
                    }
                },
                |err| tracing::error!("audio stream error: {err}"),
                None,
            )?
        }
        SampleFormat::I16 => {
            let cfg: StreamConfig = supported.into();
            device.build_input_stream(
                &cfg,
                move |data: &[i16], _| {
                    let mut b = buf_clone.lock().unwrap();
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
                |err| tracing::error!("audio stream error: {err}"),
                None,
            )?
        }
        SampleFormat::U16 => {
            let cfg: StreamConfig = supported.into();
            device.build_input_stream(
                &cfg,
                move |data: &[u16], _| {
                    let mut b = buf_clone.lock().unwrap();
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
                |err| tracing::error!("audio stream error: {err}"),
                None,
            )?
        }
        other => return Err(anyhow!("unsupported sample format {other:?}")),
    };

    stream.play()?;

    Ok(LiveDevice {
        name,
        rate,
        buffer,
        _stream: stream,
    })
}

fn resample_to_16k(input: &[f32], input_rate: u32) -> Vec<f32> {
    if input_rate == 16_000 {
        return input.to_vec();
    }
    let ratio = input_rate as f32 / 16_000.0;
    let out_len = (input.len() as f32 / ratio) as usize;
    let mut out = Vec::with_capacity(out_len);
    for i in 0..out_len {
        let src = i as f32 * ratio;
        let idx = src as usize;
        let frac = src - idx as f32;
        let s0 = input.get(idx).copied().unwrap_or(0.0);
        let s1 = input.get(idx + 1).copied().unwrap_or(s0);
        out.push(s0 + (s1 - s0) * frac);
    }
    out
}

fn encode_wav_16k_mono(samples: &[f32]) -> Result<Vec<u8>> {
    let spec = WavSpec {
        channels: 1,
        sample_rate: 16_000,
        bits_per_sample: 16,
        sample_format: HoundFormat::Int,
    };
    let mut cursor = Cursor::new(Vec::<u8>::new());
    {
        let mut writer = WavWriter::new(&mut cursor, spec)?;
        for s in samples {
            let clamped = s.clamp(-1.0, 1.0);
            let i16_sample = (clamped * i16::MAX as f32) as i16;
            writer.write_sample(i16_sample)?;
        }
        writer.finalize()?;
    }
    Ok(cursor.into_inner())
}
