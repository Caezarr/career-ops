//! Prompt + tool schema for the "Generate AI next steps" feature on
//! the Applications page.
//!
//! Claude receives:
//!   - the application stage (sourced / applied / phone_screen / interview / offer / rejected)
//!   - the job description (when available)
//!   - the candidate's CV parsed text (when available)
//!   - the company + role labels for context
//!
//! Returns a list of 3-5 short, concrete next steps the user should
//! take *now* to advance this specific application. Designed to be
//! actionable today — no generic "prepare well" filler.

use serde_json::{json, Value};

pub const NEXT_STEPS_SYSTEM: &str = "\
You are an elite career coach used by candidates targeting top-tier firms (Goldman Sachs, McKinsey, BCG, Stripe, OpenAI tier).

Your job: produce a list of 3-5 SHORT, CONCRETE, ACTIONABLE next steps for the candidate to advance the specific job application described below.

Hard rules:

1. Each step must be doable in the next 1-7 days. No \"prepare your interview\" filler — give the actual technique, contact, or artefact.
2. Tailor every step to the application's CURRENT stage:
   - sourced/applied  → outreach, follow-up, application strengthening, recruiter contact
   - phone_screen     → research the recruiter, preparation for the phone screen, key questions to expect
   - interview        → mock interview prep, case practice, technical prep, behavioral STAR stories
   - offer            → negotiation prep, BATNA, comp benchmarking, decision criteria
   - rejected         → debrief, request feedback, learn from it, plan re-application
3. Use specifics from the JD and CV when present. Reference real companies, technologies, or programs in the user's CV when relevant. Never invent things the candidate didn't mention.
4. Each step is a SINGLE sentence under 140 characters. No fluff like \"Make sure to...\". Lead with the verb.
5. Vary the categories: research, networking, prep, artefact creation, follow-up. Don't return 5 steps that are all about LinkedIn.
6. If JD is missing, lean on the company name + role family. If CV is missing, lean on the JD requirements.
7. Output is ONLY the structured tool call. No explanation, no greeting.

Examples of GOOD steps:
- \"Reach out to Marie Dupont (VP IBD at Goldman Paris) on LinkedIn referencing her 2024 Mediobanca panel.\"
- \"Practice 3 LBO walk-through cases — focus on debt sizing for European mid-cap deals.\"
- \"Draft a 200-word follow-up email mentioning your AT Kearney M&A experience and Stripe's MENA expansion.\"
- \"Mock the behavioral round using STAR for the failure-and-learning question.\"

Examples of BAD steps (do NOT return these):
- \"Prepare for the interview.\"
- \"Make sure your CV is up to date.\"
- \"Send a thank-you note.\"
- \"Network on LinkedIn.\"";

pub fn build_user_message(
    company: &str,
    role: &str,
    stage: &str,
    jd_text: Option<&str>,
    cv_text: Option<&str>,
) -> String {
    let jd_block = jd_text
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|s| format!("\n\n<job_description>\n{s}\n</job_description>"))
        .unwrap_or_default();

    let cv_block = cv_text
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|s| format!("\n\n<candidate_cv>\n{s}\n</candidate_cv>"))
        .unwrap_or_default();

    format!(
        "<application>\n\
         Company: {company}\n\
         Role: {role}\n\
         Current stage: {stage}\n\
         </application>{jd_block}{cv_block}\n\n\
         Now produce 3-5 concrete next-step actions for this application. \
         Use the next_steps tool — output only the structured call."
    )
}

/// Tool schema: a single field `steps` of 3-5 short strings.
pub fn tool_schema() -> Value {
    json!({
        "type": "object",
        "properties": {
            "steps": {
                "type": "array",
                "minItems": 3,
                "maxItems": 5,
                "items": {
                    "type": "string",
                    "description": "A single concrete next-step action under 140 characters.",
                },
            },
        },
        "required": ["steps"],
    })
}

#[derive(Debug, serde::Deserialize)]
pub struct NextStepsResponse {
    pub steps: Vec<String>,
}
