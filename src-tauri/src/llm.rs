use crate::CaptureConfig;
use anyhow::{anyhow, Result};
use futures_util::StreamExt;
use serde_json::json;
use tauri::{AppHandle, Emitter};

/// One Q&A turn kept in memory so Claude knows what was already covered.
#[derive(Debug, Clone)]
pub struct HistoryEntry {
    pub question:    String,
    pub answer_text: String,
}

// ── Q&A system prompt ─────────────────────────────────────────────────────────

const QA_SYSTEM_PROMPT: &str = "\
You are a real-time interview coach. The candidate is in a LIVE interview RIGHT NOW.

Write a spoken answer. RULES — no exceptions:
1. Pyramid first: conclusion in sentence 1. Never build up to it.
2. 3-5 sentences, ≤ 80 words. NO lists, NO headers, NO bullet points.
3. Achievement / behavioral questions → STAR compressed:
   Situation+Action in one sentence → quantified Result in one sentence (real number from CV).
4. Strength / fit questions → pick ONE MECE angle. Do not scatter across multiple themes.
5. Every number and name comes from the CV. Zero fabrication.
6. Last sentence = insight only the top 1 % of candidates would say. Make it memorable.
7. Match language exactly: FR question → FR answer, EN question → EN answer.

Output ONLY the spoken answer text. No preamble, no commentary.";

// ── Pitch system prompt ───────────────────────────────────────────────────────

const PITCH_SYSTEM_PROMPT: &str = "\
You are a world-class interview coach. Deliver a spoken self-presentation for the candidate RIGHT NOW.

STRUCTURE — Minto Pyramid (conclusion first, evidence after):
[0:00-0:20] HOOK — One sentence. Identity + unique value. Memorable.
[0:20-1:00] PILLAR 1 — Strongest achievement. STAR condensed: context + action in one breath, then quantified result.
[1:00-2:00] PILLAR 2 — Second achievement, MECE with P1 (different dimension, zero overlap).
[2:00-2:30] PILLAR 3 — Third point only if it adds genuine MECE value; otherwise omit.
[2:30-3:00] CLOSE — Why this role, why now. One insight only the top 1 % of candidates say.

RULES — no exceptions:
1. Spoken word only. No markdown, no lists, no headers in the output.
2. Every number comes from the CV. Never fabricate.
3. Pillars must be MECE — cover distinct dimensions (e.g. execution / leadership / vision).
4. Target ≈ 420 words (3 min at natural speaking pace).
5. Show timing markers [X:XX-X:XX] inline so the candidate can track pace.
6. Match language: FR instructions → FR answer, EN → EN.

Output ONLY the spoken text with inline timing markers. No preamble.";

// ── Persona context injected into every prompt ───────────────────────────────

fn persona_hint(persona: &str) -> &'static str {
    match persona {
        "finance"    => "Finance / PE / IB. Vocabulary: deal multiples, IRR, capital structure, valuation bridge. Show judgment — not just model-building.",
        "tech-ai"    => "Tech / AI. Vocabulary: system tradeoffs, eval metrics, latency, prod failure modes. Show real hands-on experience.",
        "consulting" => "Strategy / Consulting. Vocabulary: hypothesis-first, MECE, commercial instinct, so-what. Show structured reasoning.",
        _            => "",
    }
}

// ── SSE types ─────────────────────────────────────────────────────────────────

#[derive(serde::Deserialize)]
struct SseEvent {
    #[serde(rename = "type")]
    event_type: String,
    #[serde(default)]
    delta: Option<SseDelta>,
}

#[derive(serde::Deserialize)]
struct SseDelta {
    #[serde(rename = "type")]
    delta_type: String,
    #[serde(default)]
    text: String,
}

// ── Shared streaming core ─────────────────────────────────────────────────────

async fn stream_claude(
    config:     &CaptureConfig,
    system:     &str,
    messages:   Vec<serde_json::Value>,
    max_tokens: u32,
    app:        &AppHandle,
) -> Result<String> {
    if config.anthropic_key.is_empty() {
        return Err(anyhow!("Anthropic key empty"));
    }

    // Default to Sonnet 4.5: best reasoning + judgment for live coaching.
    // Streaming-friendly. Override via Copilot Settings if you need cheaper.
    let model = if config.model.is_empty() {
        "claude-sonnet-4-5"
    } else {
        config.model.as_str()
    };

    let body = json!({
        "model":      model,
        "max_tokens": max_tokens,
        "stream":     true,
        "system":     system,
        "messages":   messages,
    });

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()?;

    let resp = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &config.anthropic_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await?;

    let http_status = resp.status();
    if !http_status.is_success() {
        let raw = resp.text().await?;
        return Err(anyhow!("Anthropic API error {http_status}: {raw}"));
    }

    let mut byte_stream = resp.bytes_stream();
    let mut line_buf    = String::new();
    let mut accumulated = String::new();

    'outer: while let Some(chunk) = byte_stream.next().await {
        let chunk = chunk.map_err(|e| anyhow!("stream read error: {e}"))?;
        line_buf.push_str(&String::from_utf8_lossy(&chunk));

        loop {
            match line_buf.find('\n') {
                None => break,
                Some(pos) => {
                    let line = line_buf[..pos].trim_end_matches('\r').to_string();
                    line_buf = line_buf[pos + 1..].to_string();

                    if let Some(data) = line.strip_prefix("data: ") {
                        if data == "[DONE]" { break 'outer; }
                        if let Ok(ev) = serde_json::from_str::<SseEvent>(data) {
                            if ev.event_type == "content_block_delta" {
                                if let Some(d) = ev.delta {
                                    if d.delta_type == "text_delta" && !d.text.is_empty() {
                                        accumulated.push_str(&d.text);
                                        let _ = app.emit("answer-token", &d.text);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(accumulated)
}

// ── Public API ────────────────────────────────────────────────────────────────

/// Stream a concise Q&A answer (Pyramid + STAR + MECE hints).
/// Emits `"answer-token"` events; returns the full text.
pub async fn generate_answer_streaming(
    config:     &CaptureConfig,
    transcript: &str,
    history:    &[HistoryEntry],
    app:        &AppHandle,
) -> Result<String> {
    let current_msg = format!(
        "<domain>{}</domain>\n\n\
         <recruiter_speech>\n{}\n</recruiter_speech>\n\n\
         <cv>\n{}\n</cv>\n\n\
         <jd>\n{}\n</jd>\n\n\
         Write the spoken answer.",
        persona_hint(&config.persona),
        transcript.trim(),
        if config.cv.is_empty() { "(none)" } else { &config.cv },
        if config.jd.is_empty() { "(none)" } else { &config.jd },
    );

    let mut messages: Vec<serde_json::Value> = Vec::new();
    for entry in history.iter().rev().take(3).collect::<Vec<_>>().into_iter().rev() {
        messages.push(json!({
            "role": "user",
            "content": format!(
                "<recruiter_speech>{}</recruiter_speech>\n\nWrite the spoken answer.",
                entry.question
            )
        }));
        messages.push(json!({ "role": "assistant", "content": &entry.answer_text }));
    }
    messages.push(json!({ "role": "user", "content": current_msg }));

    // 320 tokens: ≤80 words spoken + generous buffer so nothing gets cut
    stream_claude(config, QA_SYSTEM_PROMPT, messages, 320, app).await
}

/// Stream a structured 3-minute self-presentation pitch.
/// Uses Minto Pyramid + STAR + MECE, with inline timing markers.
/// Emits `"answer-token"` events; returns the full text.
pub async fn generate_pitch_streaming(
    config:       &CaptureConfig,
    instructions: &str,   // Recruiter's exact words, or "" for generic pitch
    history:      &[HistoryEntry],
    app:          &AppHandle,
) -> Result<String> {
    let instr = if instructions.trim().is_empty() {
        "Tell me about yourself. Self-presentation, 3 minutes."
    } else {
        instructions.trim()
    };

    let current_msg = format!(
        "<domain>{}</domain>\n\n\
         <recruiter_instructions>\n{}\n</recruiter_instructions>\n\n\
         <cv>\n{}\n</cv>\n\n\
         <jd>\n{}\n</jd>\n\n\
         Deliver the self-presentation now.",
        persona_hint(&config.persona),
        instr,
        if config.cv.is_empty() { "(none)" } else { &config.cv },
        if config.jd.is_empty() { "(none)" } else { &config.jd },
    );

    let mut messages: Vec<serde_json::Value> = Vec::new();
    for entry in history.iter().rev().take(2).collect::<Vec<_>>().into_iter().rev() {
        messages.push(json!({
            "role": "user",
            "content": format!(
                "<recruiter_instructions>{}</recruiter_instructions>\n\nDeliver the self-presentation.",
                entry.question
            )
        }));
        messages.push(json!({ "role": "assistant", "content": &entry.answer_text }));
    }
    messages.push(json!({ "role": "user", "content": current_msg }));

    // 1200 tokens: 420 spoken words ≈ 560 tokens + timing markers + buffer
    stream_claude(config, PITCH_SYSTEM_PROMPT, messages, 1200, app).await
}
