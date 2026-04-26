mod audio;
mod llm;
mod pdf;
mod session;
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
    /// User's mic. Empty = system default input.
    #[serde(default)]
    pub audio_device: String,
    /// Loopback (recruiter audio). Empty = don't capture loopback.
    /// Typically "BlackHole 2ch" on Mac after BlackHole + Multi-Output Device setup.
    #[serde(default)]
    pub loopback_device: String,
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

/// Start a continuous session: listen indefinitely, auto-fire bullets when the
/// recruiter pauses after speaking. Replaces the manual hotkey for live interviews.
#[tauri::command]
async fn start_session(
    app: tauri::AppHandle,
    state: State<'_, Arc<Mutex<AppState>>>,
    config: CaptureConfig,
) -> Result<(), String> {
    let (stop_tx, stop_rx) = tokio::sync::oneshot::channel();
    {
        let mut s = state.lock().await;
        // If a session is already running, stop it first.
        if let Some(existing) = s.stop_signal.take() {
            let _ = existing.send(());
        }
        s.stop_signal = Some(stop_tx);
    }

    session::run_session(app, config, stop_rx)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn stop_session(state: State<'_, Arc<Mutex<AppState>>>) -> Result<(), String> {
    let mut s = state.lock().await;
    if let Some(stop) = s.stop_signal.take() {
        let _ = stop.send(());
    }
    Ok(())
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

    // Stage 1: dual capture (mic = user, loopback = recruiter)
    app.emit("status", "recording")?;
    info!(
        "dual capture for {}s — mic='{}', loopback='{}'",
        config.duration_secs,
        if config.audio_device.is_empty() { "(default)" } else { &config.audio_device },
        if config.loopback_device.is_empty() { "(off)" } else { &config.loopback_device },
    );
    let captures = audio::record_dual_wav(
        config.duration_secs,
        config.audio_device.clone(),
        config.loopback_device.clone(),
        stop_rx,
    )
    .await?;
    info!("captured {} channels", captures.len());

    // Stage 2: transcribe each channel in parallel via Whisper
    app.emit("status", "thinking")?;
    let mut transcribe_futs = Vec::new();
    for cap in &captures {
        let key = config.openai_key.clone();
        let wav = cap.wav.clone();
        let label = cap.channel.label();
        transcribe_futs.push(async move {
            let res = stt::transcribe(&wav, &key).await;
            (label, res)
        });
    }
    let results = futures_util::future::join_all(transcribe_futs).await;

    // Stage 2b: build a labeled transcript ("recruiter: ..." / "user: ...")
    // The recruiter channel is what the LLM actually answers, but we keep both for context.
    let mut labeled = String::new();
    let mut recruiter_text = String::new();
    let mut user_text = String::new();
    for (label, res) in results {
        match res {
            Ok(t) => {
                let trimmed = t.trim();
                if trimmed.is_empty() {
                    continue;
                }
                labeled.push_str(label);
                labeled.push_str(": ");
                labeled.push_str(trimmed);
                labeled.push('\n');
                if label == "recruiter" {
                    recruiter_text = trimmed.to_string();
                } else {
                    user_text = trimmed.to_string();
                }
            }
            Err(e) => {
                tracing::warn!("[{}] transcription failed: {e:?}", label);
            }
        }
    }
    if labeled.is_empty() {
        labeled = "[no transcription — generating generic bullets]".to_string();
    }
    app.emit("transcript", &labeled)?;

    // The "question" passed to the LLM: prefer recruiter audio when present,
    // otherwise fall back to whatever we got from the mic.
    let question = if !recruiter_text.is_empty() {
        recruiter_text
    } else if !user_text.is_empty() {
        user_text
    } else {
        labeled.clone()
    };

    // Stage 3: generate bullets via Claude
    let bullets = llm::generate_bullets(&config, &question).await?;
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
            list_audio_devices,
            start_session,
            stop_session
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
