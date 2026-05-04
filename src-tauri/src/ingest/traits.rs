//! Shared types for job ingestion providers.
//!
//! Each provider returns `Vec<RawJob>` from its `fetch(identifier)` function.
//! The `normalize` module converts those into the frontend-shaped
//! `IngestedJob` (matching `src/dashboard/store/types.ts::Job`).

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum IngestProvider {
    Greenhouse,
    Lever,
    Ashby,
    #[serde(rename = "ycombinator")]
    YCombinator,
}

impl IngestProvider {
    pub fn as_str(&self) -> &'static str {
        match self {
            IngestProvider::Greenhouse => "greenhouse",
            IngestProvider::Lever => "lever",
            IngestProvider::Ashby => "ashby",
            IngestProvider::YCombinator => "ycombinator",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "greenhouse" => Some(Self::Greenhouse),
            "lever" => Some(Self::Lever),
            "ashby" => Some(Self::Ashby),
            "ycombinator" => Some(Self::YCombinator),
            _ => None,
        }
    }
}

/// Provider-agnostic job DTO. Each provider maps its native shape into this.
#[derive(Debug, Clone)]
pub struct RawJob {
    /// The provider's own job ID. Used for dedup.
    pub source_id: String,
    /// Canonical apply URL.
    pub source_url: String,
    pub role: String,
    pub company: String,
    pub location: Option<String>,
    /// Free-form description (HTML or plain). The normalizer truncates it.
    pub description: Option<String>,
    /// Salary range if the provider exposes it.
    pub salary_min: Option<i64>,
    pub salary_max: Option<i64>,
    pub salary_currency: Option<String>,
    /// "Remote", "Hybrid", "Onsite" — provider-dependent.
    pub work_mode: Option<String>,
    /// "Full-time", "Contract", etc.
    pub employment_type: Option<String>,
    /// ISO 8601 string when the job was posted on the provider.
    pub posted_at: Option<String>,
}

#[derive(Debug, thiserror::Error)]
pub enum IngestError {
    #[error("HTTP error from {provider}: {message}")]
    Http {
        provider: &'static str,
        message: String,
    },
    #[error("Failed to parse {provider} response: {message}")]
    Parse {
        provider: &'static str,
        message: String,
    },
    #[error("Identifier empty or invalid for {0}")]
    BadIdentifier(&'static str),
    #[error("Provider {0} not yet implemented")]
    NotImplemented(&'static str),
}

impl serde::Serialize for IngestError {
    fn serialize<S: serde::Serializer>(&self, ser: S) -> Result<S::Ok, S::Error> {
        ser.serialize_str(&self.to_string())
    }
}
