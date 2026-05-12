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
import { askCompletion, askStructured, AnthropicError } from "../lib/anthropic";
import { checkAndBumpAiUsage, RATE_LIMITS } from "../lib/rateLimit";
import {
  ATS_SYSTEM,
  ATS_TOOL_SCHEMA,
  buildAtsUserMessage,
  type AtsAnalysis,
} from "../lib/prompts/ats";
import {
  NEXT_STEPS_SYSTEM,
  NEXT_STEPS_TOOL_SCHEMA,
  buildNextStepsUserMessage,
  type NextStepsResponse,
} from "../lib/prompts/nextSteps";
import {
  OPTIMIZE_SYSTEM,
  buildOptimizeUserMessage,
} from "../lib/prompts/optimize";
import type { Env } from "../types";

export const aiRoutes = new Hono<{ Bindings: Env; Variables: AuthVars }>();

aiRoutes.use("*", requireAuth);

// ── /v1/ai/polish-profile ────────────────────────────────────────────

const PROFILE_SYSTEM = `You are an elite career coach helping a candidate craft their profile.md — a short, dense, first-person narrative used by an AI assistant to write tailored CVs and brief them before interviews.

You receive TWO sources:
1. The user's free-form answers to four reflective questions
   (story / wins / lesson / north_star)
2. The parsed text of their uploaded CV (when present)

USE BOTH SOURCES. The CV is not just background — it's authoritative
data about employers, roles, dates, metrics. Mine it.

Output a clean Markdown document with these four sections. Omit a
section ONLY if neither the user's answers NOR the CV give you
material for it.

# Quick story
2-3 punchy sentences. Who they are, what they optimise for, what
they're aiming at. Lean on the CV for: current/last role, total
years of experience, latest firm, primary domain (tech / consulting
/ finance / etc.). Lean on the user's <answer key="story"> for
voice, ambition, target.

# Highlights
3-5 bulleted achievements drawn from BOTH sources:
- The user's <answer key="wins"> when present (use their phrasing)
- The CV's quantified bullets (preserve exact numbers, firm names,
  scope) when the user's answer is thin or missing
- Combine: if the user mentions a project that's also in the CV,
  fold the CV's metrics into the user's narrative
Each bullet:
- quantifies with real numbers from the CV (never invent)
- names the firm / context
- reads like a bullet on a top-tier CV (action verb, scope, outcome)

# Anecdotes & lessons
2-3 bulleted micro-stories. Primarily from <answer key="lesson">.
The CV may anchor the situation (e.g. "At Stripe, I…") but the
lesson part should come from the user's own reflection. If the user
left this empty AND the CV has no obvious story-shaped material,
omit the section.

# What I'm looking for next
2-3 bulleted criteria. Primarily from <answer key="north_star">.
The CV's tracks / target_tracks / experience_level fields can help
you frame the level (e.g. "a Senior PM seat at a Series B+ startup")
but never invent specific company / industry preferences the user
hasn't expressed.

Hard rules:
- Same language as the user's raw input (FR raw → FR output, EN raw
  → EN output, never mix). When both answers and CV are present,
  match the user's answers' language.
- First-person throughout ("I", "je")
- No emoji, no markdown bold inside bullets, no horizontal rules
- Never invent facts. The CV is your authoritative source — preserve
  numbers, firm names, dates exactly. If neither source covers a
  section, omit it rather than fabricate.
- Output ONLY the markdown body — no preamble, no "Here is your
  profile:", no code fences.
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
  // CV alone is sufficient input: a user who uploaded a CV but
  // skipped the narrative prompts still wants a profile.md drafted
  // from the CV. Only short-circuit when ALL sources are empty.
  const anyInput =
    Boolean(body.story?.trim()) ||
    Boolean(body.wins?.trim()) ||
    Boolean(body.lesson?.trim()) ||
    Boolean(body.northStar?.trim()) ||
    Boolean(body.cvText?.trim());
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
      // Tuned for prose-style polish — Haiku 4.5 is plenty for this
      // task and 5-6× cheaper than Sonnet. The legacy 3-5 alias was
      // retired by Anthropic so we bumped to the 4.5 generation.
      model: "claude-haiku-4-5",
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

// ── /v1/ai/analyze-cv-ats ─────────────────────────────────────────────
//
// CV vs JD scoring (the ATS analyzer used by the CV page + Workspace).
// Tool-use response — Claude calls `score_cv` with a structured
// payload that mirrors `AtsAnalysis` on the client.

interface AnalyzeCvAtsBody {
  cvText?: string | null;
  jdText?: string | null;
}

aiRoutes.post("/analyze-cv-ats", async (c) => {
  const auth = c.get("auth");
  const body = (await c.req.json().catch(() => ({}))) as AnalyzeCvAtsBody;

  const cvText = (body.cvText ?? "").trim();
  if (!cvText) {
    return c.json({ error: "cv_empty", message: "Aucun texte de CV fourni." }, 400);
  }

  const limit = await checkAndBumpAiUsage(
    c.env.DB,
    auth.sub,
    RATE_LIMITS.analyzeCvAts,
  );
  if (!limit.allowed) {
    c.header("Retry-After", String(limit.resetAt - Math.floor(Date.now() / 1000)));
    return c.json(
      {
        error: "rate_limited",
        message: "Limite quotidienne atteinte pour l'analyse ATS. Réessaye demain.",
        resetAt: limit.resetAt,
      },
      429,
    );
  }

  try {
    const analysis = await askStructured<AtsAnalysis>({
      apiKey: c.env.ANTHROPIC_API_KEY,
      // sonnet for ATS — it's the highest-stakes scoring path
      // (drives the CV variant ranking + the user's prep loop).
      // Haiku undercounts subtle JD vocabulary mismatches.
      model: "claude-sonnet-4-5",
      system: ATS_SYSTEM,
      user: buildAtsUserMessage(cvText, body.jdText ?? null),
      toolName: "score_cv",
      toolDescription:
        "Score the CV against the job description and return a structured analysis.",
      toolSchema: ATS_TOOL_SCHEMA as unknown as Record<string, unknown>,
      maxTokens: 2000,
    });
    return c.json({ analysis, remaining: limit.remaining });
  } catch (e) {
    if (e instanceof AnthropicError) {
      console.error(`analyze-cv-ats: anthropic ${e.status} for user=${auth.sub}`);
      return c.json(
        { error: "upstream_failed", message: "L'analyse ATS est indisponible. Réessaye plus tard." },
        502,
      );
    }
    console.error("analyze-cv-ats: unexpected", e);
    return c.json({ error: "internal" }, 500);
  }
});

// ── /v1/ai/next-steps ─────────────────────────────────────────────────
//
// Generates 3-5 concrete next-step actions for an Application based
// on its current stage + JD + CV. Tool-use response.

interface NextStepsBody {
  company?: string;
  role?: string;
  stage?: string;
  jdText?: string | null;
  cvText?: string | null;
}

aiRoutes.post("/next-steps", async (c) => {
  const auth = c.get("auth");
  const body = (await c.req.json().catch(() => ({}))) as NextStepsBody;

  const company = (body.company ?? "").trim();
  const role = (body.role ?? "").trim();
  const stage = (body.stage ?? "").trim();
  if (!company || !role || !stage) {
    return c.json(
      { error: "missing_application_context", message: "company / role / stage requis." },
      400,
    );
  }

  const limit = await checkAndBumpAiUsage(
    c.env.DB,
    auth.sub,
    RATE_LIMITS.nextSteps,
  );
  if (!limit.allowed) {
    c.header("Retry-After", String(limit.resetAt - Math.floor(Date.now() / 1000)));
    return c.json(
      {
        error: "rate_limited",
        message: "Limite quotidienne atteinte pour les next steps. Réessaye demain.",
        resetAt: limit.resetAt,
      },
      429,
    );
  }

  try {
    const result = await askStructured<NextStepsResponse>({
      apiKey: c.env.ANTHROPIC_API_KEY,
      // Haiku is enough — short structured output, simple reasoning.
      model: "claude-haiku-4-5",
      system: NEXT_STEPS_SYSTEM,
      user: buildNextStepsUserMessage(
        company,
        role,
        stage,
        body.jdText ?? null,
        body.cvText ?? null,
      ),
      toolName: "next_steps",
      toolDescription:
        "Return 3-5 concrete next-step actions tailored to this application.",
      toolSchema: NEXT_STEPS_TOOL_SCHEMA as unknown as Record<string, unknown>,
      maxTokens: 1000,
    });
    return c.json({ steps: result.steps, remaining: limit.remaining });
  } catch (e) {
    if (e instanceof AnthropicError) {
      console.error(`next-steps: anthropic ${e.status} for user=${auth.sub}`);
      return c.json(
        { error: "upstream_failed", message: "Génération des next steps indisponible. Réessaye plus tard." },
        502,
      );
    }
    console.error("next-steps: unexpected", e);
    return c.json({ error: "internal" }, 500);
  }
});

// ── /v1/ai/optimize-cv ────────────────────────────────────────────────
//
// Generate a JD-tailored .tex file. Heavier than the other endpoints
// (full LaTeX template embedded in the prompt + sonnet model), so
// the rate limit is tighter (10/day). Output is plain text — the
// desktop client compiles to PDF locally via the LaTeX toolchain.

interface OptimizeCvBody {
  cvText?: string;
  jdText?: string;
  /** Stringified ATS analysis from a prior /v1/ai/analyze-cv-ats
   *  call. Optional but improves output quality. */
  analysisJson?: string | null;
  /** Pre-formatted contact + profile narrative block built by the
   *  desktop client (`buildProfileBlock`). Empty fields omitted. */
  profileBlock?: string;
  /** "Customize this run" notes from the user. Optional. */
  refinementInstructions?: string | null;
}

aiRoutes.post("/optimize-cv", async (c) => {
  const auth = c.get("auth");
  const body = (await c.req.json().catch(() => ({}))) as OptimizeCvBody;

  const cvText = (body.cvText ?? "").trim();
  const jdText = (body.jdText ?? "").trim();
  const profileBlock = (body.profileBlock ?? "").trim();
  if (!cvText || !jdText) {
    return c.json(
      { error: "missing_input", message: "cvText et jdText requis." },
      400,
    );
  }

  const limit = await checkAndBumpAiUsage(
    c.env.DB,
    auth.sub,
    RATE_LIMITS.optimizeCv,
  );
  if (!limit.allowed) {
    c.header("Retry-After", String(limit.resetAt - Math.floor(Date.now() / 1000)));
    return c.json(
      {
        error: "rate_limited",
        message: "Limite quotidienne atteinte pour l'optimisation CV. Réessaye demain.",
        resetAt: limit.resetAt,
      },
      429,
    );
  }

  try {
    const tex = await askCompletion({
      apiKey: c.env.ANTHROPIC_API_KEY,
      // sonnet — LaTeX writing + JD-aware reformulation. Haiku
      // produces shaky LaTeX that fails to compile ~20% of the time.
      model: "claude-sonnet-4-5",
      system: OPTIMIZE_SYSTEM,
      user: buildOptimizeUserMessage({
        cvText,
        jdText,
        analysisJson: body.analysisJson ?? null,
        profileBlock,
        refinementInstructions: body.refinementInstructions ?? null,
      }),
      maxTokens: 4000,
    });
    return c.json({ tex: tex.trim(), remaining: limit.remaining });
  } catch (e) {
    if (e instanceof AnthropicError) {
      console.error(`optimize-cv: anthropic ${e.status} for user=${auth.sub}`);
      return c.json(
        { error: "upstream_failed", message: "L'optimisation CV est indisponible. Réessaye plus tard." },
        502,
      );
    }
    console.error("optimize-cv: unexpected", e);
    return c.json({ error: "internal" }, 500);
  }
});
