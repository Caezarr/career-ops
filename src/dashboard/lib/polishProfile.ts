/**
 * Onboarding StepNarrative → polished profile.md
 *
 * The frontend hands Claude:
 *   - the four free-form raw answers from StepNarrative
 *   - the parsed CV text (when the user uploaded one in Step 4)
 *   - their target tracks + experience level (set in Identity /
 *     Targets / Background) — used by the prompt to tune tone
 *
 * Backend command: `polish_profile_markdown` (defined in
 * `src-tauri/src/lib.rs`). Returns plain Markdown with the four
 * stable headings the rest of the app already understands.
 *
 * Fallback strategy: when the user has no Anthropic key configured
 * yet (very common at first launch — keys are typically set after
 * onboarding from Settings → API Keys), we surface
 * `AiError::KeyMissing` from the command. The caller catches it
 * and uses the brut concat from `buildProfileMarkdown` instead.
 */
import { invoke } from "@tauri-apps/api/core";
import type { User } from "../store";
import type { NarrativeAnswers } from "../components/onboarding/StepNarrative";

export interface PolishProfileArgs {
  answers: NarrativeAnswers;
  cvText?: string | null;
  user: Pick<User, "targetTracks" | "experienceLevel">;
  anthropicKey: string;
  model?: string | null;
}

/** True if every answer is empty/whitespace — no point burning a
 *  Claude call on the equivalent of zero tokens. */
function isAllEmpty(a: NarrativeAnswers): boolean {
  return (
    !a.story.trim() &&
    !a.wins.trim() &&
    !a.lesson.trim() &&
    !a.north_star.trim()
  );
}

/** Call the `polish_profile_markdown` Tauri command. Returns the
 *  polished markdown on success, or `null` on:
 *
 *   - empty answers (no input → no output)
 *   - missing API key (AiError::KeyMissing surfaces as a string)
 *   - any other backend error (network, rate limit, malformed
 *     response) — we log + return null so the caller can fall
 *     back to the brut concat without trapping the user behind a
 *     blocking error. */
export async function polishProfileMarkdown(
  args: PolishProfileArgs,
): Promise<string | null> {
  if (isAllEmpty(args.answers)) return null;

  try {
    const result = await invoke<string>("polish_profile_markdown", {
      input: {
        story: args.answers.story,
        wins: args.answers.wins,
        lesson: args.answers.lesson,
        northStar: args.answers.north_star,
        cvText: args.cvText ?? null,
        targetTracks: args.user.targetTracks ?? null,
        experienceLevel: args.user.experienceLevel ?? null,
        anthropicKey: args.anthropicKey,
        model: args.model ?? null,
      },
    });
    const trimmed = result.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch (e) {
    // The backend returns AiError::KeyMissing when the key is
    // empty — the user just hasn't configured Anthropic yet. We
    // also catch network / 429 / 5xx here. Caller falls back to
    // the brut concat.
    // eslint-disable-next-line no-console
    console.warn("[onboarding] polish profile.md failed:", e);
    return null;
  }
}
