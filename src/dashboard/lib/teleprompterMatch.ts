/**
 * Phase 4b — teleprompter cursor matcher.
 *
 * Banded Levenshtein matching of the candidate's spoken-word stream
 * (transcribed by AssemblyAI on the mic) against the script words
 * rendered by the teleprompter. Returns the index the cursor should
 * advance to — or `null` if no confident match was found.
 *
 * The matcher is **pure**: takes inputs, returns a number. No DOM
 * access, no side effects. Trivially unit-testable.
 *
 * ## Why banded?
 *
 * Naive substring matching breaks the moment the candidate paraphrases
 * (drops a filler word, swaps a synonym, mispronounces a name).
 * Levenshtein on word tokens handles that — but global Levenshtein
 * across the full script is O(N²) where N is the answer length, and
 * we'd also get false positives matching against words the candidate
 * said 5 paragraphs ago. Banding to a small window around the current
 * cursor keeps it cheap AND grounded: we only match forward against
 * what should come next, with a small backwards tolerance so the
 * cursor can self-correct if it overshot by one word.
 *
 * ## Algorithm
 *
 * 1. Take the last 3-5 words the candidate said (the "needle").
 * 2. Build a sliding window of equal length over the script, between
 *    `currentCursor - 2` and `currentCursor + windowSize`.
 * 3. For each candidate window, compute the token-level Levenshtein
 *    distance against the needle.
 * 4. Pick the window with the lowest distance, subject to a
 *    confidence threshold (`distance ≤ 0.4 * needle.length`).
 * 5. Return the END of the matched window (cursor advances to one
 *    past the matched span). Return `null` if no candidate cleared
 *    the threshold.
 *
 * Languages: works on lowercased, punctuation-stripped tokens. No
 * stemming / phonetic algorithms — basic Levenshtein on raw tokens
 * handles French AND English well enough at this granularity (we're
 * matching whole words, not phonemes).
 */

// Tuning constants — bumped after real-call testing showed the
// cursor lagging behind the candidate's actual speech ("I finish
// phrases before the prompter can continue"). The original values
// were conservative against false matches; field experience says
// the candidate's pace is the bigger risk.
const DEFAULT_NEEDLE_TAIL = 5;
const DEFAULT_BACK_TOLERANCE = 2;
const CONFIDENCE_THRESHOLD = 0.5;
/** When a match lands, advance the cursor a small step BEYOND the
 *  matched window. Compensates for the ~500 ms AAI streaming
 *  latency between the candidate speaking a word and that word
 *  showing up in the spoken tokens we match against. Empirically:
 *  the candidate is already 1-2 words ahead of where we're matching. */
const SPECULATIVE_LOOKAHEAD = 1;

/**
 * Normalise a single token: lowercase + strip everything that isn't
 * a letter / digit / apostrophe (Unicode-aware so "déjà" stays "déjà"
 * rather than collapsing to "dj"). Whitespace is stripped along with
 * the rest — callers tokenise first.
 */
export function normaliseToken(token: string): string {
  return token.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');
}

/**
 * Tokenise a chunk of text into normalised, lowercase, punctuation-
 * stripped word tokens. Empty entries are dropped. Used on BOTH the
 * spoken stream (from the AAI user-transcript event) and the script
 * (from the teleprompter answer text) so the matcher operates on the
 * same vocabulary on both sides.
 */
export function tokeniseSpoken(text: string): string[] {
  if (!text) return [];
  return text
    .split(/\s+/)
    .map((t) => normaliseToken(t))
    .filter((t) => t.length > 0);
}

/**
 * Token-level Levenshtein distance. Operates on arrays of strings;
 * comparison is `===` between tokens (the inputs are expected to be
 * pre-normalised — see `normaliseToken`).
 *
 * Uses the standard two-row dynamic-programming approach to stay
 * O(a.length × b.length) in time AND O(min(a, b)) in memory. With
 * needle lengths capped at ~5 and window sizes capped at ~10 this is
 * trivially cheap (< 50 ops per match call).
 */
export function tokenLevenshtein(a: string[], b: string[]): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  // Pick the shorter array as the "inner" dimension to minimise memory.
  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1, // insertion
        prev[j] + 1, // deletion
        prev[j - 1] + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

export interface MatchOptions {
  /** How many words ahead of the current cursor to consider. Default 5. */
  windowSize?: number;
  /** How far backwards from the current cursor to allow a match (the
   *  cursor can correct one or two word over-shoots without sliding
   *  back to the start). Default 2. */
  backTolerance?: number;
  /** How many of the candidate's most-recent spoken words to use as
   *  the needle. Default 4 — long enough to be unique, short enough
   *  that a single repeated word doesn't anchor the match. */
  needleTail?: number;
  /** Maximum (distance / needle.length) for a window to count as a
   *  match. Default 0.4 (allows ~one edit per 2-3 words). */
  threshold?: number;
}

/**
 * Match the candidate's spoken words against the teleprompter script
 * and return the cursor position they should advance to. Returns
 * `null` when no candidate window clears the confidence threshold —
 * callers should leave the cursor where it is and let the timer
 * fallback handle the next tick.
 *
 * @param spoken Recent spoken tokens (already normalised — pass the
 *   output of `tokeniseSpoken` on the latest partial / final user
 *   transcript). The matcher only uses the trailing `needleTail`
 *   entries.
 * @param script The teleprompter's full script tokens (normalised the
 *   same way). Caller derives these once per text change.
 * @param currentCursor The cursor's current position (= the index of
 *   the next unspoken word in the script). The window is built
 *   around it.
 * @param options Tunables — see `MatchOptions`.
 */
export function matchSpokenToScript(
  spoken: string[],
  script: string[],
  currentCursor: number,
  options: MatchOptions = {},
): number | null {
  const windowSize = options.windowSize ?? 5;
  const backTolerance = options.backTolerance ?? DEFAULT_BACK_TOLERANCE;
  const needleTail = options.needleTail ?? DEFAULT_NEEDLE_TAIL;
  const threshold = options.threshold ?? CONFIDENCE_THRESHOLD;

  if (script.length === 0) return null;
  if (spoken.length === 0) return null;

  // Build the needle from the tail of the spoken stream. We use the
  // last N words because earlier words from the same partial / final
  // are likely to have already moved the cursor forward on previous
  // ticks — re-matching them risks false anchors at older positions.
  const needle = spoken.slice(-needleTail);
  if (needle.length === 0) return null;

  // Search range. Clamp to valid script indices.
  const lo = Math.max(0, currentCursor - backTolerance);
  const hi = Math.min(script.length, currentCursor + windowSize);
  if (hi - lo < needle.length) {
    // Not enough script left to fit even the needle window — happens
    // at end-of-answer. Bail without advancing.
    return null;
  }

  let bestDistance = Number.POSITIVE_INFINITY;
  let bestEnd: number | null = null;

  // Slide a window of `needle.length` across [lo, hi - needle.length].
  // The end-of-window index is what the cursor will jump to on a win.
  const lastStart = hi - needle.length;
  for (let start = lo; start <= lastStart; start += 1) {
    const candidate = script.slice(start, start + needle.length);
    const d = tokenLevenshtein(needle, candidate);
    if (d < bestDistance) {
      bestDistance = d;
      bestEnd = start + needle.length;
    }
    // Exact match — can't do better; bail early.
    if (d === 0) break;
  }

  if (bestEnd === null) return null;
  // Threshold scales with needle length so a 3-word needle requires
  // tighter agreement than a 5-word one (3 * 0.5 = 1.5 edit budget vs
  // 5 * 0.5 = 2.5). Math.floor keeps the budget integer-comparable.
  const maxAllowed = Math.floor(needle.length * threshold);
  if (bestDistance > maxAllowed) return null;
  // Speculative lookahead — the candidate has already moved ahead of
  // the words we just matched (AAI streaming latency is ~500 ms). If
  // we land the cursor exactly at the matched end, it stays one or
  // two words behind real speech the whole session. Clamp to the
  // script tail so we never overshoot the end of the answer.
  return Math.min(script.length, bestEnd + SPECULATIVE_LOOKAHEAD);
}
