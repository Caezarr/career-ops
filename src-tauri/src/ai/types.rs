use serde::{Deserialize, Serialize};

// ── Common AI config ──────────────────────────────────────────────────────────

/// Configuration shared by all AI calls.
#[derive(Debug, Clone)]
pub struct AiConfig {
    pub anthropic_key: String,
    pub model: Option<String>,
}

impl AiConfig {
    pub fn new(anthropic_key: String, model: Option<String>) -> Self {
        Self { anthropic_key, model }
    }

    /// Default model used when none provided.
    /// Sonnet 3.5 is the right balance of quality + cost for ATS / tailoring.
    pub fn model_or_default(&self) -> &str {
        self.model.as_deref().unwrap_or("claude-3-5-sonnet-20241022")
    }
}

// ── ATS analysis types ────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AtsAnalysis {
    pub ats_score: u8,
    pub match_score: u8,
    pub strengths: Vec<String>,
    pub weaknesses: Vec<String>,
    pub missing_keywords: Vec<String>,
    pub suggestions: Vec<AtsSuggestion>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AtsSuggestion {
    /// "add" | "reword" | "remove"
    #[serde(rename = "type")]
    pub kind: String,
    /// Original CV text (or "<empty>" if adding a new bullet).
    pub original: String,
    /// Suggested replacement.
    pub suggested: String,
    /// One-sentence rationale.
    pub rationale: String,
}

// ── Errors ────────────────────────────────────────────────────────────────────

#[derive(Debug, thiserror::Error)]
pub enum AiError {
    #[error("Anthropic API key is empty")]
    KeyMissing,

    #[error("CV has no parsed text — re-upload the CV PDF")]
    CvEmpty,

    #[error("network error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("Anthropic API error {status}: {body}")]
    Api { status: u16, body: String },

    #[error("invalid response from Anthropic: {0}")]
    InvalidResponse(String),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
}

impl Serialize for AiError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

pub type AiResult<T> = Result<T, AiError>;
