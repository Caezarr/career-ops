/**
 * Heuristic CV-vs-JD match score.
 *
 * Sprint 4 (audit Reality BLOCKING #2): until this PR every ingested
 * job's `match` was hardcoded `0`, which made the "Best match" sort
 * order produce nonsense and the JobsHeader subtitle "AI-powered
 * matching" a falsifiable lie.
 *
 * This function is the **first-pass** score, run synchronously over
 * every ingested job at merge time (in `setIngestedJobs`). It is
 * intentionally cheap — just keyword overlap with stop-word removal —
 * so 5000-posting ingestion runs stay sub-100ms on the main thread.
 *
 * The expensive AI-graded score (Claude rubric over the full CV +
 * full JD) lives in the existing `analyze_cv_ats` flow and gets
 * applied **on demand** when the user clicks "Analyze match" on a
 * specific posting. That replaces this heuristic for that one job.
 *
 * Score is capped at 99 on purpose: 100 is reserved for AI rerank,
 * so the user can visually distinguish "high heuristic match" from
 * "AI confirmed great fit".
 */

const STOPWORDS = new Set([
  // The usual English suspects
  "the",
  "and",
  "with",
  "for",
  "you",
  "your",
  "our",
  "from",
  "this",
  "that",
  "have",
  "has",
  "are",
  "will",
  "what",
  "who",
  "when",
  "how",
  "why",
  "more",
  "most",
  "all",
  "any",
  "some",
  "such",
  "into",
  "than",
  "they",
  "their",
  "them",
  "these",
  "those",
  "been",
  "being",
  "were",
  "was",
  "would",
  "could",
  "should",
  "shall",
  "may",
  "might",
  "must",
  "need",
  "want",
  "about",
  "across",
  "after",
  "before",
  "during",
  "while",
  "between",
  "without",
  "within",
  "above",
  "below",
  "over",
  "under",
  "upon",
  // FR equivalents — many candidates have FR CVs / JT postings are FR
  "les",
  "des",
  "une",
  "que",
  "qui",
  "vous",
  "nous",
  "votre",
  "notre",
  "leur",
  "leurs",
  "avec",
  "sans",
  "pour",
  "dans",
  "sur",
  "sous",
  "entre",
  "parmi",
  "ainsi",
  "alors",
  "puis",
  "aussi",
  "encore",
  // Generic recruiter-speak
  "team",
  "teams",
  "work",
  "working",
  "role",
  "roles",
  "company",
  "candidate",
  "candidates",
  "experience",
  "looking",
  "join",
  "joining",
  "help",
  "helping",
  "build",
  "building",
  "able",
  "ability",
  "include",
  "including",
  "across",
  "year",
  "years",
  "month",
  "months",
  "etc",
  "well",
  "great",
  "good",
  "strong",
]);

/** Tokenise text → set of lowercased ≥4-char alphanumeric tokens
 *  with stop words removed. Memoising at the call-site is the
 *  caller's job — we keep this pure for testability. */
function tokenize(input: string): Set<string> {
  const out = new Set<string>();
  if (!input) return out;
  for (const m of input.toLowerCase().matchAll(/[a-zà-ÿ0-9+#.]+/gi)) {
    const tok = m[0];
    if (tok.length < 4) continue;
    if (STOPWORDS.has(tok)) continue;
    out.add(tok);
  }
  return out;
}

/** Compute the heuristic match score [0, 99] for one job against
 *  the user's default CV text. Returns 0 when either side is empty
 *  (graceful "no CV yet" case). */
export function computeMatchScore(args: {
  cvText: string;
  jobRole: string;
  jobDescription?: string;
}): number {
  const { cvText, jobRole, jobDescription } = args;
  if (!cvText.trim()) return 0;

  const cvTokens = tokenize(cvText);
  if (cvTokens.size === 0) return 0;

  const haystack = `${jobRole} ${jobDescription ?? ""}`;
  const jobTokens = tokenize(haystack);
  if (jobTokens.size === 0) return 0;

  let overlap = 0;
  for (const t of cvTokens) {
    if (jobTokens.has(t)) overlap++;
  }

  // Denominator: at least 15 tokens to avoid runaway scores from
  // tiny CVs (a 3-token CV fully matched would otherwise be 100%).
  const denom = Math.max(15, Math.min(cvTokens.size, 80));
  const raw = (overlap / denom) * 100;
  return Math.max(0, Math.min(99, Math.round(raw)));
}

/** Build the cvTokens set once and reuse across many jobs. The hot
 *  path in `setIngestedJobs` calls this once, then `scoreAgainstCv`
 *  for each posting. Saves ~80% of the cost on a 5000-job batch. */
export function buildCvTokens(cvText: string): Set<string> {
  return tokenize(cvText);
}

/** Same maths as `computeMatchScore` but with the CV tokens
 *  pre-computed. */
export function scoreAgainstCv(
  cvTokens: Set<string>,
  jobRole: string,
  jobDescription?: string,
): number {
  if (cvTokens.size === 0) return 0;
  const jobTokens = tokenize(`${jobRole} ${jobDescription ?? ""}`);
  if (jobTokens.size === 0) return 0;
  let overlap = 0;
  for (const t of cvTokens) {
    if (jobTokens.has(t)) overlap++;
  }
  const denom = Math.max(15, Math.min(cvTokens.size, 80));
  const raw = (overlap / denom) * 100;
  return Math.max(0, Math.min(99, Math.round(raw)));
}
