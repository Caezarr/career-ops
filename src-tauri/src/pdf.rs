use anyhow::{anyhow, Result};
use base64::{engine::general_purpose::STANDARD, Engine as _};

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
