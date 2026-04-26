mod audio;
mod llm;
mod pdf;
mod state;
mod stt;

use serde::Deserialize;
use state::AppState;
use std::sync::Arc;
use tauri::{Emitter, Manager, State};
use tokio::sync::Mutex;
use tracing::info;

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CaptureConfig {
    pub anthropic_key: String,
    #[serde(default)]
    pub openai_key: String,
    pub cv: String,
    pub jd: String,
    pub persona: String,
    #[serde(default = "default_duration")]
    pub duration_secs: u32,
    /// Empty = system default. Set to e.g. "BlackHole 2ch" to capture system audio loopback.
    #[serde(default)]
    pub audio_device: String,
}

fn default_duration() -> u32 {
    6
}

#[tauri::command]
async fn start_capture(
    app: tauri::AppHandle,
    state: State<'_, Arc<Mutex<AppState>>>,
    config: CaptureConfig,
) -> Result<(), String> {
    let state = state.inner().clone();

    // Spawn the pipeline in the background so the command returns fast
    tokio::spawn(async move {
        if let Err(e) = run_pipeline(app.clone(), state, config).await {
            let _ = app.emit("error", e.to_string());
            let _ = app.emit("status", "error");
        }
    });

    Ok(())
}

#[tauri::command]
async fn stop_capture(state: State<'_, Arc<Mutex<AppState>>>) -> Result<(), String> {
    let mut s = state.lock().await;
    if let Some(stop) = s.stop_signal.take() {
        let _ = stop.send(());
    }
    Ok(())
}

/// Decode a base64-encoded PDF and extract its text content.
/// Used by the Config panel to load a CV PDF.
#[tauri::command]
async fn parse_cv_pdf(b64: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || pdf::extract_text_from_base64(&b64))
        .await
        .map_err(|e| format!("task join error: {e}"))?
        .map_err(|e| e.to_string())
}

/// List the names of all available audio input devices.
#[tauri::command]
async fn list_audio_devices() -> Result<Vec<String>, String> {
    tokio::task::spawn_blocking(audio::list_input_devices)
        .await
        .map_err(|e| format!("task join error: {e}"))
}

async fn run_pipeline(
    app: tauri::AppHandle,
    state: Arc<Mutex<AppState>>,
    config: CaptureConfig,
) -> anyhow::Result<()> {
    let (stop_tx, stop_rx) = tokio::sync::oneshot::channel();
    {
        let mut s = state.lock().await;
        s.stop_signal = Some(stop_tx);
    }

    // Stage 1: capture mic to wav buffer
    app.emit("status", "recording")?;
    info!(
        "starting capture for {}s on device '{}'",
        config.duration_secs,
        if config.audio_device.is_empty() { "(default)" } else { &config.audio_device }
    );
    let wav_bytes = audio::record_mic_wav(
        config.duration_secs,
        config.audio_device.clone(),
        stop_rx,
    )
    .await?;
    info!("captured {} bytes of wav audio", wav_bytes.len());

    // Stage 2: transcribe via OpenAI Whisper API (free-ish; no Deepgram key required for MVP)
    // Falls back to no-transcript if STT fails.
    app.emit("status", "thinking")?;
    let transcript = match stt::transcribe(&wav_bytes, &config.openai_key).await {
        Ok(t) => {
            app.emit("transcript", &t)?;
            t
        }
        Err(e) => {
            tracing::warn!("transcription failed: {e:?}");
            let placeholder = "[transcription unavailable — generating generic bullets]".to_string();
            app.emit("transcript", &placeholder)?;
            placeholder
        }
    };

    // Stage 3: generate bullets via Claude
    let bullets = llm::generate_bullets(&config, &transcript).await?;
    app.emit("bullets", &bullets)?;
    app.emit("status", "ready")?;

    {
        let mut s = state.lock().await;
        s.stop_signal = None;
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,interview_copilot_lib=debug".into()),
        )
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let state = Arc::new(Mutex::new(AppState::default()));
            app.manage(state);

            // Best-effort stealth on macOS: window-level capture exclusion.
            // On macOS 15+ this is ignored by ScreenCaptureKit but we still set it.
            #[cfg(target_os = "macos")]
            {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_content_protected(true);
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_capture,
            stop_capture,
            parse_cv_pdf,
            list_audio_devices
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
