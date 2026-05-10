/**
 * Server-managed AI endpoints.
 *
 * The Career OS subscription model is "150€ flat, we host the
 * upstream credit" — users don't bring their own keys. Every
 * route here:
 *   1. Requires a valid magic-link JWT (Bearer auth)
 *   2. Bumps a per-user-per-day counter against `ai_usage`,
 *      rejects with 429 once the daily cap is reached
 *   3. Calls Anthropic with the server-side key
 *
 * First endpoint: `/v1/ai/polish-profile` — the onboarding
 * StepNarrative answers → structured profile.md.
 */
import { Hono } from "hono";
import { requireAuth, type AuthVars } from "../middleware/requireAuth";
import { askCompletion, AnthropicError } from "../lib/anthropic";
import { checkAndBumpAiUsage, RATE_LIMITS } from "../lib/rateLimit";
import type { Env } from "../types";

export const aiRoutes = new Hono<{ Bindings: Env; Variables: AuthVars }>();

aiRoutes.use("*", requireAuth);

// ── /v1/ai/polish-profile ────────────────────────────────────────────

const PROFILE_SYSTEM = `You are an elite career coach helping a candidate craft their profile.md — a short, dense, first-person narrative used by an AI assistant to write tailored CVs and brief them before interviews.

Output a clean Markdown document with exactly these four sections (omit a section only when the user gave no usable raw input for it):

# Quick story
2-3 punchy sentences. Who they are, what they optimise for, what they're aiming at. First-person voice. No fluff ("passionate", "results-driven", etc.).

# Highlights
3-5 bulleted achievements. Each bullet must:
- be quantified when the source mentions numbers (preserve them, never invent)
- name the firm / context
- read like a bullet on a top-tier CV (action verb, scope, outcome)

# Anecdotes & lessons
2-3 bulleted micro-stories. Each one ~2 sentences: situation + lesson. These will be drawn on for behavioural interview answers, so they should be specific and memorable, not platitudes.

# What I'm looking for next
2-3 bulleted criteria the user actually cares about (industry, team archetype, geography, mission). Be concrete — "a VP who mentors" beats "good leadership".

Hard rules:
- Same language as the user's raw input (FR raw → FR output, EN raw → EN output, never mix)
- First-person throughout ("I", "je")
- No emoji, no markdown bold inside bullets, no horizontal rules
- Never invent facts. If the raw input is too thin for a section, omit it rather than fabricate.
- Output ONLY the markdown body — no preamble, no "Here is your profile:", no code fences.
`;

interface PolishProfileBody {
  story?: string;
  wins?: string;
  lesson?: string;
  northStar?: string;
  cvText?: string | null;
  targetTracks?: string[] | null;
  experienceLevel?: string | null;
}

function buildUserMessage(b: PolishProfileBody): string {
  const story = (b.story ?? "").trim();
  const wins = (b.wins ?? "").trim();
  const lesson = (b.lesson ?? "").trim();
  const northStar = (b.northStar ?? "").trim();

  let s = "Raw inputs from the user (verbatim, in their language):\n\n";
  s += `<answer key="story">\n${story}\n</answer>\n\n`;
  s += `<answer key="wins">\n${wins}\n</answer>\n\n`;
  s += `<answer key="lesson">\n${lesson}\n</answer>\n\n`;
  s += `<answer key="north_star">\n${northStar}\n</answer>\n\n`;

  if (b.targetTracks && b.targetTracks.length > 0) {
    s += `Tracks they're targeting: ${b.targetTracks.join(", ")}\n`;
  }
  if (b.experienceLevel) {
    s += `Experience level: ${b.experienceLevel}\n`;
  }
  if (b.cvText && b.cvText.trim()) {
    // Cap CV text — long CVs blow the context budget for marginal gain.
    const cv = b.cvText.trim();
    const CV_LIMIT = 6000;
    s += "\nParsed CV text — use it to ground the Highlights bullets in real numbers / firm names. Do not copy entire bullets, summarise:\n\n";
    s += "<cv>\n";
    s += cv.length > CV_LIMIT ? cv.slice(0, CV_LIMIT) + "\n…[truncated]" : cv;
    s += "\n</cv>\n";
  }
  s += "\nNow output the polished profile.md.";
  return s;
}

aiRoutes.post("/polish-profile", async (c) => {
  const auth = c.get("auth");
  const body = (await c.req.json().catch(() => ({}))) as PolishProfileBody;

  // Empty inputs — short-circuit so we don't burn quota / Anthropic.
  const anyInput =
    Boolean(body.story?.trim()) ||
    Boolean(body.wins?.trim()) ||
    Boolean(body.lesson?.trim()) ||
    Boolean(body.northStar?.trim());
  if (!anyInput) return c.json({ markdown: "" });

  // Daily rate limit (per user). Bumps the counter atomically.
  const limit = await checkAndBumpAiUsage(
    c.env.DB,
    auth.sub,
    RATE_LIMITS.polishProfile,
  );
  if (!limit.allowed) {
    c.header("Retry-After", String(limit.resetAt - Math.floor(Date.now() / 1000)));
    return c.json(
      {
        error: "rate_limited",
        message: "Tu as atteint la limite quotidienne pour cette fonctionnalité. Réessaye demain.",
        resetAt: limit.resetAt,
      },
      429,
    );
  }

  try {
    const md = await askCompletion({
      apiKey: c.env.ANTHROPIC_API_KEY,
      // Tuned for prose-style polish — claude-3-5-haiku is plenty.
      model: "claude-3-5-haiku-latest",
      system: PROFILE_SYSTEM,
      user: buildUserMessage(body),
      maxTokens: 1500,
    });
    return c.json({ markdown: md.trim(), remaining: limit.remaining });
  } catch (e) {
    if (e instanceof AnthropicError) {
      console.error(`polish-profile: anthropic ${e.status} for user=${auth.sub}`);
      // 401/403 from Anthropic = our own key is bad; surface 502.
      return c.json(
        { error: "upstream_failed", message: "Le service de génération est indisponible. Réessaye plus tard." },
        502,
      );
    }
    console.error("polish-profile: unexpected", e);
    return c.json({ error: "internal" }, 500);
  }
});
