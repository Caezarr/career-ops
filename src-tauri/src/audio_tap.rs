//! macOS Core Audio Tap loopback capture (Phase 2 — replaces BlackHole).
//!
//! Drops the BlackHole prerequisite for beta users by capturing the
//! system audio output (interviewer's voice via Zoom/Meet/Teams)
//! through Apple's public Core Audio Tap API (macOS 14.4+).
//!
//! Architecture mirrors Pluely's `speaker/macos.rs` reference:
//!   1. `TapDesc::with_mono_global_tap_excluding_processes(&[])` —
//!      mono tap that grabs ALL system audio.
//!   2. `tap_desc.create_process_tap()` — registers the tap with
//!      Core Audio, returns a `TapGuard` that revokes on drop.
//!   3. `AggregateDevice::with_desc(...)` — wraps the default
//!      output device + the tap into a single virtual input device.
//!   4. `agg.create_io_proc_id(proc, Some(ctx))` — installs a
//!      C-callable callback the kernel invokes on a real-time audio
//!      thread with f32 samples.
//!   5. The IO proc pushes samples into a `ringbuf::HeapProd`; the
//!      async drain on the Tokio side pops them, resamples to 16
//!      kHz mono, and either streams (live session) or batches into
//!      a WAV blob (single-shot).
//!
//! Two public entry points are exposed so both the existing
//! `audio::record_dual_wav` (single-shot WAV) AND the streaming
//! `session::run_session` path can route to Core Audio Tap.
//!
//! Requires macOS 14.4+. Callers MUST verify the OS version before
//! invoking this module — `TapDesc::with_mono_global_tap_excluding_processes`
//! traps on older systems.

use anyhow::{anyhow, Context, Result};
use cidre::{
    arc,
    cat::{AudioBufList, AudioStreamBasicDesc},
    cf,
    core_audio::{
        self as ca, aggregate_device_keys as agg_keys, hardware::sub_tap_keys,
        sub_device_keys, AggregateDevice, Device, TapDesc, TapGuard,
    },
    ns, os,
};
use hound::{SampleFormat as HoundFormat, WavSpec, WavWriter};
use ringbuf::{
    traits::{Consumer, Producer, Split},
    HeapCons, HeapProd, HeapRb,
};
use std::io::Cursor;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tracing::{info, warn};

// ── Output format used by the rest of the pipeline ────────────────────────────
//
// AssemblyAI v3 streaming + Whisper both consume 16 kHz mono PCM 16-bit.
// We keep this constant alongside the WAV writer so the resampling
// path is dead-obvious at the call site.
const TARGET_SAMPLE_RATE: u32 = 16_000;

// Ring buffer size: 128 K f32 samples ≈ 2.7 s of audio at 48 kHz.
// Pluely uses the same constant — generous enough that a 100 ms
// stall in the drain task doesn't cause overflow, but small enough
// that we don't burn ~512 KB for a stream we're actively draining.
const RING_BUFFER_CAPACITY: usize = 1024 * 128;

/// Context handed to the C-ABI IO proc. The proc runs on a real-time
/// audio thread; everything it touches must be `Send` + free of locks
/// that the consumer side could hold for arbitrary durations.
struct IoProcCtx {
    producer: HeapProd<f32>,
    /// Sample rate of the tap (set on first callback, refreshed each
    /// frame in case the system switches outputs). Atomic so the
    /// consumer side can read it without locking.
    sample_rate: Arc<AtomicU32>,
    /// Counts consecutive `push_slice` short-writes. Tripping > 50
    /// in a row marks the stream terminal — see Pluely's same
    /// guard, prevents a runaway ring overflow from silently
    /// dropping a full interview.
    consecutive_drops: u32,
    /// One-shot diagnostic: how many of the FIRST IO callbacks should
    /// dump per-buffer layout via eprintln. Drops to 0 after dumping
    /// — the IO proc must not allocate on a real-time thread for the
    /// rest of the session.
    debug_dumps_remaining: u8,
    /// Set by the IO proc when it gives up on the stream OR by the
    /// drop guard when the consumer side wants the proc to stop
    /// pushing.
    should_terminate: Arc<AtomicBool>,
}

/// RAII wrapper around `AggregateDevice` + `TapGuard` + the heap-
/// allocated context. Dropping stops the device and revokes the tap.
///
/// `_started` keeps the `ca::hardware::StartedDevice` alive so the
/// kernel keeps invoking our IO proc — the `Drop` impl on
/// `StartedDevice` issues `AudioDeviceStop` + `AudioDeviceDestroyIOProcID`
/// for us. The `_tap` field guards the tap itself; its `Drop` calls
/// `AudioHardwareDestroyProcessTap`.
pub struct SystemAudioCapture {
    consumer: HeapCons<f32>,
    sample_rate: Arc<AtomicU32>,
    should_terminate: Arc<AtomicBool>,
    /// `Box<IoProcCtx>` is held alive by the running device — but we
    /// also need to drop it AFTER `_started`, so we keep a handle
    /// here. Tagged `_` because the consumer never touches it.
    _ctx: Box<IoProcCtx>,
    _started: ca::hardware::StartedDevice<AggregateDevice>,
    _tap: TapGuard,
}

impl SystemAudioCapture {
    /// Build the tap + aggregate device + IO proc and start it. The
    /// returned struct holds the audio pipeline alive; drop it to
    /// stop capture.
    pub fn start() -> Result<Self> {
        // 1. Resolve the default output device — every aggregate
        //    device needs a "main sub device" to clock from. We can't
        //    use the tap as the main, so we pin the speaker.
        let output_device: Device = ca::System::default_output_device()
            .map_err(|e| anyhow!("Core Audio: no default output device ({:?})", e))?;
        let output_uid: arc::R<cf::String> = output_device
            .uid()
            .map_err(|e| anyhow!("Core Audio: read output device UID ({:?})", e))?;

        // 2. Build the tap descriptor — mono, global, no process
        //    exclusions (= captures everything the user hears).
        let tap_desc = TapDesc::with_mono_global_tap_excluding_processes(&ns::Array::new());

        // 3. Materialise the tap. After this point `_tap` owns the
        //    underlying CoreAudio object; dropping it calls
        //    `AudioHardwareDestroyProcessTap`.
        let tap: TapGuard = tap_desc
            .create_process_tap()
            .map_err(|e| anyhow!("Core Audio: create_process_tap failed ({:?}) — macOS 14.4+ required, also check Settings → Privacy & Security → Microphone for Career OS", e))?;

        let tap_uid: arc::R<cf::String> = tap
            .uid()
            .map_err(|e| anyhow!("Core Audio: tap UID ({:?})", e))?;

        // 4. Sub-device dict (the speaker) + sub-tap dict (the tap).
        //    These are the entries CoreAudio expects inside the
        //    aggregate-device composition.
        let sub_device = cf::DictionaryOf::with_keys_values(
            &[sub_device_keys::uid()],
            &[output_uid.as_type_ref()],
        );
        // 2026-05-16 Tahoe fix: include `kAudioSubTapDriftCompensationKey`
        // on the sub-tap entry. Apple's AudioCap reference sample sets
        // this; Pluely (and our previous code, copied from Pluely)
        // omitted it. On macOS Tahoe 26 the omission causes the
        // CoreAudio resampler to underrun silently when the tap's
        // clock drifts vs the main sub-device — the IO proc keeps
        // firing but delivers all-zero buffers. See Apple Developer
        // Forums thread 825780 and AudioCap ProcessTap.swift.
        let sub_tap = cf::DictionaryOf::with_keys_values(
            &[sub_tap_keys::uid(), sub_tap_keys::drift_compensation()],
            &[
                tap_uid.as_type_ref(),
                cf::Boolean::value_true().as_type_ref(),
            ],
        );

        // 5. Aggregate-device descriptor. `is_private = true` keeps
        //    the device scoped to our process so we don't leak a
        //    "Career OS Loopback" entry into the user's Audio MIDI
        //    Setup. `tap_auto_start = true` boots the tap when the
        //    device starts.
        let agg_desc_uuid = cf::Uuid::new().to_cf_string();
        let agg_name = cf::str!(c"career-os-system-audio-tap");
        let agg_desc = cf::DictionaryOf::with_keys_values(
            &[
                agg_keys::is_private(),
                agg_keys::is_stacked(),
                agg_keys::tap_auto_start(),
                agg_keys::name(),
                agg_keys::main_sub_device(),
                agg_keys::uid(),
                agg_keys::sub_device_list(),
                agg_keys::tap_list(),
            ],
            &[
                cf::Boolean::value_true().as_type_ref(),
                cf::Boolean::value_false().as_type_ref(),
                cf::Boolean::value_true().as_type_ref(),
                agg_name.as_type_ref(),
                output_uid.as_type_ref(),
                agg_desc_uuid.as_type_ref(),
                cf::ArrayOf::from_slice(&[sub_device.as_ref()]).as_type_ref(),
                cf::ArrayOf::from_slice(&[sub_tap.as_ref()]).as_type_ref(),
            ],
        );

        // 6. Read the tap's native format so the consumer side knows
        //    what sample rate it's getting (refreshed each callback
        //    in case the user changes output mid-session — e.g.
        //    plugs in headphones).
        let asbd: AudioStreamBasicDesc = tap
            .asbd()
            .map_err(|e| anyhow!("Core Audio: tap ASBD ({:?})", e))?;
        let initial_rate = asbd.sample_rate as u32;
        info!(
            "audio-tap: format {} Hz, {} channels — taking global system audio",
            initial_rate, asbd.channels_per_frame
        );

        // 7. Build the ringbuf + shared atomics.
        let rb = HeapRb::<f32>::new(RING_BUFFER_CAPACITY);
        let (producer, consumer) = rb.split();
        let sample_rate = Arc::new(AtomicU32::new(initial_rate));
        let should_terminate = Arc::new(AtomicBool::new(false));

        let mut ctx = Box::new(IoProcCtx {
            producer,
            sample_rate: sample_rate.clone(),
            consecutive_drops: 0,
            debug_dumps_remaining: 3,
            should_terminate: should_terminate.clone(),
        });

        // 8. Create the aggregate device and install our IO proc.
        let agg_device = AggregateDevice::with_desc(&agg_desc)
            .map_err(|e| anyhow!("Core Audio: create aggregate device ({:?})", e))?;

        let proc_id = agg_device
            .create_io_proc_id(io_proc, Some(&mut *ctx))
            .map_err(|e| anyhow!("Core Audio: install IO proc ({:?})", e))?;

        // 9. Start the device. `device_start` returns a `StartedDevice`
        //    whose Drop tears down the IO proc + stops the device.
        let started = ca::device_start(agg_device, Some(proc_id))
            .map_err(|e| anyhow!("Core Audio: start aggregate device ({:?})", e))?;

        info!("audio-tap: capture started");

        Ok(SystemAudioCapture {
            consumer,
            sample_rate,
            should_terminate,
            _ctx: ctx,
            _started: started,
            _tap: tap,
        })
    }

    /// Drain every f32 sample currently buffered. Non-blocking.
    /// Returns the samples in arrival order. Empty when the ring is
    /// empty (caller polls in a loop with a small sleep — matches
    /// the live-session pattern in `session.rs`).
    pub fn drain(&mut self) -> Vec<f32> {
        let mut out = Vec::with_capacity(4096);
        while let Some(s) = self.consumer.try_pop() {
            out.push(s);
        }
        out
    }

    /// Source sample rate (atomic — safe to call from any thread).
    pub fn source_sample_rate(&self) -> u32 {
        self.sample_rate.load(Ordering::Acquire)
    }

    /// `true` once the IO proc has stopped pushing (overflow trip
    /// OR external `stop()`). Consumer code should treat this as
    /// end-of-stream after draining the last buffered samples.
    pub fn is_terminated(&self) -> bool {
        self.should_terminate.load(Ordering::Acquire)
    }

    /// Signal the IO proc to stop pushing on its next callback.
    /// The actual hardware teardown happens when the
    /// `SystemAudioCapture` is dropped (StartedDevice::drop).
    #[allow(dead_code)]
    pub fn stop(&self) {
        self.should_terminate.store(true, Ordering::Release);
    }
}

impl Drop for SystemAudioCapture {
    fn drop(&mut self) {
        self.should_terminate.store(true, Ordering::Release);
    }
}

// ── IO proc (real-time audio thread) ─────────────────────────────────────────
//
// The kernel calls this every audio cycle (~5-10 ms at 48 kHz).
// Hard constraints:
//   - No allocations.
//   - No locks held across yields.
//   - No panics — a panic here crashes the audio thread, which on
//     macOS = the whole app loses audio until restart.
//
// We push raw f32 samples into the ring buffer and bump a drop
// counter when the ring is full. Resampling, channel mixing, and
// WAV encoding all run on the consumer side.
extern "C" fn io_proc(
    device: Device,
    _now: &cidre::cat::AudioTimeStamp,
    input_data: &AudioBufList<1>,
    _input_time: &cidre::cat::AudioTimeStamp,
    _output_data: &mut AudioBufList<1>,
    _output_time: &cidre::cat::AudioTimeStamp,
    ctx: Option<&mut IoProcCtx>,
) -> os::Status {
    // `ctx` is supplied to `create_io_proc_id`; we lose audio if
    // it's None but we MUST NOT panic. Bail with NO_ERR — the
    // consumer side will notice no samples arriving.
    let Some(ctx) = ctx else {
        return os::Status::NO_ERR;
    };

    // External stop requested — leave the buffer drained, the
    // StartedDevice Drop will detach this proc soon.
    if ctx.should_terminate.load(Ordering::Acquire) {
        return os::Status::NO_ERR;
    }

    // Update sample rate atomically — the speaker can change
    // (headphones plug in) mid-session and we want the resampler
    // on the other side to follow.
    if let Ok(rate) = device.actual_sample_rate() {
        ctx.sample_rate.store(rate as u32, Ordering::Release);
    }

    // Walk ALL input buffers and pick the FIRST non-silent one. The
    // aggregate device that hosts the tap can expose >1 input stream:
    // the speaker's input scope (usually empty / silent) at index 0,
    // the tap's output at index 1. Our previous code read buffers[0]
    // unconditionally — which on macOS Tahoe is the silent stream.
    // Hunting for the loud stream sidesteps the layout question
    // without needing to introspect channel descriptions.
    //
    // The Rust type is `AudioBufList<1>` but the underlying C contract
    // is a flexible array; we walk it via raw pointer arithmetic from
    // `&buffers[0]` for `number_buffers` entries. Pluely uses the
    // AVAudio view to do the same thing more ergonomically — we keep
    // this raw form to avoid pulling AVFoundation into the build for
    // a 10-line walk.
    if input_data.number_buffers == 0 {
        return os::Status::NO_ERR;
    }
    let buf_count = input_data.number_buffers as usize;
    let base = &input_data.buffers[0] as *const cidre::cat::AudioBuf;

    // One-shot layout dump — see ctx field comment. Logging from the
    // IO thread via eprintln is the same pattern Pluely uses for its
    // overflow warning; safe for a 3-call max.
    if ctx.debug_dumps_remaining > 0 {
        let mut summary = String::with_capacity(256);
        summary.push_str("audio-tap io_proc dump: number_buffers=");
        summary.push_str(&buf_count.to_string());
        for i in 0..buf_count {
            let b = unsafe { &*base.add(i) };
            summary.push_str(&format!(
                " | buf[{i}] bytes={} chans={} data_null={}",
                b.data_bytes_size,
                b.number_channels,
                b.data.is_null()
            ));
            if !b.data.is_null() && b.data_bytes_size >= 16 {
                let bytes = unsafe {
                    std::slice::from_raw_parts(b.data as *const u8, 16)
                };
                summary.push_str(" first16=");
                for byte in bytes {
                    summary.push_str(&format!("{:02x}", byte));
                }
            }
        }
        eprintln!("{summary}");
        ctx.debug_dumps_remaining -= 1;
    }

    // Pick the FIRST input buffer whose samples are not all zero.
    // Falls back to buffer[0] if all are silent (matches previous
    // behaviour, lets the consumer-side peak logger surface it).
    let mut chosen: Option<&cidre::cat::AudioBuf> = None;
    for i in 0..buf_count {
        let b = unsafe { &*base.add(i) };
        if b.data.is_null() || b.data_bytes_size == 0 {
            continue;
        }
        let float_count_i = b.data_bytes_size as usize / std::mem::size_of::<f32>();
        let samples_i =
            unsafe { std::slice::from_raw_parts(b.data as *const f32, float_count_i) };
        // Quick non-zero probe: scan up to 32 samples (~0.7 ms at 48
        // kHz) — enough to find real audio without sweeping the whole
        // buffer on the real-time thread.
        let probe_end = float_count_i.min(32);
        let any_nonzero = samples_i[..probe_end].iter().any(|s| s.abs() > 1e-7);
        if any_nonzero {
            chosen = Some(b);
            break;
        }
        if chosen.is_none() {
            chosen = Some(b);
        }
    }

    let Some(buf) = chosen else {
        return os::Status::NO_ERR;
    };
    let byte_count = buf.data_bytes_size as usize;
    if byte_count == 0 || buf.data.is_null() {
        return os::Status::NO_ERR;
    }
    let float_count = byte_count / std::mem::size_of::<f32>();
    let samples =
        unsafe { std::slice::from_raw_parts(buf.data as *const f32, float_count) };

    let pushed = ctx.producer.push_slice(samples);

    if pushed < samples.len() {
        ctx.consecutive_drops = ctx.consecutive_drops.saturating_add(1);
        if ctx.consecutive_drops == 25 {
            // Single-print warning — the IO thread can't reach the
            // tracing dispatcher without risking allocation. eprintln
            // is the same fallback Pluely uses.
            eprintln!(
                "audio-tap: ring buffer experiencing drops (consumer too slow)"
            );
        }
        if ctx.consecutive_drops > 50 {
            eprintln!(
                "audio-tap: critical buffer overflow — terminating capture"
            );
            ctx.should_terminate.store(true, Ordering::Release);
        }
    } else {
        ctx.consecutive_drops = 0;
    }

    os::Status::NO_ERR
}

// ── Public API: single-shot WAV capture ──────────────────────────────────────
//
// Matches the contract of `audio::record_blocking`: capture for at
// most `duration_secs` (early-exit on stop_flag), return a 16 kHz
// mono PCM 16-bit WAV ready to hand to OpenAI Whisper or any other
// consumer that accepts the AssemblyAI v3 wire format.

/// Capture system audio output via Core Audio Tap for `duration_secs`
/// (or until `stop_flag` is set). Returns a WAV buffer in the same
/// format the existing `cpal` loopback path produces — 16 kHz mono
/// PCM 16-bit, so the rest of the pipeline (AssemblyAI streaming)
/// doesn't notice the source change.
///
/// Requires macOS 14.4+. The caller is expected to check the OS
/// version before invoking this — `create_process_tap` returns an
/// `os::Error` on older systems and the error is surfaced verbatim.
pub async fn record_system_audio_wav(
    duration_secs: u32,
    stop_flag: Arc<AtomicBool>,
) -> Result<Vec<u8>> {
    // The Core Audio APIs aren't `Send` between async tasks — the
    // tap + aggregate device live entirely on one thread. We run
    // the whole capture on a blocking thread and bounce the WAV
    // bytes back across the boundary.
    let result = tokio::task::spawn_blocking(move || -> Result<Vec<u8>> {
        record_system_audio_blocking(duration_secs, stop_flag)
    })
    .await
    .context("audio-tap task panicked")?;

    result
}

fn record_system_audio_blocking(
    duration_secs: u32,
    stop_flag: Arc<AtomicBool>,
) -> Result<Vec<u8>> {
    let mut capture = SystemAudioCapture::start()
        .context("audio-tap: failed to start system audio capture")?;
    let source_rate = capture.source_sample_rate();

    let start = Instant::now();
    let target = Duration::from_secs(duration_secs as u64);

    // Pre-allocate for the worst case (target duration at source
    // rate, stereo de-interleaved → in practice the tap is mono).
    let mut raw: Vec<f32> =
        Vec::with_capacity((source_rate as usize) * (duration_secs as usize) + 4096);

    loop {
        if stop_flag.load(Ordering::SeqCst) {
            info!("audio-tap: stopped early by flag");
            break;
        }
        if capture.is_terminated() {
            warn!("audio-tap: capture terminated early (overflow or device change)");
            break;
        }
        if start.elapsed() >= target {
            break;
        }
        let mut chunk = capture.drain();
        if !chunk.is_empty() {
            raw.append(&mut chunk);
        }
        std::thread::sleep(Duration::from_millis(20));
    }
    // Final drain after the loop exits so we don't lose the tail.
    let mut tail = capture.drain();
    if !tail.is_empty() {
        raw.append(&mut tail);
    }
    // Re-read the sample rate one more time — the device might have
    // switched output during capture. The consumer uses the latest
    // value for the resample ratio (best effort; a mid-capture rate
    // change is rare and the worst-case is mild pitch warble).
    let final_rate = capture.source_sample_rate().max(1);

    drop(capture); // Tear down the tap + device explicitly.

    let resampled = resample_to_target(&raw, final_rate, TARGET_SAMPLE_RATE);
    info!(
        "audio-tap: captured {} samples @ {} Hz → {} @ {} Hz",
        raw.len(),
        final_rate,
        resampled.len(),
        TARGET_SAMPLE_RATE,
    );

    encode_wav_16k_mono(&resampled)
}

// ── Helpers (resampling + WAV encoding) ──────────────────────────────────────
//
// Mirrors the same linear-interpolation resampler used by `audio.rs`
// — we keep the implementation here so the audio-tap module is
// self-contained (no cross-module private fn calls). Both copies
// are identical; if the algorithm ever changes, both must be
// updated together.

fn resample_to_target(input: &[f32], input_rate: u32, target_rate: u32) -> Vec<f32> {
    if input_rate == target_rate || input.is_empty() {
        return input.to_vec();
    }
    let ratio = input_rate as f32 / target_rate as f32;
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
        sample_rate: TARGET_SAMPLE_RATE,
        bits_per_sample: 16,
        sample_format: HoundFormat::Int,
    };
    let mut cursor = Cursor::new(Vec::<u8>::new());
    {
        let mut writer = WavWriter::new(&mut cursor, spec)
            .context("audio-tap: WAV writer init")?;
        for s in samples {
            let clamped = s.clamp(-1.0, 1.0);
            let i16_sample = (clamped * i16::MAX as f32) as i16;
            writer
                .write_sample(i16_sample)
                .context("audio-tap: WAV write_sample")?;
        }
        writer.finalize().context("audio-tap: WAV finalize")?;
    }
    Ok(cursor.into_inner())
}

// ── Public API: live streaming capture ───────────────────────────────────────
//
// `session.rs` wants a long-lived f32 buffer it can sample at 100ms
// intervals to feed AssemblyAI. We expose `LiveSystemAudio` which
// runs the capture on a blocking thread and maintains the same
// `Arc<Mutex<Vec<f32>>>` shape the existing cpal-based `LiveDevice`
// produces. That keeps the session.rs surface change minimal — one
// new branch in `open_input` (or its caller), no rewrite of the
// downstream debouncer / WS plumbing.

/// Live-streaming wrapper around `SystemAudioCapture`. Spawns a
/// background drain thread that appends samples to a shared
/// `Arc<Mutex<Vec<f32>>>` until `stop_flag` is set. Matches the
/// shape of the cpal `LiveDevice` so `session::run_session` can
/// swap between them with one branch.
pub struct LiveSystemAudio {
    pub buffer: Arc<Mutex<Vec<f32>>>,
    pub rate: u32,
    _stop_flag: Arc<AtomicBool>,
    _join: Option<std::thread::JoinHandle<()>>,
}

impl LiveSystemAudio {
    /// Start the live capture. `stop_flag` is shared with the rest
    /// of the session — once it flips, the drain thread exits and
    /// the underlying CoreAudio device is torn down.
    pub fn start(stop_flag: Arc<AtomicBool>) -> Result<Self> {
        // Probe the sample rate on the calling thread so the caller
        // gets a meaningful `rate` field before we spawn the drain.
        // We do this by starting + immediately tearing down a
        // throwaway capture — cheap (microseconds) and avoids
        // shipping a half-initialised struct.
        let probe = SystemAudioCapture::start()
            .context("audio-tap (live): probe capture failed")?;
        let rate = probe.source_sample_rate();
        drop(probe);

        let buffer: Arc<Mutex<Vec<f32>>> =
            Arc::new(Mutex::new(Vec::with_capacity((rate as usize) * 30)));
        let buf_clone = buffer.clone();
        let stop_thread = stop_flag.clone();

        let join = std::thread::Builder::new()
            .name("audio-tap-drain".into())
            .spawn(move || {
                // Build the real capture inside the drain thread so
                // the CoreAudio handles live entirely on one OS
                // thread (matches the cpal Stream constraint we
                // already work around in `session.rs`).
                let mut capture = match SystemAudioCapture::start() {
                    Ok(c) => c,
                    Err(e) => {
                        tracing::error!("audio-tap (live): start failed: {e:?}");
                        return;
                    }
                };

                while !stop_thread.load(Ordering::SeqCst) {
                    if capture.is_terminated() {
                        tracing::warn!(
                            "audio-tap (live): capture terminated by IO proc (overflow)"
                        );
                        break;
                    }
                    let chunk = capture.drain();
                    if !chunk.is_empty() {
                        if let Ok(mut b) = buf_clone.lock() {
                            b.extend_from_slice(&chunk);
                        }
                    }
                    std::thread::sleep(Duration::from_millis(20));
                }
                // Final drain so we don't lose the tail (the WS
                // reader in session.rs uses last_idx so anything
                // not yet read will still get flushed if the
                // session keeps the WS open briefly after stop).
                let tail = capture.drain();
                if !tail.is_empty() {
                    if let Ok(mut b) = buf_clone.lock() {
                        b.extend_from_slice(&tail);
                    }
                }
                tracing::info!("audio-tap (live): drain thread exiting");
            })
            .context("audio-tap (live): spawn drain thread")?;

        Ok(LiveSystemAudio {
            buffer,
            rate,
            _stop_flag: stop_flag,
            _join: Some(join),
        })
    }
}

impl Drop for LiveSystemAudio {
    fn drop(&mut self) {
        // The shared `stop_flag` is the session's truth source —
        // we don't flip it ourselves on drop because other tasks
        // (mic, WS sink) still depend on it. The drain thread will
        // exit when the caller flips the flag.
        if let Some(join) = self._join.take() {
            // Don't block the caller's drop — the thread reads
            // `stop_flag` at most every 20ms, so cleanup latency
            // is bounded.
            let _ = join.join();
        }
    }
}
