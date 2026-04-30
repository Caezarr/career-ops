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
You are a senior career strategist coaching candidates targeting top-tier firms (Goldman Sachs, McKinsey, BCG, Stripe, OpenAI tier).

Your task: produce 3-5 next-step actions the candidate should take in the next 7 days to advance THIS SPECIFIC application.

# Hard rules

1. **Specificity over generality.** A great step names what to do, on what artefact, with what content. A bad step says \"prepare\" or \"network\". If you can swap the company/role/CV and the step still makes sense, it's too generic — rewrite it.

2. **Stage-aware playbook** (use the right register):
   - sourced / applied   → cold outreach to alumni or hiring manager, tailor the application, build a referral path, draft a follow-up email if 7+ days have passed.
   - phone_screen        → research the screener (recruiter LinkedIn), prep 3 sharp questions for them, draft a 30-sec story for \"Why this company\", confirm logistics.
   - interview           → mock specific question types (case, behavioral STAR, technical), prep 3 STAR stories from the candidate's actual experience, study the firm's recent news, plan logistics.
   - offer               → benchmark comp on Levels.fyi / Welcome to the Jungle / Glassdoor, identify BATNA, draft the negotiation ask, define decision deadline.
   - rejected            → request structured feedback within 48h, write a debrief, identify the gap, plan a 30-day improvement loop, keep the recruiter warm for future roles.

3. **Use ONLY information present in the inputs.** Do NOT invent names, dates, or specifics. If the JD mentions a tech stack, reference it. If the CV mentions a past employer, reference it. If neither does, fall back to the role family (e.g. \"investment banking\") and produce a sharp generic step — but never fabricate a person's name like \"Marie Dupont\" or a fake event.

4. **Format**:
   - One sentence per step, ≤ 140 characters.
   - Lead with the verb (Reach out, Draft, Practise, Benchmark, Mock, Send, Compile…).
   - No prefixes like \"Make sure to\", \"Don't forget to\", \"Try to\".
   - English by default; switch to French if the JD is clearly French.

5. **Variety**: aim for at least 3 of these categories across the list:
   - Outreach / networking
   - Artefact (email, doc, deck, mock CV variant)
   - Domain prep (case practise, technical drill, behavioral story)
   - Research (firm news, interviewer profile, comp data)
   - Process (logistics, follow-up, decision deadline)
   Don't return 4 LinkedIn-outreach steps.

6. **Output**: structured tool call only. No greeting, no commentary, no markdown.

# Examples calibrated to a Goldman Sachs Strategy applied stage

GOOD (specific, anchored in real artefacts the candidate can produce today):
- \"Identify 2 GS Strategy alumni from your school on LinkedIn and send a 4-line referral request mentioning your most relevant deal.\"
- \"Draft a 150-word email to the hiring manager that opens with one quantified result from your last role.\"
- \"Practise 2 market-sizing cases this week — TAM for European fintech and EU EV charging infrastructure.\"
- \"Benchmark your CV bullets against the JD's top 5 keywords, rewrite any bullet missing a number.\"

BAD (rejected by the rubric):
- \"Prepare your interview.\"  (generic)
- \"Send a follow-up.\"        (no content, no timing)
- \"Network on LinkedIn.\"     (no targets, no message)
- \"Reach out to Marie Dupont, ex-McKinsey partner.\"  (FABRICATED name)";

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
        .unwrap_or("\n\n<job_description>\n(no JD provided — fall back to role family conventions, do not invent specifics)\n</job_description>".to_string());

    let cv_block = cv_text
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|s| format!("\n\n<candidate_cv>\n{s}\n</candidate_cv>"))
        .unwrap_or("\n\n<candidate_cv>\n(no CV provided — produce sharp generic steps, do not fabricate experience)\n</candidate_cv>".to_string());

    format!(
        "<application>\n\
         Company: {company}\n\
         Role: {role}\n\
         Current stage: {stage}\n\
         </application>{jd_block}{cv_block}\n\n\
         Produce 3-5 concrete next-step actions for THIS application. \
         Use the `next_steps` tool — output the structured call only."
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
                    "description": "A single concrete next-step action under 140 characters. Lead with a verb, no filler. Anchored in the JD or CV when possible.",
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
