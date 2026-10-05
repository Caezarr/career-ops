//! Citation validator for Live Copilot answer bullets.
//!
//! ## Purpose
//! Enforces zero-hallucination guarantee by validating that every
//! `[ref: CV.experience.<id>]` citation in an LLM-generated bullet
//! resolves to an actual entry in the structured CV snapshot.
//!
//! Bullets with unresolved refs are dropped, not displayed.
//!
//! ## Usage
//! ```ignore
//! let snapshot = CvSnapshot {
//!     experiences: vec!["experience.0".into(), "experience.1".into()],
//! };
//! let bullets = vec![
//!     "Led team of 5 [ref: CV.experience.0]".into(),
//!     "Increased revenue 200% [ref: CV.experience.999]".into(), // invalid
//! ];
//! let validated = validate_bullets(&bullets, &snapshot);
//! assert_eq!(validated.len(), 1); // only the first bullet survives
//! ```

use serde::{Deserialize, Serialize};

/// Structured CV snapshot for a single interview session.
/// In production this would be populated from the ingested CV JSON.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct CvSnapshot {
    /// Valid experience IDs (e.g., ["experience.0", "experience.1"]).
    pub experiences: Vec<String>,
}

impl CvSnapshot {
    /// Check if an experience ID is valid.
    #[allow(dead_code)]
    pub fn has_experience(&self, id: &str) -> bool {
        self.experiences.contains(&id.to_string())
    }
}

/// Validate a batch of answer bullets against a CV snapshot.
/// Returns only bullets with all citations resolved.
#[allow(dead_code)]
pub fn validate_bullets(bullets: &[String], snapshot: &CvSnapshot) -> Vec<String> {
    bullets
        .iter()
        .filter(|bullet| validate_single_bullet(bullet, snapshot))
        .cloned()
        .collect()
}

/// Validate a single bullet. Returns true if all citations resolve.
#[allow(dead_code)]
fn validate_single_bullet(bullet: &str, snapshot: &CvSnapshot) -> bool {
    let refs = extract_refs(bullet);
    if refs.is_empty() {
        // No citations = generic bullet, always valid
        return true;
    }
    refs.iter().all(|r| snapshot.has_experience(r))
}

/// Extract all `[ref: CV.experience.<id>]` patterns from a bullet.
#[allow(dead_code)]
fn extract_refs(text: &str) -> Vec<String> {
    let mut refs = Vec::new();
    // Simple pattern: [ref: CV.experience.<id>]
    // In production this would use a proper parser or regex
    let mut rest = text;
    while let Some(start) = rest.find("[ref: CV.experience.") {
        let after_start = &rest[start + "[ref: CV.experience.".len()..];
        if let Some(end) = after_start.find(']') {
            let id = &after_start[..end];
            refs.push(format!("experience.{}", id));
            rest = &after_start[end + 1..];
        } else {
            break;
        }
    }
    refs
}

/// Job description snapshot for isolation testing.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct JdSnapshot {
    pub job_id: String,
    pub company: String,
    pub role: String,
    pub requirements: Vec<String>,
}

/// Full context snapshot for a single interview session.
/// Immutable after creation; each job gets its own instance.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct SessionSnapshot {
    pub session_id: String,
    pub cv: CvSnapshot,
    pub jd: Option<JdSnapshot>,
}

impl SessionSnapshot {
    /// Create a new session snapshot.
    #[allow(dead_code)]
    pub fn new(session_id: String, cv: CvSnapshot, jd: Option<JdSnapshot>) -> Self {
        Self {
            session_id,
            cv,
            jd,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_refs() {
        let text = "Led team [ref: CV.experience.0] and increased revenue [ref: CV.experience.1]";
        let refs = extract_refs(text);
        assert_eq!(refs, vec!["experience.0", "experience.1"]);
    }

    #[test]
    fn test_extract_refs_none() {
        let text = "Generic answer with no citations";
        let refs = extract_refs(text);
        assert_eq!(refs.len(), 0);
    }

    #[test]
    fn test_validate_single_bullet_valid() {
        let snapshot = CvSnapshot {
            experiences: vec!["experience.0".into()],
        };
        assert!(validate_single_bullet(
            "Led team [ref: CV.experience.0]",
            &snapshot
        ));
    }

    #[test]
    fn test_validate_single_bullet_invalid() {
        let snapshot = CvSnapshot {
            experiences: vec!["experience.0".into()],
        };
        assert!(!validate_single_bullet(
            "Led team [ref: CV.experience.999]",
            &snapshot
        ));
    }

    #[test]
    fn test_validate_single_bullet_generic() {
        let snapshot = CvSnapshot {
            experiences: vec!["experience.0".into()],
        };
        assert!(validate_single_bullet("Generic answer", &snapshot));
    }

    #[test]
    fn test_validate_bullets_mixed() {
        let snapshot = CvSnapshot {
            experiences: vec!["experience.0".into(), "experience.1".into()],
        };
        let bullets = vec![
            "Led team [ref: CV.experience.0]".into(),
            "Hallucinated fact [ref: CV.experience.999]".into(),
            "Generic answer".into(),
            "Used skill [ref: CV.experience.1]".into(),
        ];
        let validated = validate_bullets(&bullets, &snapshot);
        assert_eq!(validated.len(), 3);
        assert_eq!(validated[0], "Led team [ref: CV.experience.0]");
        assert_eq!(validated[1], "Generic answer");
        assert_eq!(validated[2], "Used skill [ref: CV.experience.1]");
    }
}
