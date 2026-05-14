//! Continuous session mode: streams mic/loopback to AssemblyAI real-time STT,
//! fires the Claude pipeline the moment AssemblyAI signals end of utterance.

use crate::{llm, CaptureConfig};
use anyhow::{anyhow, Context, Result};
use bytes::Bytes;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{SampleFormat, StreamConfig};
use futures_util::{SinkExt, StreamExt};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::sync::{mpsc, oneshot};
use tokio_tungstenite::{connect_async, tungstenite::Message};
use tracing::{info, warn};

// ── AssemblyAI real-time endpoint (v3) ────────────────────────────────────────
//
// Token-based auth (v3): the merchant API key never leaves the Career OS
// Cloudflare Worker. The dashboard exchanges its user JWT for a short-lived
// AssemblyAI token via `POST /v1/copilot/transcription-token`, then passes
// that temp token through `CaptureConfig::assemblyai_key`. We append it as
// a `?token=<…>` query parameter on the WebSocket URL — no Authorization
// header needed (and AssemblyAI v3 rejects the header anyway).
const AAI_WS_URL_BASE: &str =
    "wss://streaming.assemblyai.com/v3/ws\
     ?sample_rate=16000\
     &speech_model=u3-rt-pro";

/// How many ms of audio we batch per WebSocket frame sent to AssemblyAI.
const CHUNK_MS: u64 = 100;

// ── AssemblyAI transcript event ───────────────────────────────────────────────

#[derive(serde::Deserialize)]
struct AaiEvent {
    #[serde(rename = "type")]
    event_type: String,
    #[serde(default)]
    transcript: String,
    #[serde(default)]
    turn_is_formatted: bool,
}

// ── Public entry point ────────────────────────────────────────────────────────

pub async fn run_session(
    app: AppHandle,
    config: CaptureConfig,
    stop_rx: oneshot::Receiver<()>,
) -> Result<()> {
    if config.assemblyai_key.is_empty() {
        return Err(anyhow!(
            "AssemblyAI temp token missing — fetch one via /v1/copilot/transcription-token before starting a session"
        ));
    }

    // ── Stop flag (shared across tasks) ──────────────────────────────────────
    let stop_flag = Arc::new(AtomicBool::new(false));
    let stop_for_signal = stop_flag.clone();
    tokio::spawn(async move {
        let _ = stop_rx.await;
        stop_for_signal.store(true, Ordering::SeqCst);
    });

    // ── Open audio devices in a blocking thread (cpal is !Send) ──────────────
    let (dev_tx, dev_rx) =
        oneshot::channel::<(Arc<Mutex<Vec<f32>>>, u32)>();

    let stop_for_audio = stop_flag.clone();
    let config_audio   = config.clone();

    tokio::task::spawn_blocking(move || {
        let host = cpal::default_host();

        let mic = match open_input(&host, &config_audio.audio_device) {
            Ok(d)  => d,
            Err(e) => { warn!("mic open error: {e}"); return; }
        };
        let loopback = if config_audio.loopback_device.is_empty() {
            None
        } else {
            match open_input(&host, &config_audio.loopback_device) {
                Ok(d)  => Some(d),
                Err(e) => { warn!("loopback unavailable: {e}"); None }
            }
        };

        let primary_buf = loopback
            .as_ref()
            .map(|d| d.buffer.clone())
            .unwrap_or_else(|| mic.buffer.clone());
        let primary_rate = loopback.as_ref().map(|d| d.rate).unwrap_or(mic.rate);

        info!(
            "audio ready: {}Hz, loopback={}",
            primary_rate,
            loopback.is_some()
        );
        let _ = dev_tx.send((primary_buf, primary_rate));

        // Keep streams alive until session stops
        while !stop_for_audio.load(Ordering::SeqCst) {
            std::thread::sleep(Duration::from_millis(100));
        }
        drop(mic);
        drop(loopback);
    });

    let (primary_buf, primary_rate) =
        dev_rx.await.context("audio device init failed")?;

    // ── Connect to AssemblyAI WebSocket ───────────────────────────────────────
    // AssemblyAI v3 streaming uses query-param token auth, not headers.
    // We build the URL with the temp token appended; tungstenite handles
    // sec-websocket-key / Upgrade / Origin via IntoClientRequest.
    let ws_url = format!("{AAI_WS_URL_BASE}&token={}", config.assemblyai_key);
    let request = {
        use tokio_tungstenite::tungstenite::client::IntoClientRequest;
        ws_url
            .as_str()
            .into_client_request()
            .context("build AAI request")?
    };

    let (ws_conn, _) = connect_async(request)
        .await
        .context("AssemblyAI WebSocket connect failed (token may be expired)")?;

    info!("AssemblyAI connected");
    app.emit("status", "listening").ok();

    let (mut ws_sink, mut ws_rx) = ws_conn.split();

    // ── Audio reader → pcm channel ────────────────────────────────────────────
    let (pcm_tx, mut pcm_rx) = mpsc::channel::<Bytes>(64);

    let stop_reader = stop_flag.clone();
    tokio::spawn(async move {
        let mut last_idx: usize = 0;
        loop {
            if stop_reader.load(Ordering::SeqCst) { break; }
            tokio::time::sleep(Duration::from_millis(CHUNK_MS)).await;

            let new_samples: Vec<f32> = {
                let buf = primary_buf.lock().unwrap();
                let start = last_idx.min(buf.len());
                let end   = buf.len();
                last_idx  = end;
                if end > start { buf[start..end].to_vec() } else { Vec::new() }
            };
            if new_samples.is_empty() { continue; }

            let resampled = resample_to_16k(&new_samples, primary_rate);
            let pcm: Vec<u8> = resampled
                .iter()
                .flat_map(|&s| {
                    let i = (s.clamp(-1.0, 1.0) * i16::MAX as f32) as i16;
                    i.to_le_bytes()
                })
                .collect();

            if pcm_tx.send(Bytes::from(pcm)).await.is_err() { break; }
        }
    });

    // ── pcm channel → WebSocket binary frames ─────────────────────────────────
    let stop_sender = stop_flag.clone();
    tokio::spawn(async move {
        while let Some(pcm) = pcm_rx.recv().await {
            if stop_sender.load(Ordering::SeqCst) { break; }
            if ws_sink.send(Message::Binary(pcm.into())).await.is_err() { break; }
        }
        let _ = ws_sink
            .send(Message::Text(r#"{"type":"Terminate"}"#.to_string()))
            .await;
        let _ = ws_sink.close().await;
    });

    // ── Conversation history ──────────────────────────────────────────────────
    let history: Arc<Mutex<Vec<llm::HistoryEntry>>> =
        Arc::new(Mutex::new(Vec::new()));

    // ── Debouncer: accumulate formatted turns, fire Claude after 1 s silence ──
    // Prevents firing mid-question when the recruiter pauses between sentences.
    let (question_tx, mut question_rx) = mpsc::channel::<String>(8);
    {
        let app_d  = app.clone();
        let cfg_d  = config.clone();
        let hist_d = history.clone();
        tokio::spawn(async move {
            // 2 s: gives the recruiter time to finish a multi-sentence question
            // without firing mid-utterance.
            const DEBOUNCE_MS: u64 = 2_000;
            let mut accumulated = String::new();
            loop {
                match tokio::time::timeout(
                    Duration::from_millis(DEBOUNCE_MS),
                    question_rx.recv(),
                )
                .await
                {
                    // New turn — keep accumulating, reset timer implicitly
                    Ok(Some(turn)) => {
                        if !accumulated.is_empty() { accumulated.push(' '); }
                        accumulated.push_str(&turn);
                    }
                    // Channel closed — session ended
                    Ok(None) => break,
                    // 1 s silence with pending text → fire Claude
                    Err(_) if !accumulated.is_empty() => {
                        let question      = std::mem::take(&mut accumulated);
                        let hist_snapshot = hist_d.lock().unwrap().clone();
                        let app2  = app_d.clone();
                        let cfg2  = cfg_d.clone();
                        let hist2 = hist_d.clone();
                        tokio::spawn(async move {
                            app2.emit("status", "thinking").ok();
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
                                    if h.len() > 3 { h.remove(0); }
                                }
                                Err(e) => { app2.emit("error", format!("{e:#}")).ok(); }
                            }
                            app2.emit("status", "listening").ok();
                        });
                    }
                    // Timeout but nothing pending — keep waiting
                    Err(_) => {}
                }
            }
        });
    }

    // ── Receive loop: transcript events from AssemblyAI ───────────────────────
    while let Some(msg) = ws_rx.next().await {
        if stop_flag.load(Ordering::SeqCst) { break; }

        let text = match msg {
            Ok(Message::Text(t))  => t,
            Ok(Message::Close(_)) => break,
            Err(e) => { warn!("WS recv error: {e}"); break; }
            _      => continue,
        };

        let ev = match serde_json::from_str::<AaiEvent>(&text) {
            Ok(e)  => e,
            Err(_) => continue,
        };

        match ev.event_type.as_str() {
            // Partial — show live word-by-word as recruiter speaks
            "Turn" if !ev.transcript.is_empty() && !ev.turn_is_formatted => {
                app.emit("transcript", &ev.transcript).ok();
            }
            // Formatted turn — push to debouncer (fires Claude after 1 s silence)
            "Turn" if !ev.transcript.is_empty() && ev.turn_is_formatted => {
                app.emit("transcript", &ev.transcript).ok();
                question_tx.send(ev.transcript.clone()).await.ok();
            }
            "Termination" => break,
            _ => {}
        }
    }

    stop_flag.store(true, Ordering::SeqCst);
    app.emit("status", "idle").ok();
    info!("session ended");
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
                    let mut b = buf_clone.lock().unwrap();
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
                |err| tracing::error!("audio error: {err}"),
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
