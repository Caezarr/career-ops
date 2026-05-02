/**
 * Map a job role string → prep `QuestionTrack`.
 *
 *  Drives the auto-tailoring behaviour on the Prep page: when the user
 *  has Qonto Senior PM in focus (War Room), Prep should open on the
 *  Product track. When it's Goldman IBD, on Finance. When it's an AI
 *  Engineer role at Anthropic, on AI (NOT generic SWE).
 *
 *  Specificity matters — "AI Engineer" must hit the AI branch BEFORE
 *  the engineering branch, otherwise the user gets ML-irrelevant
 *  LeetCode prep. We check the most specific keywords first.
 *
 *  Returns null when the role doesn't match any known family —
 *  consumers can fall back to "general" so the user still sees
 *  behavioural / motivation questions.
 */

import type { QuestionTrack, Job } from '../store';

export function roleToTrack(role: string): QuestionTrack | null {
  const r = role.toLowerCase();

  // ── AI / ML — checked FIRST so "ML Engineer" doesn't fall to SWE.
  if (
    /(\bai\b|\bml\b|machine learning|deep learning|\bllm\b|nlp|computer vision|research scientist|applied scientist|ml engineer|ai engineer|prompt engineer)/i.test(
      r,
    )
  ) {
    return 'ai';
  }

  // ── Banking + Finance — Banking-specific terms first so "Investment
  //     Banking Analyst" lands here and not in a generic finance bucket.
  if (
    /(\bibd\b|investment bank|m&a|leverag|debt capital|equity capital|\bbanker?\b|\bbanque\b|\bpe\b|private equity|venture capital|\bvc\b|finance|trading|asset manag|wealth|hedge fund|tr[ée]sorerie|\bquant\b)/i.test(
      r,
    )
  ) {
    return 'finance';
  }

  // ── Consulting — strategy firms named explicitly so "Bain
  //     Consultant" doesn't fall to SWE / Product.
  if (
    /(consult|conseil|advisor|advisory|\bbcg\b|\bmckinsey\b|\bbain\b|kearney|oliver wyman|roland berger|strategy|strat[ée]gie|chief of staff)/i.test(
      r,
    )
  ) {
    return 'consulting';
  }

  // ── Product
  if (
    /(\bpm\b|product manager|product owner|\bpo\b|product designer|product marketing)/i.test(
      r,
    )
  ) {
    return 'product';
  }

  // ── Data — checked before SWE because "Data Engineer" should land
  //     in Data, not Engineering.
  if (
    /(\bdata\b|analyst|analytics|business intelligence|\bbi\b|sql developer)/i.test(
      r,
    )
  ) {
    return 'data';
  }

  // ── SWE
  if (
    /(engineer|developer|software|\bswe\b|backend|frontend|fullstack|d[ée]veloppeur|infra|sre|devops|architect|systems engineer)/i.test(
      r,
    )
  ) {
    return 'swe';
  }

  // ── Design
  if (/(\bdesign\b|\bux\b|\bui\b|brand designer|graphic|illustrat)/i.test(r)) {
    return 'design';
  }

  return null;
}

/**
 * Resolve which job the prep page should tailor to. Order:
 *   1. War Room focus (`workspaceJobId`)
 *   2. Selected job on the Jobs page (`selectedJobId`)
 *   3. Most-recent application's job (jobId)
 *
 *  Returns null when no candidacy is in progress — Prep falls back
 *  to "all tracks" / general behavioural mix.
 */
export function resolveFocusedJob(input: {
  jobs: Job[];
  workspaceJobId: string | null;
  selectedJobId: string | null;
  applicationsByRecency: { jobId: string }[];
}): { job: Job; source: 'workspace' | 'selected' | 'application' } | null {
  const { jobs, workspaceJobId, selectedJobId, applicationsByRecency } = input;
  if (workspaceJobId) {
    const j = jobs.find((x) => x.id === workspaceJobId);
    if (j) return { job: j, source: 'workspace' };
  }
  if (selectedJobId) {
    const j = jobs.find((x) => x.id === selectedJobId);
    if (j) return { job: j, source: 'selected' };
  }
  for (const app of applicationsByRecency) {
    const j = jobs.find((x) => x.id === app.jobId);
    if (j) return { job: j, source: 'application' };
  }
  return null;
}
