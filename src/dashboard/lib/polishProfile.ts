/**
 * Onboarding StepNarrative → polished profile.md
 *
 * Server-managed (Sprint 6 final): the call goes through the
 * Career OS Worker, NOT directly to Anthropic, NOT to a
 * user-provided key. The whole subscription model is "150€ flat,
 * we host the upstream credit". So the only auth the frontend
 * needs is the magic-link JWT in the Keychain.
 *
 * Worker endpoint:  POST /v1/ai/polish-profile
 * Auth:             Bearer JWT (from `secret.auth_jwt`)
 * Rate limit:       5 / day / user (server-side, returns 429)
 * Body:             { story, wins, lesson, northStar, cvText?,
 *                     targetTracks?, experienceLevel? }
 * Response 200:     { markdown, remaining }
 * Response 401:     not signed in / stale JWT
 * Response 429:     daily quota exhausted
 * Response 5xx:     upstream Anthropic / Worker failure
 *
 * Fallback strategy: when the JWT is missing (user didn't sign
 * in during onboarding), or any non-200 response surfaces, we
 * return null. The caller (Onboarding.finish) falls back to the
 * brut concat from `buildProfileMarkdown` so the user still
 * leaves with *some* profile.md.
 */
import type { User } from "../store";
import type { NarrativeAnswers } from "../components/onboarding/StepNarrative";
import { API_BASE_URL, readJwt } from "./auth";

export interface PolishProfileArgs {
  answers: NarrativeAnswers;
  cvText?: string | null;
  user: Pick<User, "targetTracks" | "experienceLevel">;
}

/** True if every answer is empty/whitespace — no point hitting
 *  the network on the equivalent of zero tokens. */
function isAllEmpty(a: NarrativeAnswers): boolean {
  return (
    !a.story.trim() &&
    !a.wins.trim() &&
    !a.lesson.trim() &&
    !a.north_star.trim()
  );
}

/**
 * Call the Worker's `/v1/ai/polish-profile` route. Returns the
 * polished markdown on 200, or `null` on:
 *
 *   - empty inputs (short-circuit, no network)
 *   - missing JWT (user not signed in yet)
 *   - non-200 responses (rate limit, upstream failure, network)
 *
 * Errors are logged via console.warn so dev mode catches them
 * without trapping the user behind a blocking error — onboarding
 * always completes, profile.md just degrades to brut concat.
 */
export async function polishProfileMarkdown(
  args: PolishProfileArgs,
): Promise<string | null> {
  // Short-circuit only when BOTH user answers AND CV are empty —
  // a user who skipped the narrative but uploaded a CV still
  // wants Claude to draft a profile.md from the CV alone.
  if (isAllEmpty(args.answers) && !args.cvText?.trim()) return null;

  const jwt = await readJwt();
  if (!jwt) {
    // User skipped sign-in during onboarding (or auth flow
    // hasn't completed). Fallback to brut concat downstream.
    return null;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/v1/ai/polish-profile`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        story: args.answers.story,
        wins: args.answers.wins,
        lesson: args.answers.lesson,
        northStar: args.answers.north_star,
        cvText: args.cvText ?? null,
        targetTracks: args.user.targetTracks ?? null,
        experienceLevel: args.user.experienceLevel ?? null,
      }),
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[onboarding] polish profile.md network failed:", e);
    return null;
  }

  if (!res.ok) {
    // 401 = stale JWT, 429 = quota exhausted, 502 = Anthropic down,
    // 500 = our bug. Always degrade gracefully — user gets brut
    // markdown as fallback. Log so dev mode catches the cause.
    // eslint-disable-next-line no-console
    console.warn(
      `[onboarding] polish profile.md returned ${res.status} (${res.statusText})`,
    );
    return null;
  }

  try {
    const json = (await res.json()) as { markdown?: string };
    const md = (json.markdown ?? "").trim();
    return md.length > 0 ? md : null;
  } catch {
    return null;
  }
}
