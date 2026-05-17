//! Speech-to-text helpers.
//!
//! Two paths today:
//!
//!  * **`transcribe_wav`** — Sprint 1.2: HTTP POST to the Career OS
//!    Cloudflare Worker at `/v1/copilot/stt`. The Worker holds the
//!    merchant AssemblyAI key and runs the batch upload + transcript
//!    creation + polling loop. This is the path the live Copilot
//!    session uses (one call per VAD-segmented utterance).
//!
//!  * **`transcribe` / `transcribe_whisper`** — legacy one-shot
//!    capture path used by the BYOK `start_capture` command. Kept
//!    intact for now because that flow is still wired into the
//!    "transcribe a recorded clip" surface. New code should call
//!    `transcribe_wav` instead.
use anyhow::{anyhow, Result};
use reqwest::multipart::{Form, Part};
use serde::Deserialize;

/// Career OS Worker base URL. Same constant as `llm.rs::COPILOT_API_BASE`
/// — hardcoded because dev/prod flips happen Worker-side, not in the
/// desktop binary.
const COPILOT_API_BASE: &str = "https://api.careeros.fr";

/// Output of a successful Worker STT call. Matches the JSON shape
/// returned by `worker/src/routes/copilot.ts → POST /v1/copilot/stt`.
///
/// `language` and `duration_seconds` are not currently consumed in
/// Rust — session.rs forwards only the text to the debouncer + the
/// VAD-measured duration to the frontend event. Both fields stay on
/// the struct because the Worker emits them and a future UI badge
/// ("transcribed FR in 1.2s") may want them without another round
/// of API changes.
#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code)]
pub struct TranscribeResult {
    pub text: String,
    #[serde(default)]
    pub language: String,
    #[serde(default)]
    pub duration_seconds: f32,
}

/// POST a WAV blob to the Worker's `/v1/copilot/stt` endpoint and
/// return the transcribed text + auto-detected language. Reuses the
/// shared 30s reqwest client (PRIV-01 single-egress rule).
///
/// `jwt` is the user's Career OS auth JWT (lives in macOS Keychain;
/// `secrets::get(AuthJwt)`). The Worker rejects unauthenticated calls.
///
/// `language_hint` is forwarded verbatim — pass `"auto"` to let AAI
/// auto-detect (the common case for FR/EN code-switching interviews),
/// or `"fr"` / `"en"` to lock the language.
pub async fn transcribe_wav(
    wav_bytes: Vec<u8>,
    jwt: &str,
    language_hint: Option<&str>,
) -> Result<TranscribeResult> {
    if jwt.is_empty() {
        return Err(anyhow!(
            "JWT empty — sign in to Career OS before starting the Copilot"
        ));
    }
    if wav_bytes.is_empty() {
        return Err(anyhow!("empty WAV — refusing to call STT"));
    }

    let part = Part::bytes(wav_bytes)
        .file_name("utterance.wav")
        .mime_str("audio/wav")?;
    let mut form = Form::new().part("wav", part);
    if let Some(lang) = language_hint {
        if !lang.is_empty() {
            form = form.text("language", lang.to_string());
        }
    }

    // PRIV-01: shared single-egress client (30s tier).
    let resp = crate::cloud::default()
        .post(format!("{COPILOT_API_BASE}/v1/copilot/stt"))
        .header("authorization", format!("Bearer {jwt}"))
        .multipart(form)
        .send()
        .await?;

    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        if status == reqwest::StatusCode::UNAUTHORIZED
            || status == reqwest::StatusCode::FORBIDDEN
        {
            return Err(anyhow!(
                "Session expirée — reconnecte-toi à Career OS."
            ));
        }
        if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
            return Err(anyhow!(
                "Plafond quotidien de transcriptions Copilot atteint."
            ));
        }
        return Err(anyhow!("STT route error {status}: {body}"));
    }

    let result: TranscribeResult = resp.json().await?;
    Ok(result)
}

// ── Legacy one-shot path (BYOK Whisper) ──────────────────────────────

/// Transcribe a WAV buffer using OpenAI Whisper API.
/// Returns the transcribed text. Requires an OpenAI API key.
///
/// Used by the legacy `start_capture` one-shot recorder — NOT by the
/// live Copilot session (that goes through `transcribe_wav`).
pub async fn transcribe_whisper(wav: &[u8], openai_key: &str) -> Result<String> {
    if openai_key.is_empty() {
        return Err(anyhow!("OpenAI key empty"));
    }

    // PRIV-01: shared single-egress client (30s tier).
    let client = crate::cloud::default();

    let part = Part::bytes(wav.to_vec())
        .file_name("audio.wav")
        .mime_str("audio/wav")?;

    // The prompt primes Whisper for interview context and dramatically improves
    // accuracy on short clips (< 3 s). It also helps with FR/EN code-switching.
    let form = Form::new()
        .part("file", part)
        .text("model", "whisper-1")
        .text("response_format", "text")
        .text("prompt", "Job interview question and answer. Finance, strategy, technology. Peut être en français ou en anglais.");

    let resp = client
        .post("https://api.openai.com/v1/audio/transcriptions")
        .bearer_auth(openai_key)
        .multipart(form)
        .send()
        .await?;

    let status = resp.status();
    let body = resp.text().await?;
    if !status.is_success() {
        return Err(anyhow!("Whisper API error {status}: {body}"));
    }
    Ok(body.trim().to_string())
}

/// Convenience wrapper used by lib.rs — accepts a single STT key.
/// Future: dispatch to Deepgram if key starts with "dg_" etc.
pub async fn transcribe(wav: &[u8], key: &str) -> Result<String> {
    transcribe_whisper(wav, key).await
}
