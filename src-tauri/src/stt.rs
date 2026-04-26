use anyhow::{anyhow, Result};
use reqwest::multipart::{Form, Part};

/// Transcribe a WAV buffer using OpenAI Whisper API.
/// Returns the transcribed text. Requires an OpenAI API key.
pub async fn transcribe_whisper(wav: &[u8], openai_key: &str) -> Result<String> {
    if openai_key.is_empty() {
        return Err(anyhow!("OpenAI key empty"));
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()?;

    let part = Part::bytes(wav.to_vec())
        .file_name("audio.wav")
        .mime_str("audio/wav")?;

    let form = Form::new()
        .part("file", part)
        .text("model", "whisper-1")
        .text("response_format", "text");

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
