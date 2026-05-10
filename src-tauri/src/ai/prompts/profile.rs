//! Prompt for the onboarding "Polish profile.md" pipeline.
//!
//! Claude receives:
//!   - the four free-form answers the user typed in StepNarrative
//!   - the parsed CV text (when available — pre-filled by
//!     `parse_cv_pdf` on Step 4)
//!   - the user's target tracks + experience level for tone calibration
//!
//! Claude returns a Markdown document with stable section headings
//! the rest of the app already understands (the same shape as the
//! placeholder template in `ProfileCard.tsx`). No code fences, no
//! commentary — just the markdown body.

/// Stable headings the downstream consumers (`runAnalyzer`, prep
/// generators, Copilot context) match against. Keep this in sync
/// with the user's "Quick story / Highlights / Anecdotes / What
/// I'm looking for" template in the frontend.
pub const PROFILE_SYSTEM: &str = "\
You are an elite career coach helping a candidate craft their `profile.md` — a short, dense, first-person narrative used by an AI assistant to write tailored CVs and brief them before interviews.

Output a clean Markdown document with exactly these four sections (omit a section only when the user gave no usable raw input for it):

# Quick story
2-3 punchy sentences. Who they are, what they optimise for, what they're aiming at. First-person voice. No fluff (\"passionate\", \"results-driven\", etc.).

# Highlights
3-5 bulleted achievements. Each bullet must:
- be quantified when the source mentions numbers (preserve them, never invent)
- name the firm / context
- read like a bullet on a top-tier CV (action verb, scope, outcome)

# Anecdotes & lessons
2-3 bulleted micro-stories. Each one ~2 sentences: situation + lesson. These will be drawn on for behavioural interview answers, so they should be specific and memorable, not platitudes.

# What I'm looking for next
2-3 bulleted criteria the user actually cares about (industry, team archetype, geography, mission). Be concrete — \"a VP who mentors\" beats \"good leadership\".

Hard rules:
- Same language as the user's raw input (FR raw → FR output, EN raw → EN output, never mix)
- First-person throughout (\"I\", \"je\")
- No emoji, no markdown bold inside bullets, no horizontal rules
- Never invent facts. If the raw input is too thin for a section, omit it rather than fabricate.
- Output ONLY the markdown body — no preamble, no \"Here is your profile:\", no code fences.
";

/// Build the per-call user message. We deliberately keep the
/// structure transparent (`<answer key=…>`) so the model can
/// distinguish raw inputs without us pre-formatting them as if
/// they were already polished.
pub fn build_user_message(
    story: &str,
    wins: &str,
    lesson: &str,
    north_star: &str,
    cv_text: Option<&str>,
    target_tracks: &[String],
    experience_level: Option<&str>,
) -> String {
    let mut s = String::with_capacity(2048);
    s.push_str("Raw inputs from the user (verbatim, in their language):\n\n");
    s.push_str("<answer key=\"story\">\n");
    s.push_str(story.trim());
    s.push_str("\n</answer>\n\n");
    s.push_str("<answer key=\"wins\">\n");
    s.push_str(wins.trim());
    s.push_str("\n</answer>\n\n");
    s.push_str("<answer key=\"lesson\">\n");
    s.push_str(lesson.trim());
    s.push_str("\n</answer>\n\n");
    s.push_str("<answer key=\"north_star\">\n");
    s.push_str(north_star.trim());
    s.push_str("\n</answer>\n\n");

    if !target_tracks.is_empty() {
        s.push_str("Tracks they're targeting: ");
        s.push_str(&target_tracks.join(", "));
        s.push('\n');
    }
    if let Some(lv) = experience_level {
        s.push_str("Experience level: ");
        s.push_str(lv);
        s.push('\n');
    }

    if let Some(cv) = cv_text {
        let cv = cv.trim();
        if !cv.is_empty() {
            s.push('\n');
            s.push_str("Parsed CV text — use it to ground the Highlights bullets in real numbers / firm names. Do not copy entire bullets, summarise:\n\n");
            s.push_str("<cv>\n");
            // Cap the CV at 6kB — the rest is rarely useful for
            // narrative work and just inflates the cost.
            const CV_LIMIT: usize = 6_000;
            if cv.len() > CV_LIMIT {
                s.push_str(&cv[..CV_LIMIT]);
                s.push_str("\n…[truncated]");
            } else {
                s.push_str(cv);
            }
            s.push_str("\n</cv>\n");
        }
    }

    s.push_str("\nNow output the polished profile.md.");
    s
}
