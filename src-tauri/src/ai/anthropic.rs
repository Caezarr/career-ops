//! Generic Anthropic API client.
//!
//! Two entrypoints:
//! - `ask_structured`: forces JSON via tool_use → guaranteed schema match.
//! - `ask_completion`: simple text-in / text-out for shorter prose tasks.
//!
//! Streaming (token-by-token via SSE) lives in `crate::llm` for now to keep
//! the live Copilot path untouched. Once the Copilot itself migrates to this
//! module we can pull the streaming path in here too.

use serde_json::{json, Value};
use crate::ai::types::{AiConfig, AiError, AiResult};

const ANTHROPIC_URL: &str = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION: &str = "2023-06-01";

/// Ask Claude with a single tool to force structured JSON output.
/// `tool_schema` is the JSON Schema for the tool's input.
/// Returns the parsed value of type T.
pub async fn ask_structured<T: serde::de::DeserializeOwned>(
    cfg: &AiConfig,
    system: &str,
    user: &str,
    tool_name: &str,
    tool_description: &str,
    tool_schema: Value,
    max_tokens: u32,
) -> AiResult<T> {
    if cfg.anthropic_key.is_empty() {
        return Err(AiError::KeyMissing);
    }

    let body = json!({
        "model": cfg.model_or_default(),
        "max_tokens": max_tokens,
        "system": system,
        "tools": [{
            "name": tool_name,
            "description": tool_description,
            "input_schema": tool_schema,
        }],
        "tool_choice": { "type": "tool", "name": tool_name },
        "messages": [
            { "role": "user", "content": user }
        ],
    });

    // PRIV-01: shared single-egress client (60s tier — non-streaming).
    let resp = crate::cloud::slow()
        .post(ANTHROPIC_URL)
        .header("x-api-key", &cfg.anthropic_key)
        .header("anthropic-version", ANTHROPIC_VERSION)
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await?;

    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(AiError::Api {
            status: status.as_u16(),
            body,
        });
    }

    let v: Value = resp.json().await?;

    // Find the tool_use block in the response.content array.
    let content = v
        .get("content")
        .and_then(|c| c.as_array())
        .ok_or_else(|| AiError::InvalidResponse("no content array".into()))?;

    for block in content {
        if block.get("type").and_then(|t| t.as_str()) == Some("tool_use") {
            let input = block
                .get("input")
                .ok_or_else(|| AiError::InvalidResponse("tool_use block missing input".into()))?;
            return Ok(serde_json::from_value::<T>(input.clone())?);
        }
    }

    // Fallback: maybe the model returned plain text — try to parse it as JSON.
    if let Some(text) = content
        .iter()
        .find(|b| b.get("type").and_then(|t| t.as_str()) == Some("text"))
        .and_then(|b| b.get("text"))
        .and_then(|t| t.as_str())
    {
        if let Ok(parsed) = serde_json::from_str::<T>(text) {
            return Ok(parsed);
        }
    }

    Err(AiError::InvalidResponse(
        "no tool_use block in response".into(),
    ))
}

/// Plain text-in / text-out completion. Useful for shorter prose tasks
/// where structured output isn't needed.
#[allow(dead_code)] // wired in future sprints
pub async fn ask_completion(
    cfg: &AiConfig,
    system: &str,
    user: &str,
    max_tokens: u32,
) -> AiResult<String> {
    if cfg.anthropic_key.is_empty() {
        return Err(AiError::KeyMissing);
    }

    let body = json!({
        "model": cfg.model_or_default(),
        "max_tokens": max_tokens,
        "system": system,
        "messages": [
            { "role": "user", "content": user }
        ],
    });

    // PRIV-01: shared single-egress client (60s tier — non-streaming).
    let resp = crate::cloud::slow()
        .post(ANTHROPIC_URL)
        .header("x-api-key", &cfg.anthropic_key)
        .header("anthropic-version", ANTHROPIC_VERSION)
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await?;

    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(AiError::Api {
            status: status.as_u16(),
            body,
        });
    }

    let v: Value = resp.json().await?;

    let content = v
        .get("content")
        .and_then(|c| c.as_array())
        .ok_or_else(|| AiError::InvalidResponse("no content array".into()))?;

    let text = content
        .iter()
        .filter_map(|b| {
            if b.get("type").and_then(|t| t.as_str()) == Some("text") {
                b.get("text").and_then(|t| t.as_str())
            } else {
                None
            }
        })
        .collect::<Vec<_>>()
        .join("");

    if text.is_empty() {
        return Err(AiError::InvalidResponse("empty text response".into()));
    }
    Ok(text)
}
