use anyhow::{anyhow, Context, Result};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{SampleFormat, StreamConfig};
use hound::{SampleFormat as HoundFormat, WavSpec, WavWriter};
use std::io::Cursor;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tokio::sync::oneshot;
use tracing::info;

/// List all available audio input device names on this host.
pub fn list_input_devices() -> Vec<String> {
    let host = cpal::default_host();
    match host.input_devices() {
        Ok(iter) => iter.filter_map(|d| d.name().ok()).collect(),
        Err(e) => {
            tracing::warn!("could not list input devices: {e}");
            Vec::new()
        }
    }
}

/// Channel-of-origin label for the dual capture pipeline.
/// `Mic` = your voice. `Loopback` = the recruiter's voice (via BlackHole / system audio).
#[derive(Debug, Clone, Copy)]
pub enum Channel {
    Mic,
    Loopback,
}

impl Channel {
    pub fn label(&self) -> &'static str {
        match self {
            Channel::Mic => "user",
            Channel::Loopback => "recruiter",
        }
    }
}

/// Output of a single capture: WAV bytes + which channel produced them.
#[derive(Debug)]
pub struct ChannelCapture {
    pub channel: Channel,
    pub wav: Vec<u8>,
}

/// Records two devices in parallel for `duration_secs`, returns both WAV buffers
/// labelled by channel of origin. If `loopback_device` is empty, only the mic is recorded.
///
/// Each capture runs on its own OS thread (cpal Stream is !Send on macOS). Both
/// share a single AtomicBool stop flag bridged from the async oneshot.
pub async fn record_dual_wav(
    duration_secs: u32,
    mic_device: String,
    loopback_device: String,
    stop_rx: oneshot::Receiver<()>,
) -> Result<Vec<ChannelCapture>> {
    let stop_flag = Arc::new(AtomicBool::new(false));

    let stop_flag_for_signal = stop_flag.clone();
    tokio::spawn(async move {
        let _ = stop_rx.await;
        stop_flag_for_signal.store(true, Ordering::SeqCst);
    });

    // Spawn mic capture
    let mic_flag = stop_flag.clone();
    let mic_handle = tokio::task::spawn_blocking(move || -> Result<Vec<u8>> {
        record_blocking(duration_secs, &mic_device, mic_flag)
    });

    // Spawn loopback capture (only if a device is selected)
    let loopback_handle = if !loopback_device.is_empty() {
        let lb_flag = stop_flag.clone();
        Some(tokio::task::spawn_blocking(move || -> Result<Vec<u8>> {
            record_blocking(duration_secs, &loopback_device, lb_flag)
        }))
    } else {
        None
    };

    let mut out = Vec::with_capacity(2);

    let mic_wav = mic_handle
        .await
        .map_err(|e| anyhow!("mic task panicked: {e}"))??;
    out.push(ChannelCapture {
        channel: Channel::Mic,
        wav: mic_wav,
    });

    if let Some(h) = loopback_handle {
        match h.await {
            Ok(Ok(wav)) => out.push(ChannelCapture {
                channel: Channel::Loopback,
                wav,
            }),
            Ok(Err(e)) => {
                tracing::warn!("loopback capture failed: {e:?}");
                // Don't fail the whole pipeline — the mic capture still gives us something.
            }
            Err(e) => {
                tracing::warn!("loopback task panicked: {e}");
            }
        }
    }

    Ok(out)
}

/// Backwards-compatible single-device capture (kept for non-dual code paths).
#[allow(dead_code)]
pub async fn record_mic_wav(
    duration_secs: u32,
    device_name: String,
    stop_rx: oneshot::Receiver<()>,
) -> Result<Vec<u8>> {
    let stop_flag = Arc::new(AtomicBool::new(false));

    let stop_flag_for_signal = stop_flag.clone();
    tokio::spawn(async move {
        let _ = stop_rx.await;
        stop_flag_for_signal.store(true, Ordering::SeqCst);
    });

    let stop_flag_blocking = stop_flag.clone();
    tokio::task::spawn_blocking(move || -> Result<Vec<u8>> {
        record_blocking(duration_secs, &device_name, stop_flag_blocking)
    })
    .await
    .map_err(|e| anyhow!("audio task panicked: {e}"))?
}

fn record_blocking(
    duration_secs: u32,
    device_name: &str,
    stop_flag: Arc<AtomicBool>,
) -> Result<Vec<u8>> {
    let host = cpal::default_host();

    let device = if device_name.is_empty() {
        host.default_input_device()
            .ok_or_else(|| anyhow!("no default input device"))?
    } else {
        host.input_devices()?
            .find(|d| d.name().map(|n| n == device_name).unwrap_or(false))
            .ok_or_else(|| anyhow!("input device not found: {device_name}"))?
    };

    let resolved_name = device.name().unwrap_or_else(|_| "(unknown)".into());
    info!("opening input device: {}", resolved_name);

    let supported = device
        .default_input_config()
        .context("default input config")?;

    let sample_format = supported.sample_format();
    let channels = supported.channels();
    let input_rate = supported.sample_rate().0;
    info!(
        "[{}] config: {} Hz, {} channels, {:?}",
        resolved_name, input_rate, channels, sample_format
    );

    let buffer: Arc<Mutex<Vec<f32>>> = Arc::new(Mutex::new(Vec::with_capacity(
        (input_rate as usize) * (duration_secs as usize),
    )));

    let buf_clone = buffer.clone();
    let chans = channels as usize;

    let stream = match sample_format {
        SampleFormat::F32 => {
            let cfg: StreamConfig = supported.into();
            device.build_input_stream(
                &cfg,
                move |data: &[f32], _| {
                    let mut b = buf_clone.lock().unwrap();
                    if chans == 1 {
                        b.extend_from_slice(data);
                    } else {
                        for frame in data.chunks(chans) {
                            let avg = frame.iter().sum::<f32>() / chans as f32;
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
                    if chans == 1 {
                        b.extend(data.iter().map(|&s| s as f32 / i16::MAX as f32));
                    } else {
                        for frame in data.chunks(chans) {
                            let avg = frame
                                .iter()
                                .map(|&s| s as f32 / i16::MAX as f32)
                                .sum::<f32>()
                                / chans as f32;
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
                    if chans == 1 {
                        b.extend(data.iter().map(|&s| (s as f32 - scale) / scale));
                    } else {
                        for frame in data.chunks(chans) {
                            let avg = frame
                                .iter()
                                .map(|&s| (s as f32 - scale) / scale)
                                .sum::<f32>()
                                / chans as f32;
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

    stream.play().context("failed to start audio stream")?;
    info!("[{}] recording started, target {}s", resolved_name, duration_secs);

    let start = Instant::now();
    let target = Duration::from_secs(duration_secs as u64);
    while start.elapsed() < target {
        if stop_flag.load(Ordering::SeqCst) {
            info!("[{}] recording stopped early", resolved_name);
            break;
        }
        std::thread::sleep(Duration::from_millis(50));
    }

    drop(stream);

    let raw = {
        let b = buffer.lock().unwrap();
        b.clone()
    };
    let resampled = resample_to_16k(&raw, input_rate);
    info!(
        "[{}] {} samples @ {}Hz → {} @ 16kHz",
        resolved_name,
        raw.len(),
        input_rate,
        resampled.len()
    );

    encode_wav_16k_mono(&resampled)
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
