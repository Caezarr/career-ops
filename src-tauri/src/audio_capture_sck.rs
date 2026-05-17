//! macOS ScreenCaptureKit (SCK) loopback capture — Tahoe 26 path.
//!
//! ## Why this module exists alongside `audio_tap.rs`
//!
//! macOS 26 ("Tahoe") regressed the Core Audio Tap that `audio_tap.rs`
//! drives: the kernel installs the tap, the IO proc fires on schedule,
//! but every buffer arrives as all zeros. See Apple Developer Forums
//! thread 825780 — Apple has acknowledged the regression but not yet
//! shipped a fix. Our IO-proc layout dump confirms it locally
//! (`number_buffers=1, buf[0] bytes=2048, first16=00...00`).
//!
//! ScreenCaptureKit's audio capture path is independent of the tap.
//! It pulls audio frames straight from the window-server compositor's
//! audio engine, which keeps working on Tahoe. We use it the same way
//! Apple's "Capturing screen content in macOS" sample does — request
//! a tiny 2×2 video config (SCK refuses an audio-only stream) and
//! discard the video output.
//!
//! ## Contract
//!
//! [`LiveSystemAudioSck::start`] returns a struct shaped like
//! `audio_tap::LiveSystemAudio`:
//!
//! ```ignore
//! pub buffer: Arc<Mutex<Vec<f32>>>,
//! pub rate: u32,
//! ```
//!
//! …so `session::run_session` can swap between SCK and the legacy tap
//! through a thin holder enum without touching the WS reader. The
//! buffer is appended in arrival order, mono, native sample rate
//! (we ask SCK for 48 kHz to match the tap; the downstream resampler
//! to 16 kHz lives in `session.rs`).
//!
//! ## Threading model
//!
//! The SCK delegate's `stream_did_output_sample_buf` callback runs on
//! the dispatch queue we hand to `add_stream_output`. We do the
//! AudioBufferList walk on that queue and push the f32 samples into
//! the shared `Arc<Mutex<Vec<f32>>>`. A separate std::thread holds the
//! `Stream` / `OutputObj` / runtime alive and watches `stop_flag` so
//! we can call `Stream::stop()` from a tokio context when the session
//! ends. Mirrors the spawn pattern in `audio_tap.rs::LiveSystemAudio`.
//!
//! ## Permission
//!
//! SCK uses the same TCC bucket as Screen Recording — granting
//! "Screen & System Audio Recording" in System Settings → Privacy &
//! Security is sufficient. `NSScreenCaptureUsageDescription` is
//! already in our Info.plist (driven by the Tauri config). The first
//! call to `Stream::start` on a fresh install will prompt the user.

// `define_obj_type!` (from cidre) expands to `mem::transmute(&self…)` to
// reach the synthesized Obj-C inner-payload accessor — clippy flags
// that as `useless_transmute`, but the macro isn't ours to change.
// Suppress at the file level.
#![allow(clippy::useless_transmute)]

use anyhow::{anyhow, Context, Result};
use cidre::{
    cat, cm, define_obj_type, dispatch, ns, objc, sc,
    sc::stream::{Output, OutputImpl},
};
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tracing::{info, warn};

// ── Tunable constants ─────────────────────────────────────────────────────────

/// Sample rate we ask SCK for. Matches the Core Audio Tap path so the
/// downstream resampler in `session.rs` doesn't need to know which
/// source it's reading from.
const TARGET_SAMPLE_RATE: u32 = 48_000;

/// Tiny video frame size. SCK requires a video config even when we
/// only care about audio; 2×2 BGRA at 1 FPS is the smallest the API
/// reliably accepts. We register no Screen output handler, so the
/// frames are produced and dropped on the floor.
const DUMMY_VIDEO_W: usize = 2;
const DUMMY_VIDEO_H: usize = 2;

// ── Shared producer/consumer state ────────────────────────────────────────────
//
// The dispatch callback is `&mut self` on the Objective-C side, but
// the inner state needs to outlive the callback's borrow window (the
// drain-side reader and the stop watcher are both on other threads).
// We wrap everything the callback touches in an `Arc<SckCallbackCtx>`
// — appending to the shared `Vec<f32>` is the only mutation, and the
// `Mutex` already serialises that.
struct SckCallbackCtx {
    buffer: Arc<Mutex<Vec<f32>>>,
    /// Latest observed source sample rate. SCK respects our request
    /// in practice, but the framework reserves the right to deliver
    /// at the system's native rate — we track what actually arrives.
    sample_rate: Arc<AtomicU32>,
    /// Once tripped, the callback short-circuits without locking the
    /// buffer. The watcher thread sets this after `Stream::stop`.
    stopped: Arc<AtomicBool>,
    /// One-shot diagnostic counter: log details about the first N
    /// callbacks so we can confirm SCK is actually delivering frames.
    /// Counts up; we log while < 10.
    debug_calls: Arc<AtomicU32>,
}

// ── Delegate object that owns the callback context ────────────────────────────
//
// `define_obj_type!` registers a synthetic Objective-C class whose
// inner Rust payload is an `Arc<SckCallbackCtx>`. The `#[objc::protocol]`
// macro on `sc::stream::Output` generates the `OutputImpl` trait we
// implement here — the actual selector dispatch goes through the
// auto-generated thunks.

define_obj_type!(
    SckAudioOutput + OutputImpl,
    Arc<SckCallbackCtx>,
    SCK_AUDIO_OUTPUT_CLS
);

impl Output for SckAudioOutput {}

#[objc::add_methods]
impl OutputImpl for SckAudioOutput {
    extern "C" fn impl_stream_did_output_sample_buf(
        &mut self,
        _cmd: Option<&objc::Sel>,
        _stream: &sc::Stream,
        sample_buf: &mut cm::SampleBuf,
        kind: sc::stream::OutputType,
    ) {
        // One-shot diagnostic — log the first 10 callbacks of EACH
        // kind so we can confirm SCK is actually firing the audio
        // path. Field-tested on Tahoe: SCK can start cleanly and then
        // silently emit only Screen frames if the audio engine couldn't
        // attach, in which case we'd see only OutputType::Screen here.
        {
            let n = self.inner().debug_calls.fetch_add(1, Ordering::Relaxed);
            if n < 10 {
                let valid = sample_buf.is_valid();
                let asbd = sample_buf
                    .format_desc()
                    .and_then(|fd| fd.stream_basic_desc().copied())
                    .unwrap_or_default();
                tracing::debug!(
                    "audio-sck callback #{n}: kind={:?} valid={valid} \
                     rate={} chans={} fmt_flags={:?} bits_per_chan={}",
                    kind,
                    asbd.sample_rate,
                    asbd.channels_per_frame,
                    asbd.format_flags,
                    asbd.bits_per_channel,
                );
            }
        }
        // Only audio frames feed the buffer. We still register the
        // class for the Screen output type so SCK keeps the stream
        // alive (it'll fire those callbacks and we ignore them).
        if !matches!(kind, sc::stream::OutputType::Audio) {
            return;
        }

        // Promote the inner-borrowed `&Arc` into an owned, '_static
        // strong reference. Without `Arc::clone` the compiler models
        // `ctx` as carrying the `&self` borrow, which then leaks into
        // every MutexGuard lifetime down-callsite.
        let ctx: Arc<SckCallbackCtx> = Arc::clone(self.inner());
        if ctx.stopped.load(Ordering::Acquire) {
            return;
        }
        if !sample_buf.is_valid() {
            return;
        }

        // Refresh the perceived sample rate. SCK can switch under us
        // if the user changes outputs mid-session; the downstream
        // resampler reads this atomically each chunk.
        if let Some(fd) = sample_buf.format_desc() {
            if let Some(asbd) = fd.stream_basic_desc() {
                if asbd.sample_rate > 0.0 {
                    ctx.sample_rate
                        .store(asbd.sample_rate as u32, Ordering::Release);
                }
            }
        }

        // Read the format descriptor — needed to know how to interpret
        // the raw PCM bytes from the block buffer.
        let asbd: cat::audio::StreamBasicDesc = sample_buf
            .format_desc()
            .and_then(|fd| fd.stream_basic_desc().copied())
            .unwrap_or_default();
        let is_float = asbd.format_flags.contains(cat::audio::FormatFlags::IS_FLOAT)
            || asbd.bits_per_channel == 32;
        let channels = asbd.channels_per_frame.max(1) as usize;
        let interleaved = asbd.is_interleaved();

        // 2026-05-16 Tahoe fix: `sample_buf.audio_buf_list::<N>()` fails
        // with OSStatus -12737 (`kCMSampleBufferError_RequiredParameterMissing`)
        // on EVERY SCK audio callback on Tahoe 26 — even though the
        // sample buffer is valid and the format descriptor reads
        // correctly. We bypass that wrapper entirely and read the raw
        // PCM bytes from the underlying CMBlockBuffer via
        // `sample_buf.data_buf()` → `BlockBuf::as_slice()`. SCK delivers
        // a contiguous block-buffer regardless of the channel layout,
        // so this works for both interleaved and planar formats — for
        // planar mono (our request) the block buffer IS the mono PCM
        // stream.
        let data_buf = match sample_buf.data_buf() {
            Some(d) => d,
            None => {
                let n = self.inner().debug_calls.load(Ordering::Relaxed);
                if n <= 12 {
                    tracing::warn!("audio-sck cb #{n}: no data_buf on sample buffer");
                }
                return;
            }
        };
        let raw_slice = match data_buf.as_slice() {
            Ok(s) => s,
            Err(e) => {
                let n = self.inner().debug_calls.load(Ordering::Relaxed);
                if n <= 12 {
                    tracing::warn!(
                        "audio-sck cb #{n}: data_buf.as_slice failed: {e:?}"
                    );
                }
                return;
            }
        };

        {
            let dbg = self.inner().debug_calls.load(Ordering::Relaxed);
            if dbg <= 12 {
                tracing::debug!(
                    "audio-sck cb #{dbg} block: bytes={} chans={} interleaved={} is_float={}",
                    raw_slice.len(),
                    channels,
                    interleaved,
                    is_float
                );
            }
        }

        // Walk the raw bytes as f32 or i16, downmix to mono.
        let mut mono = Vec::<f32>::with_capacity(raw_slice.len() / 4);
        if is_float {
            let nfloats = raw_slice.len() / std::mem::size_of::<f32>();
            let samples = unsafe {
                std::slice::from_raw_parts(raw_slice.as_ptr() as *const f32, nfloats)
            };
            if channels <= 1 || !interleaved {
                // Single channel OR planar — the requested config is mono
                // so for planar layout the block buffer holds the single
                // plane verbatim. Multi-channel planar is unreachable
                // given our set_channel_count(1) ask, but we'd still
                // produce sensible (channel-0-only) output if SCK
                // delivers more.
                mono.extend_from_slice(samples);
            } else {
                // Interleaved multi-channel — average across each frame.
                let inv = 1.0f32 / channels as f32;
                for frame in samples.chunks_exact(channels) {
                    let sum: f32 = frame.iter().sum();
                    mono.push(sum * inv);
                }
            }
        } else {
            // i16 fallback path — rare from SCK on Tahoe but supported
            // for completeness.
            let nshorts = raw_slice.len() / std::mem::size_of::<i16>();
            let samples = unsafe {
                std::slice::from_raw_parts(raw_slice.as_ptr() as *const i16, nshorts)
            };
            let scale = 1.0f32 / i16::MAX as f32;
            if channels <= 1 || !interleaved {
                mono.extend(samples.iter().map(|s| *s as f32 * scale));
            } else {
                let inv = scale / channels as f32;
                for frame in samples.chunks_exact(channels) {
                    let sum: i32 = frame.iter().map(|s| *s as i32).sum();
                    mono.push(sum as f32 * inv);
                }
            }
        }

        {
            let dbg = self.inner().debug_calls.load(Ordering::Relaxed);
            if dbg <= 12 {
                tracing::debug!(
                    "audio-sck cb #{dbg} extract: mono_len={}",
                    mono.len()
                );
            }
        }
        if mono.is_empty() {
            return;
        }
        // The lock call MUST be a statement (not a tail expression)
        // so the MutexGuard temporary it produces drops at the
        // statement boundary, before `ctx`. We follow it with an
        // explicit `return ();` so the Result temporary from
        // `lock()` cannot become the function's tail value — that
        // would extend its scope across the local Drop order and
        // re-introduce the E0597 false-positive about `ctx`. The
        // trailing `;` (no explicit `return`) keeps the function's
        // tail as `()` — clippy's needless_return lint is satisfied
        // and the semantic is unchanged.
        let _ = ctx.buffer.lock().map(|mut b| b.extend_from_slice(&mono));
    }
}

// ── Public handle ─────────────────────────────────────────────────────────────

/// Live ScreenCaptureKit audio capture. Field shape matches
/// `audio_tap::LiveSystemAudio` so the session glue can hold either
/// behind a small enum without touching the downstream WS reader.
pub struct LiveSystemAudioSck {
    pub buffer: Arc<Mutex<Vec<f32>>>,
    pub rate: u32,
    /// Watcher thread that owns the SCK Stream + delegate object and
    /// calls `Stream::stop` when `stop_flag` flips. Joined on Drop.
    _watcher: Option<std::thread::JoinHandle<()>>,
    /// Shared stop signal. We don't own it (the caller does); we keep
    /// a clone so Drop can flip it if the caller forgot.
    _stop_flag: Arc<AtomicBool>,
}

impl LiveSystemAudioSck {
    /// Start an SCK audio-capture session. Returns once the stream is
    /// running and the first delegate object is wired up — any error
    /// surfaces here, not async later.
    ///
    /// Caller MUST share `stop_flag` with the rest of the session.
    /// When the flag flips, the watcher thread stops the SCK stream
    /// and drops everything cleanly.
    pub fn start(stop_flag: Arc<AtomicBool>) -> Result<Self> {
        let buffer: Arc<Mutex<Vec<f32>>> =
            Arc::new(Mutex::new(Vec::with_capacity((TARGET_SAMPLE_RATE as usize) * 30)));
        let sample_rate = Arc::new(AtomicU32::new(TARGET_SAMPLE_RATE));
        let stopped = Arc::new(AtomicBool::new(false));

        let ctx = Arc::new(SckCallbackCtx {
            buffer: buffer.clone(),
            sample_rate: sample_rate.clone(),
            stopped: stopped.clone(),
            debug_calls: Arc::new(AtomicU32::new(0)),
        });

        // SCK's async APIs (`ShareableContent::current`, `Stream::start`)
        // return futures that must be polled on a runtime. We build a
        // small current-thread tokio runtime owned by the watcher
        // thread — it's the same pattern the cidre tests use, and it
        // keeps the SCK object graph isolated from the session's
        // multi-threaded runtime.
        let buffer_ret = buffer.clone();
        let rate_ret = sample_rate.clone();
        let stop_for_watcher = stop_flag.clone();

        // Channel for the watcher thread to report back its startup
        // outcome (success → unit, error → string). We block on this
        // synchronously so `start()` can surface failures before the
        // caller wires the buffer into the session.
        let (ready_tx, ready_rx) = std::sync::mpsc::channel::<Result<(), String>>();

        let watcher = std::thread::Builder::new()
            .name("sck-audio-watcher".into())
            .spawn(move || {
                let rt = match tokio::runtime::Builder::new_current_thread()
                    .enable_all()
                    .build()
                {
                    Ok(rt) => rt,
                    Err(e) => {
                        let _ = ready_tx.send(Err(format!(
                            "sck: build local tokio runtime: {e}"
                        )));
                        return;
                    }
                };

                rt.block_on(async move {
                    // 1. Enumerate shareable content. This is the
                    //    permission-prompt trigger on first use —
                    //    if the user hasn't granted "Screen & System
                    //    Audio Recording" yet, this call hangs the
                    //    OS dialog and returns once they decide.
                    let content = match sc::ShareableContent::current().await {
                        Ok(c) => c,
                        Err(e) => {
                            let _ = ready_tx.send(Err(format!(
                                "sck: ShareableContent::current failed ({e:?}) — grant 'Screen & System Audio Recording' in System Settings → Privacy & Security"
                            )));
                            return;
                        }
                    };
                    let displays = content.displays();
                    if displays.is_empty() {
                        let _ = ready_tx.send(Err(
                            "sck: no displays available — headless macOS not supported".into()
                        ));
                        return;
                    }
                    // `ns::Array::get(0)` returns Result on cidre 0.11
                    // (it bridges through the NSException trampoline);
                    // we already gated on `is_empty()` so this can't
                    // fault in practice.
                    let display = match displays.get(0) {
                        Ok(d) => d,
                        Err(e) => {
                            let _ = ready_tx.send(Err(format!(
                                "sck: read display[0] failed ({e:?})"
                            )));
                            return;
                        }
                    };

                    // 2. Content filter: the whole main display,
                    //    excluding no windows. We capture audio from
                    //    the entire system mix; the video we ask for
                    //    is just a 2×2 stub we throw away.
                    let empty_windows = ns::Array::new();
                    let filter = sc::ContentFilter::with_display_excluding_windows(
                        &display,
                        &empty_windows,
                    );

                    // 3. Stream config: audio on, mono, 48 kHz, exclude
                    //    our own process so the LLM-TTS playback in
                    //    Career OS doesn't loop back into the
                    //    interviewer transcript.
                    //
                    // 2026-05-16 diagnostic: the previous build set
                    // `minimum_frame_interval = cm::Time::new(1, 1)`
                    // (= 1 fps) which on Tahoe appeared to throttle
                    // ALL output including the audio path, producing
                    // zero delegate callbacks of any kind. Bumped to
                    // 30 fps (1/30 timescale) — the cidre reference
                    // test uses 1/60 — so SCK has a sensible frame
                    // budget even though we discard the video frames.
                    let mut cfg = sc::StreamCfg::new();
                    cfg.set_width(DUMMY_VIDEO_W);
                    cfg.set_height(DUMMY_VIDEO_H);
                    cfg.set_minimum_frame_interval(cm::Time::new(1, 30));
                    cfg.set_pixel_format(cidre::cv::PixelFormat::_32_BGRA);
                    cfg.set_shows_cursor(false);
                    cfg.set_captures_audio(true);
                    cfg.set_sample_rate(TARGET_SAMPLE_RATE as i64);
                    cfg.set_channel_count(1);
                    cfg.set_excludes_current_process_audio(true);

                    // 4. Stream + audio output handler.
                    //
                    // 2026-05-16 diagnostic: the previous build also
                    // registered the same delegate object for Screen
                    // output (on the theory that SCK refuses an
                    // audio-only output set). Apple's docs say multiple
                    // type registrations on one delegate are allowed,
                    // but in practice this build never received ANY
                    // callbacks — possibly the second registration
                    // overrode the first. We now register the audio
                    // output only. SCK will still produce video frames
                    // (we asked for video in cfg) but the framework
                    // discards them server-side when no Screen output
                    // is bound — confirmed by repeated tests with
                    // Apple's SCAudioStreamCapture sample.
                    let stream = sc::Stream::new(&filter, &cfg);
                    let output = SckAudioOutput::with(ctx.clone());
                    let queue = dispatch::Queue::serial_with_ar_pool();
                    if let Err(e) = stream.add_stream_output(
                        output.as_ref(),
                        sc::stream::OutputType::Audio,
                        Some(&queue),
                    ) {
                        let _ = ready_tx.send(Err(format!(
                            "sck: add_stream_output(audio) failed ({e:?})"
                        )));
                        return;
                    }
                    tracing::info!(
                        "audio-sck: audio output registered on queue, starting stream"
                    );

                    // 5. Start. The future resolves once SCK has the
                    //    stream rolling on its internal queues.
                    if let Err(e) = stream.start().await {
                        let _ = ready_tx.send(Err(format!(
                            "sck: Stream::start failed ({e:?}) — \
                             grant 'Screen & System Audio Recording' in \
                             System Settings → Privacy & Security and retry"
                        )));
                        return;
                    }

                    // Signal start-up success to the caller. After
                    // this point any further error is surfaced via
                    // tracing only — the watcher keeps the pipeline
                    // alive until stop_flag flips.
                    let _ = ready_tx.send(Ok(()));
                    info!("audio-sck: stream started at {} Hz mono", TARGET_SAMPLE_RATE);

                    // 6. Wait for the stop signal. We poll a regular
                    //    AtomicBool rather than tying into a watch
                    //    channel — keeps the SCK module independent
                    //    of session.rs internals.
                    while !stop_for_watcher.load(Ordering::Acquire) {
                        tokio::time::sleep(Duration::from_millis(50)).await;
                    }

                    // 7. Stop the stream cleanly. Errors here are
                    //    informational — the runtime is about to be
                    //    dropped anyway, which triggers Obj-C dealloc
                    //    on the stream + output objects.
                    stopped.store(true, Ordering::Release);
                    if let Err(e) = stream.stop().await {
                        warn!("audio-sck: Stream::stop returned {e:?} (continuing)");
                    } else {
                        info!("audio-sck: stream stopped cleanly");
                    }
                    // `stream` and `output` drop here; their Obj-C
                    // dealloc happens via the autorelease pool the
                    // dispatch queue is attached to.
                    drop(stream);
                    drop(output);
                    drop(queue);
                });
            })
            .context("sck: spawn watcher thread")?;

        // Block until the watcher reports ready / error. The runtime
        // setup + ShareableContent::current call together complete in
        // well under a second on Tahoe; if the user has to grant
        // permission, the dialog will hold this until they answer.
        match ready_rx.recv() {
            Ok(Ok(())) => {}
            Ok(Err(msg)) => return Err(anyhow!(msg)),
            Err(e) => return Err(anyhow!("sck: watcher startup channel dropped: {e}")),
        }

        Ok(LiveSystemAudioSck {
            buffer: buffer_ret,
            // Use the rate the callback actually observed if it's been
            // updated; otherwise fall back to our requested rate.
            rate: {
                let observed = rate_ret.load(Ordering::Acquire);
                if observed == 0 {
                    TARGET_SAMPLE_RATE
                } else {
                    observed
                }
            },
            _watcher: Some(watcher),
            _stop_flag: stop_flag,
        })
    }
}

impl Drop for LiveSystemAudioSck {
    fn drop(&mut self) {
        // The caller is the source of truth for `stop_flag`. We don't
        // flip it ourselves — other tasks (mic, WS sink) still depend
        // on it. The watcher already exits when the flag flips, and
        // its join is best-effort here.
        if let Some(join) = self._watcher.take() {
            let _ = join.join();
        }
    }
}
