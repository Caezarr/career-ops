/**
 * Pure helpers for filtering + ranking the prep question bank.
 *
 *  Kept out of the slice so the React layer can call them on demand
 *  (in `useMemo`) and the SQLite migration can replace them with
 *  query-side filtering without touching the components.
 */

import type {
  PrepQuestionAttempt,
  PrepQuestionV2,
  QuestionFilter,
} from '../store/types';

/** Filter the bank by the active filter. Empty filter → entire bank. */
export function filterBank(
  bank: PrepQuestionV2[],
  filter: QuestionFilter,
): PrepQuestionV2[] {
  const q = filter.query?.trim().toLowerCase() ?? '';
  return bank.filter((qn) => {
    if (filter.track && qn.track !== filter.track) return false;
    if (filter.topicId && !qn.topicIds.includes(filter.topicId)) return false;
    if (filter.difficulty && qn.difficulty !== filter.difficulty) return false;
    if (filter.format && qn.format !== filter.format) return false;
    if (filter.company) {
      // Match against the question's known-at-companies, case-sensitive
      // because labels carry brand casing ("Goldman Sachs" not "goldman sachs").
      if (!qn.knownAtCompanies?.includes(filter.company)) return false;
    }
    if (q) {
      // Pre-build a haystack so we don't repeat lowercasing per-token
      // when the user types fast.
      const hay =
        qn.question.toLowerCase() +
        ' ' +
        (qn.tags?.join(' ').toLowerCase() ?? '') +
        ' ' +
        (qn.modelAnswer?.toLowerCase() ?? '');
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

const DIFFICULTY_RANK: Record<PrepQuestionV2['difficulty'], number> = {
  easy: 0,
  medium: 1,
  hard: 2,
  expert: 3,
};

/** Default sort: difficulty ascending, then most-attempted descending
 *  (so the user's frequently-practised questions surface first when
 *  they re-open the page). Pure function so the UI can chain other
 *  sorts (alphabetical, by track) without duplicating the data. */
export function rankQuestions(
  questions: PrepQuestionV2[],
  attempts: PrepQuestionAttempt[],
): PrepQuestionV2[] {
  const counts = new Map<string, number>();
  for (const a of attempts) {
    counts.set(a.questionId, (counts.get(a.questionId) ?? 0) + 1);
  }
  return [...questions].sort((a, b) => {
    const da = DIFFICULTY_RANK[a.difficulty];
    const db = DIFFICULTY_RANK[b.difficulty];
    if (da !== db) return da - db;
    const ca = counts.get(a.id) ?? 0;
    const cb = counts.get(b.id) ?? 0;
    return cb - ca;
  });
}

/** Compute per-question stats from the attempt log: count + last
 *  self-score. Used by the UI to render "practised X times · last
 *  Y/10" chips next to each question row. */
export interface QuestionStats {
  attemptCount: number;
  lastSelfScore: number | null;
  lastAttemptAt: number | null;
}

export function statsByQuestionId(
  attempts: PrepQuestionAttempt[],
): Map<string, QuestionStats> {
  const out = new Map<string, QuestionStats>();
  for (const a of attempts) {
    const prev = out.get(a.questionId);
    if (!prev) {
      out.set(a.questionId, {
        attemptCount: 1,
        lastSelfScore: a.selfScore ?? null,
        lastAttemptAt: a.recordedAt,
      });
    } else {
      const isMoreRecent =
        prev.lastAttemptAt === null || a.recordedAt > prev.lastAttemptAt;
      out.set(a.questionId, {
        attemptCount: prev.attemptCount + 1,
        // Keep the most recent score so "last Y/10" stays current.
        lastSelfScore: isMoreRecent
          ? a.selfScore ?? prev.lastSelfScore
          : prev.lastSelfScore,
        lastAttemptAt: isMoreRecent ? a.recordedAt : prev.lastAttemptAt,
      });
    }
  }
  return out;
}
