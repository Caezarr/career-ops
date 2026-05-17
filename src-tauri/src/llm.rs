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

// ── Q&A system prompt — SCAFFOLD MODE (default) ──────────────────────────────
//
// D3 (2026-05-16): Pluely-inspired scaffold output. The candidate is mid-
// interview, eyes flicking to the teleprompter for 1-2 s glances — they
// don't have time to parse paragraphs. The scaffold gives them a TL;DR,
// 3-5 short bullet thoughts they can speak one at a time, and a closing
// line. Each bullet is 5-8 s of spoken delivery so it maps cleanly to a
// breath.
//
// The prose-mode fallback (`responseStyle = "full"`) appends an override
// at the bottom of this prompt via `assemble_qa_system_prompt`.
const QA_SYSTEM_PROMPT_SCAFFOLD: &str = "\
You are a real-time interview coach. The candidate is in a LIVE interview RIGHT NOW. Answers go on a teleprompter the candidate reads aloud.

## Detect the question type FIRST, then pick the structure

| Question type | Signal | Structure |
|---|---|---|
| **Behavioral / STAR** | \"Tell me about a time…\", \"Give an example…\" | One bullet = Situation+Task+Action, one bullet = QUANTIFIED Result, one bullet = lesson |
| **Strength / fit** | \"Why you?\", \"Why this firm?\", \"Your biggest strength\" | Pick ONE angle from CV. Three CV-grounded proof points. |
| **Case / estimation** | \"Estimate…\", \"How many…\", \"What's the market for…\" | Approach in TL;DR, 3-4 calculation bullets (assumption → number → check), result + sanity check in closing |
| **Technical** | \"How would you design…\", \"Explain how X works\" | Tradeoffs first, then 3 concrete techniques the candidate has shipped (CV-grounded) |
| **Curve-ball / opinion** | \"What do you think about…\", \"Convince me…\" | Take a clear position in TL;DR, defend with 2-3 reasoned bullets, acknowledge the opposite in closing |

## Hard rules (zero exceptions)

1. **Pyramid Principle**: the TL;DR sentence is the *answer*, not the *setup*. If a stranger read only the TL;DR, they should know your position.
2. **Every number and proper noun comes from the CV.** Zero fabrication. If a number isn't in the CV, say \"around\" / \"high six figures\" / \"a few thousand\" — never invent a precise figure.
3. **Ban the platitudes.** Replace:
   - \"strong communication skills\" → name a specific stakeholder you aligned, what was at stake
   - \"passionate about X\" → one concrete thing you built/wrote/shipped about X
   - \"team player\" → one moment you actively chose team value over personal credit
   - \"results-driven\" → just give the result with the number
4. **Specificity > completeness.** 3 sharp bullets beat 5 generic ones. If you only have 2 strong points, return 2 — never pad.
5. **Match register.** Casual interviewer → casual answer. MBB partner → MBB structure. Pacing matches the question's depth.
6. **Match language exactly.** FR question → FR answer. EN question → EN answer. Never mix.
7. **Speak to be heard, not read.** Sentences a human can deliver out loud without stumbling. No semicolons. No nested clauses longer than 8 words.
8. **The closing line is the differentiator.** It's the line the interviewer remembers after the call. Make it an insight, a hot take, a synthesis — never a recap of what you just said.

## Output format (return this markdown verbatim)

**TL;DR:** <one sentence — the answer, not the setup>

- <bullet 1 — concrete, CV-grounded>
- <bullet 2>
- <bullet 3>
- <bullet 4 — only if it adds genuinely new dimension>
- <bullet 5 — only if it adds genuinely new dimension>

**Closing line:** <one memorable sentence>

Each bullet = 5-8 seconds spoken. Never use paragraphs. Output ONLY the structured answer — no preamble, no commentary.";

/// D4 (2026-05-16): override appended when `responseStyle = "full"`.
/// Lets the user fall back to flowing prose for the rare situation
/// where a scaffolded answer would feel stilted (e.g. a soft-skill
/// "tell me about yourself" follow-up that benefits from narrative
/// flow). The original Pyramid + STAR + MECE rules above still apply —
/// only the OUTPUT STRUCTURE is overridden.
const QA_FULL_MODE_OVERRIDE: &str = "\n\n\
OVERRIDE: User has opted for full prose mode — return paragraphs instead of the bulleted structure. \
3-5 sentences, ≤ 80 words, one sentence per line (literal \\n between sentences for teleprompter scroll). \
Skip the TL;DR / bullets / Closing line scaffolding. Output ONLY the spoken answer text.";

/// Pick the Q&A system prompt for the configured response style.
/// Always starts from the scaffold prompt; for "full" we append the
/// override so the original rules stay intact and only the output
/// structure is swapped.
fn assemble_qa_system_prompt(response_style: &str) -> String {
    let mut prompt = String::from(QA_SYSTEM_PROMPT_SCAFFOLD);
    if response_style == "full" {
        prompt.push_str(QA_FULL_MODE_OVERRIDE);
    }
    prompt
}

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
7. TELEPROMPTER FORMATTING: insert a literal newline (\\n) after each sentence so the candidate reads it line-by-line as a real teleprompter. One sentence per line. The timing markers each start their own line. No double newlines, no blank lines.

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

/// Career OS Worker base URL. The Copilot streams Claude responses
/// through `/v1/copilot/answer-stream`, which proxies Anthropic with
/// the server-side merchant key. The desktop only ever holds a JWT.
///
/// Hardcoded because the dev/prod flip happens at the Worker layer
/// (we don't run a local Worker in `pnpm tauri dev` — the desktop
/// always talks to the deployed Worker).
const COPILOT_API_BASE: &str = "https://api.careeros.fr";

async fn stream_claude(
    config:     &CaptureConfig,
    system:     &str,
    messages:   Vec<serde_json::Value>,
    max_tokens: u32,
    app:        &AppHandle,
) -> Result<String> {
    // Post-pivot: Career OS hosts the Anthropic credit on the Worker.
    // The desktop authenticates with its JWT (in Keychain) and the
    // Worker forwards the streaming request to Anthropic on its
    // behalf. The `anthropic_key` field on CaptureConfig is kept for
    // backwards-compat (legacy BYOK) but is no longer required.
    let jwt = crate::secrets::get(crate::secrets::SecretSlot::AuthJwt)
        .map_err(|e| anyhow!("read JWT from Keychain failed: {e}"))?
        .ok_or_else(|| anyhow!("Not signed in — sign in to Career OS first."))?;

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

    // PRIV-01: shared single-egress client (30s tier).
    let resp = crate::cloud::default()
        .post(format!("{COPILOT_API_BASE}/v1/copilot/answer-stream"))
        .header("authorization", format!("Bearer {jwt}"))
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await?;

    let http_status = resp.status();
    if !http_status.is_success() {
        let raw = resp.text().await?;
        // Translate the most common failures into user-facing French —
        // the Copilot session bar surfaces these directly.
        if http_status == reqwest::StatusCode::UNAUTHORIZED
            || http_status == reqwest::StatusCode::FORBIDDEN
        {
            return Err(anyhow!("Session expirée — reconnecte-toi à Career OS."));
        }
        if http_status == reqwest::StatusCode::TOO_MANY_REQUESTS {
            return Err(anyhow!(
                "Plafond quotidien d'appels Copilot atteint. Réessaye demain."
            ));
        }
        return Err(anyhow!("Career OS API error {http_status}: {raw}"));
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
    // T4 (2026-05-16): cap kept on the call site for backwards-compat;
    // the canonical bound now lives in `session.rs::run_session` which
    // trims `history` to 6 entries. We still slice the most recent 6
    // here so the prompt budget stays predictable even if a future
    // caller hands us a longer slice.
    for entry in history.iter().rev().take(6).collect::<Vec<_>>().into_iter().rev() {
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

    // D3/D4 (2026-05-16): pick scaffold vs full prose mode from the
    // CaptureConfig. Default is scaffold (Pluely-style structured
    // output); "full" appends the override that swaps back to prose.
    let system = assemble_qa_system_prompt(&config.response_style);

    // 600 tokens: scaffold (TL;DR + 3-5 bullets + closing) with the
    // tighter "specificity > completeness" prompt rewrite (2026-05-17)
    // sometimes runs 450-500 tokens when Claude breaks down a case
    // estimation question into 4-5 calculation bullets. 600 gives
    // headroom so the closing line is never truncated. Still ~1.5¢
    // per call on Sonnet 4.5.
    stream_claude(config, &system, messages, 600, app).await
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
