/**
 * ATS analyzer prompt + tool schema (server-side mirror of
 * `src-tauri/src/ai/prompts/ats.rs`). Keep these in sync when the
 * Rust-side prompt evolves — the desktop dev fallback still calls
 * the Rust path, so a divergent rubric would surface as different
 * scores between dev and prod.
 */

export const ATS_SYSTEM = `You are an expert ATS (Applicant Tracking System) and senior recruiter at top-tier firms (Goldman Sachs, McKinsey, BCG, Stripe, OpenAI tier).

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

Match the CV's language: French CV → French analysis, English CV → English analysis.`;

export function buildAtsUserMessage(cvText: string, jdText: string | null | undefined): string {
  const cvBlock = cvText.trim() || "(no CV text — fall back to generic feedback)";
  const jdBlock =
    jdText && jdText.trim()
      ? jdText.trim()
      : "(no job description provided — score against a top-tier baseline for this role)";
  return `<cv>\n${cvBlock}\n</cv>\n\n<job_description>\n${jdBlock}\n</job_description>\n\nScore the CV. Return your analysis through the score_cv tool.`;
}

export const ATS_TOOL_SCHEMA = {
  type: "object",
  properties: {
    atsScore: { type: "integer", minimum: 0, maximum: 100 },
    matchScore: { type: "integer", minimum: 0, maximum: 100 },
    projectedAtsScore: { type: "integer", minimum: 0, maximum: 100 },
    strengths: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 6,
    },
    weaknesses: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 6,
    },
    missingKeywords: { type: "array", items: { type: "string" } },
    suggestions: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["add", "reword", "remove"] },
          original: { type: "string" },
          suggested: { type: "string" },
          rationale: { type: "string" },
        },
        required: ["type", "original", "suggested", "rationale"],
      },
    },
  },
  required: [
    "atsScore",
    "matchScore",
    "projectedAtsScore",
    "strengths",
    "weaknesses",
    "missingKeywords",
    "suggestions",
  ],
} as const;

/** Mirror the Rust `AtsAnalysis` struct. */
export interface AtsAnalysis {
  atsScore: number;
  matchScore: number;
  projectedAtsScore: number;
  strengths: string[];
  weaknesses: string[];
  missingKeywords: string[];
  suggestions: Array<{
    type: "add" | "reword" | "remove";
    original: string;
    suggested: string;
    rationale: string;
  }>;
}
