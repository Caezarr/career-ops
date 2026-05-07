use anyhow::{anyhow, Result};
use reqwest::multipart::{Form, Part};

/// Transcribe a WAV buffer using OpenAI Whisper API.
/// Returns the transcribed text. Requires an OpenAI API key.
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
