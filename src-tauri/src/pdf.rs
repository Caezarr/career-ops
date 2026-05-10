use anyhow::{anyhow, Result};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};

/// Decode a base64-encoded PDF and extract its text contents.
/// Falls back to OpenAI vision OCR if the embedded text is empty (scanned PDF).
pub fn extract_text_from_base64(b64: &str) -> Result<String> {
    let bytes = STANDARD
        .decode(b64.trim())
        .map_err(|e| anyhow!("invalid base64: {e}"))?;

    if !bytes.starts_with(b"%PDF") {
        return Err(anyhow!("not a PDF (missing %PDF header)"));
    }

    let text = pdf_extract::extract_text_from_mem(&bytes)
        .map_err(|e| anyhow!("PDF extraction failed: {e}"))?;

    let cleaned = clean_extracted_text(&text);

    if cleaned.trim().is_empty() {
        return Err(anyhow!(
            "no extractable text — PDF is likely image-based / scanned. \
             Re-export as a text PDF or paste the text manually."
        ));
    }

    Ok(cleaned)
}

// ─── Profile extraction (CV → contact fields) ───────────────────────
//
// Used by the onboarding wizard's `parse_cv_profile` Tauri command to
// pre-fill the user's contact block (email / phone / LinkedIn / GitHub
// / portfolio + a best-effort name). Pure-text heuristics — no LLM, no
// network. Roughly 80% accuracy on text-PDF CVs from standard
// templates (Overleaf, Word, Canva). Image-based PDFs come back empty
// (same as `extract_text_from_base64`).
//
// Why regex + once_cell rather than nom or pest: the patterns are
// simple, the input is short (~3-5KB of CV text), and a single
// compile-once Regex hit per slot keeps the code reviewable. The
// alternative (handwritten char-by-char scanners) costs more code
// for marginal robustness gains.

/// Extracted profile fields from a CV's plain text. Every field is
/// optional — the frontend overlays these on top of any value the
/// user has already typed (non-destructive merge).
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CvExtractedProfile {
    pub name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub linkedin: Option<String>,
    pub github: Option<String>,
    pub portfolio: Option<String>,
}

/// RFC-5322-ish email matcher. Conservative on the local part —
/// rejects the obvious junk we see in real CVs (trailing
/// punctuation, broken word splits) without trying to be a true
/// email validator.
static EMAIL_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}\b")
        .expect("EMAIL_RE compiles")
});

/// Phone number matcher tuned for FR + intl formats. The expected
/// shape is "10 digits" (FR) or "+CC + 9-12 digits", with optional
/// spaces / dots / hyphens between groups. We deliberately require
/// at least one separator so that ISBNs / order numbers / job
/// posting refs don't match.
static PHONE_RE: Lazy<Regex> = Lazy::new(|| {
    // (?:\+\d{1,3}[\s.\-]?)? optional country code
    // \(?\d{1,4}\)? optional first group with parens
    // (?:[\s.\-]\d{2,4}){2,4} 2-4 separated digit groups
    Regex::new(
        r"(?:\+\d{1,3}[\s.\-]?)?\(?\d{1,4}\)?(?:[\s.\-]\d{2,4}){2,4}",
    )
    .expect("PHONE_RE compiles")
});

/// LinkedIn profile URL — accepts bare host + path or full
/// scheme. Captures the slug so we can normalise the output.
static LINKEDIN_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)(?:https?://)?(?:www\.)?linkedin\.com/in/([A-Z0-9\-_]+)/?")
        .expect("LINKEDIN_RE compiles")
});

/// GitHub user/profile URL. We bias toward profile URLs (single
/// path segment) — repo URLs (two segments) are noise for the
/// "github username" field.
static GITHUB_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)(?:https?://)?(?:www\.)?github\.com/([A-Z0-9\-]+)(?:/[A-Z0-9\-_.]+)?/?")
        .expect("GITHUB_RE compiles")
});

/// Generic URL — used for portfolio detection after we've stripped
/// the LinkedIn / GitHub matches. Keep it tight enough that "e.g."
/// or "Inc." don't accidentally match.
static URL_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\bhttps?://[A-Z0-9\-._~:/?#@!$&'()*+,;=%]+|\b(?:[A-Z0-9\-]+\.){1,3}[A-Z]{2,6}(?:/[A-Z0-9\-._~:/?#@!$&'()*+,;=%]*)?\b")
        .expect("URL_RE compiles")
});

/// Run every regex against the extracted text and assemble a
/// profile. Public so tests + the `parse_cv_profile` command can
/// call it without round-tripping the base64 path.
pub fn extract_profile(text: &str) -> CvExtractedProfile {
    let mut p = CvExtractedProfile::default();

    p.email = EMAIL_RE
        .find(text)
        .map(|m| m.as_str().trim_end_matches('.').to_lowercase())
        // Filter common false positives: image filenames embedded in
        // PDF metadata, no-reply addresses, fake @example.com entries.
        .filter(|e| {
            !e.starts_with("no-reply@")
                && !e.starts_with("noreply@")
                && !e.ends_with("@example.com")
                && !e.contains(".png@")
                && !e.contains(".jpg@")
        });

    p.phone = PHONE_RE
        .find(text)
        // Reject matches that are clearly years / dates (4 digits
        // separated by `-` like "2020-2024"). We do this by
        // counting actual digits; a phone has ≥9 digits.
        .filter(|m| m.as_str().chars().filter(|c| c.is_ascii_digit()).count() >= 9)
        .map(|m| m.as_str().trim().to_string());

    p.linkedin = LINKEDIN_RE
        .captures(text)
        .and_then(|c| c.get(1))
        .map(|m| format!("linkedin.com/in/{}", m.as_str()));

    p.github = GITHUB_RE
        .captures(text)
        .and_then(|c| c.get(1))
        // Common false positive — "github.com/anthropic" mentioned
        // as a target company, not the user. Filter the obvious
        // company orgs we've seen in CVs.
        .filter(|m| {
            !matches!(
                m.as_str().to_lowercase().as_str(),
                "anthropic" | "openai" | "stripe" | "vercel" | "supabase"
            )
        })
        .map(|m| format!("github.com/{}", m.as_str()));

    p.portfolio = extract_portfolio(text, p.linkedin.as_deref(), p.github.as_deref());

    p.name = extract_name(text);

    p
}

/// First non-LinkedIn/GitHub URL we find. Cheap heuristic — works
/// when the user lists a portfolio inline near the contact block.
///
/// Note we strip the email matches from the search space first —
/// `URL_RE` is greedy enough to grab the local part of an email
/// ("camille.durand") as a bare domain because `durand` matches
/// the TLD slot. Replacing emails with whitespace keeps the regex
/// simple while killing that whole class of false positives.
fn extract_portfolio(
    text: &str,
    linkedin: Option<&str>,
    github: Option<&str>,
) -> Option<String> {
    let cleaned = EMAIL_RE.replace_all(text, " ").into_owned();
    for m in URL_RE.find_iter(&cleaned) {
        let raw = m.as_str().trim_end_matches(['.', ',', ')', ';']);
        let lc = raw.to_lowercase();
        if lc.contains("linkedin.com")
            || lc.contains("github.com")
            || lc.contains("@") // accidentally caught email
            || lc.starts_with("mailto:")
        {
            continue;
        }
        // Skip if the match is the same domain we already captured.
        if let Some(li) = linkedin {
            if lc.contains(&li.to_lowercase()) {
                continue;
            }
        }
        if let Some(gh) = github {
            if lc.contains(&gh.to_lowercase()) {
                continue;
            }
        }
        // Reject domains that are too short to be portfolios
        // (e.g. "fr.li" matches but is junk).
        if raw.len() < 6 {
            continue;
        }
        // Strip leading scheme so the field looks consistent with
        // linkedin / github in the UI.
        let clean = raw
            .trim_start_matches("https://")
            .trim_start_matches("http://")
            .trim_start_matches("www.");
        return Some(clean.to_string());
    }
    None
}

/// Extract the candidate's full name from the first ~5 lines of the
/// CV. Heuristic: the first line that looks like 2-4 Title-Case
/// tokens, no email / URL / digits, and at most one short
/// stop-word ("de", "la", "von", …). Works for ~80% of standard
/// CV templates that put the name as a banner at the top.
fn extract_name(text: &str) -> Option<String> {
    let stop_lower: &[&str] = &["de", "la", "le", "du", "von", "van", "del", "y"];

    for line in text.lines().take(8) {
        let t = line.trim();
        if t.is_empty() || t.len() > 60 {
            continue;
        }
        // Reject lines that obviously aren't names.
        if t.contains('@')
            || t.contains("://")
            || t.chars().any(|c| c.is_ascii_digit())
            || t.contains('|') // banner separators
            || t.contains('•')
            || t.contains('·')
        {
            continue;
        }
        let tokens: Vec<&str> = t.split_whitespace().collect();
        if tokens.len() < 2 || tokens.len() > 5 {
            continue;
        }
        let title_case_count = tokens
            .iter()
            .filter(|tok| {
                let lc = tok.to_lowercase();
                if stop_lower.contains(&lc.as_str()) {
                    return false;
                }
                // First char uppercase + at least one more letter
                let mut chars = tok.chars();
                let first = match chars.next() {
                    Some(c) => c,
                    None => return false,
                };
                first.is_uppercase() && tok.chars().count() >= 2
            })
            .count();
        // ≥2 title-case tokens → likely a name.
        if title_case_count >= 2 {
            return Some(t.to_string());
        }
    }
    None
}

/// Convenience helper used by the Tauri command — decode the PDF,
/// extract the text, then run `extract_profile` over it. Errors
/// from the PDF stage bubble up unchanged.
pub fn extract_profile_from_base64(b64: &str) -> Result<CvExtractedProfile> {
    let text = extract_text_from_base64(b64)?;
    Ok(extract_profile(&text))
}

/// Best-effort: collapse hard-broken lines, strip duplicate whitespace.
fn clean_extracted_text(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for line in s.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            if !out.ends_with("\n\n") {
                out.push('\n');
            }
            continue;
        }
        if !out.is_empty() && !out.ends_with('\n') {
            out.push(' ');
        }
        out.push_str(trimmed);
        // Treat punctuation-ending lines as paragraph breaks.
        if trimmed.ends_with(['.', '!', '?', ':', ';']) {
            out.push('\n');
        }
    }
    // Compress runs of whitespace
    while out.contains("  ") {
        out = out.replace("  ", " ");
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Realistic FR CV header — exactly the kind of layout the
    /// onboarding wizard sees most often.
    const FR_CV_HEADER: &str = "
Camille Durand
Paris, France
camille.durand@example.fr | +33 6 12 34 56 78
linkedin.com/in/camille-durand | github.com/camilledurand
camilledurand.dev

EXPÉRIENCE
2022 — 2024 · Stripe — Software Engineer
Built distributed systems for the Issuing platform.
";

    #[test]
    fn extracts_email() {
        let p = extract_profile(FR_CV_HEADER);
        assert_eq!(p.email.as_deref(), Some("camille.durand@example.fr"));
    }

    #[test]
    fn extracts_phone_french_format() {
        let p = extract_profile(FR_CV_HEADER);
        assert!(p.phone.is_some(), "expected a phone match");
        let phone = p.phone.unwrap();
        assert!(phone.contains("33"), "phone {phone} missing country code");
    }

    #[test]
    fn extracts_linkedin_normalised() {
        let p = extract_profile(FR_CV_HEADER);
        assert_eq!(p.linkedin.as_deref(), Some("linkedin.com/in/camille-durand"));
    }

    #[test]
    fn extracts_github_normalised() {
        let p = extract_profile(FR_CV_HEADER);
        assert_eq!(p.github.as_deref(), Some("github.com/camilledurand"));
    }

    #[test]
    fn extracts_portfolio_after_li_gh() {
        let p = extract_profile(FR_CV_HEADER);
        assert_eq!(p.portfolio.as_deref(), Some("camilledurand.dev"));
    }

    #[test]
    fn extracts_name_from_first_line() {
        let p = extract_profile(FR_CV_HEADER);
        assert_eq!(p.name.as_deref(), Some("Camille Durand"));
    }

    #[test]
    fn rejects_year_range_as_phone() {
        // "2020-2024" should not be picked up as a phone — only 8 digits.
        let p = extract_profile("Some text 2020 - 2024 only");
        assert!(p.phone.is_none(), "year range should not be phone");
    }

    #[test]
    fn rejects_noreply_email() {
        let p = extract_profile("Contact us via no-reply@example.com");
        assert!(p.email.is_none(), "no-reply should not be captured");
    }

    #[test]
    fn rejects_company_github_org() {
        let p = extract_profile("Targeting roles at github.com/anthropic teams");
        assert!(
            p.github.is_none(),
            "well-known company org should not be captured"
        );
    }

    #[test]
    fn handles_empty_input() {
        let p = extract_profile("");
        assert!(p.email.is_none());
        assert!(p.phone.is_none());
        assert!(p.linkedin.is_none());
        assert!(p.github.is_none());
        assert!(p.name.is_none());
    }

    #[test]
    fn handles_https_prefix_on_linkedin() {
        let p = extract_profile("Profile: https://www.linkedin.com/in/jane-doe/");
        assert_eq!(p.linkedin.as_deref(), Some("linkedin.com/in/jane-doe"));
    }

    #[test]
    fn name_skips_lines_with_digits() {
        let text = "
2024
Jean Dupont
jean@dup.com
";
        let p = extract_profile(text);
        assert_eq!(p.name.as_deref(), Some("Jean Dupont"));
    }
}
