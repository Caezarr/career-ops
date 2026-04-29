use serde_json::{json, Value};

pub const ATS_SYSTEM: &str = "\
You are an expert ATS (Applicant Tracking System) and senior recruiter at top-tier firms (Goldman Sachs, McKinsey, BCG, Stripe, OpenAI tier).

Score CVs against job descriptions ruthlessly. Real ATSs reject ~75% of CVs and recruiters spend ~7 seconds on the first pass. Score accordingly.

Rubric — be precise:
- atsScore (0-100): pure ATS keyword + format match for the CURRENT CV as-is. A CV that uses the exact JD vocabulary, has clear section headers (SUMMARY / EXPERIENCE / EDUCATION), and quantified bullets scores high. Below 60 = will be filtered out by the ATS.
- matchScore (0-100): weighted candidate-vs-role fit including seniority, scope, industry. Stricter than atsScore. Below 70 = unlikely to get an interview.
- projectedAtsScore (0-100): the atsScore the CV would reach IF the candidate applies every suggestion in your 'suggestions' list exactly as proposed. MUST be greater than or equal to atsScore (the suggestions can only help). Capped at 100. If your suggestions are conservative, the lift might be 5-10 points; if you're proposing aggressive rewrites that fix major gaps, 15-25 points. Be honest — don't promise impossible jumps.
- strengths: 3-5 specific things that work. Cite the exact CV phrasing. Avoid vague praise.
- weaknesses: 3-5 concrete gaps. Cite missing terms or weak phrasings.
- missingKeywords: critical JD vocabulary absent from the CV. Be precise — only words/phrases the CV genuinely lacks.
- suggestions: 2-5 actionable edits. Each must include:
    type: 'add' | 'reword' | 'remove'
    original: the exact CV text being modified, or '<empty>' for new bullets
    suggested: the rewritten/new line
    rationale: 1 sentence explaining why this beats the original.

Be specific. Avoid generic advice like 'add quantified bullets' — name the bullet, name the metric. The candidate needs to know exactly what to change.

If no JD is provided, score against a generic top-tier candidate baseline for the CV's role focus.

Match the CV's language: French CV → French analysis, English CV → English analysis.";

/// Build the user message: CV text + JD (optional) + invocation.
pub fn build_user_message(cv_text: &str, jd_text: Option<&str>) -> String {
    let cv_block = if cv_text.trim().is_empty() {
        "(no CV text — fall back to generic feedback)".to_string()
    } else {
        cv_text.trim().to_string()
    };
    let jd_block = match jd_text {
        Some(jd) if !jd.trim().is_empty() => jd.trim().to_string(),
        _ => "(no job description provided — score against a top-tier baseline for this role)".to_string(),
    };
    format!(
        "<cv>\n{cv_block}\n</cv>\n\n<job_description>\n{jd_block}\n</job_description>\n\nScore the CV. Return your analysis through the score_cv tool."
    )
}

/// JSON Schema for the score_cv tool input. Matches AtsAnalysis exactly.
pub fn tool_schema() -> Value {
    json!({
        "type": "object",
        "properties": {
            "atsScore": {
                "type": "integer",
                "minimum": 0,
                "maximum": 100,
                "description": "Pure ATS keyword + format match score, 0-100."
            },
            "matchScore": {
                "type": "integer",
                "minimum": 0,
                "maximum": 100,
                "description": "Candidate-vs-role weighted fit score, 0-100."
            },
            "projectedAtsScore": {
                "type": "integer",
                "minimum": 0,
                "maximum": 100,
                "description": "ats_score the CV would reach AFTER applying every suggestion in the suggestions list. Must be >= atsScore."
            },
            "strengths": {
                "type": "array",
                "items": { "type": "string" },
                "minItems": 1,
                "maxItems": 6,
                "description": "Specific things that work, citing CV phrasing."
            },
            "weaknesses": {
                "type": "array",
                "items": { "type": "string" },
                "minItems": 1,
                "maxItems": 6,
                "description": "Concrete gaps with cited missing terms or weak phrasings."
            },
            "missingKeywords": {
                "type": "array",
                "items": { "type": "string" },
                "description": "Critical JD vocabulary absent from the CV."
            },
            "suggestions": {
                "type": "array",
                "minItems": 1,
                "maxItems": 6,
                "items": {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "enum": ["add", "reword", "remove"]
                        },
                        "original": {
                            "type": "string",
                            "description": "Exact CV text being modified, or '<empty>' for new bullets."
                        },
                        "suggested": {
                            "type": "string",
                            "description": "The rewritten or newly proposed line."
                        },
                        "rationale": {
                            "type": "string",
                            "description": "One sentence on why this beats the original."
                        }
                    },
                    "required": ["type", "original", "suggested", "rationale"]
                }
            }
        },
        "required": [
            "atsScore",
            "matchScore",
            "projectedAtsScore",
            "strengths",
            "weaknesses",
            "missingKeywords",
            "suggestions"
        ]
    })
}
