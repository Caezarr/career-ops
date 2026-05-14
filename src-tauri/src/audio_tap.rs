//! Phase 2 — Core Audio Tap loopback (TEMPORARY STUB).
//!
//! The full implementation lives at `audio_tap.rs.full-impl.bak`
//! (≈597 lines, depends on the `cidre` crate). cidre's build script
//! requires the full Xcode toolchain (`xcodebuild`), which isn't
//! installed on this machine yet — the user is downloading Xcode
//! from the App Store while we keep building.
//!
//! Until Xcode lands, this stub exposes the same public surface so
//! the rest of the codebase (session.rs, audio.rs) compiles without
//! the cidre dep. Every entry point returns a friendly error; the
//! session.rs callers already handle that path by falling back to
//! the legacy cpal loopback (BlackHole) or mic-only.
//!
//! Restore steps when Xcode is ready:
//!   1. `xcode-select -p` shows `/Applications/Xcode.app/...`
//!   2. Uncomment `cidre = "0.11"` + `ringbuf = "0.4"` in Cargo.toml
//!   3. `mv src-tauri/src/audio_tap.rs.full-impl.bak src-tauri/src/audio_tap.rs`
//!   4. `cargo check` — must pass clean
//!   5. Delete the .bak

use anyhow::{anyhow, Result};
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};

const PHASE_2_UNAVAILABLE: &str =
    "Core Audio Tap unavailable — Xcode (full) not installed. \
     Install Xcode then restore audio_tap.rs from the .bak file. \
     Falling back to the legacy loopback path.";

/// Single-shot WAV capture (mic + system audio fallback path used by
/// `audio::record_dual_wav`).
#[allow(dead_code)]
pub async fn record_system_audio_wav(
    _duration_secs: u32,
    _stop_flag: Arc<AtomicBool>,
) -> Result<Vec<u8>> {
    Err(anyhow!(PHASE_2_UNAVAILABLE))
}

/// Long-lived live-session capture (consumed by `session.rs`).
/// Same public shape as the cpal `LiveDevice` so the WS reader is
/// agnostic to the source. The stub stores nothing — its constructor
/// errors out before the buffer is ever touched.
#[allow(dead_code)]
pub struct LiveSystemAudio {
    pub buffer: Arc<Mutex<Vec<f32>>>,
    pub rate: u32,
}

impl LiveSystemAudio {
    pub fn start(_stop_flag: Arc<AtomicBool>) -> Result<Self> {
        Err(anyhow!(PHASE_2_UNAVAILABLE))
    }
}
