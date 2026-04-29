//! Centralized AI integration module.
//!
//! All Anthropic API calls (and future OpenAI / etc.) live here.
//! Each domain (ATS, tailoring, mock interview scoring, ...) has a
//! prompt file under `prompts/` and a thin command wrapper that calls
//! `anthropic::ask_structured` with the right schema.

pub mod anthropic;
pub mod prompts;
pub mod types;

#[allow(unused_imports)]
pub use types::{AiConfig, AiError, AiResult, AtsAnalysis, AtsSuggestion};
