import { invoke } from '@tauri-apps/api/core';
import type { User } from '../store';
import type { StoreAtsAnalysis } from '../store/types';
import { postAi } from './aiClient';

export interface OptimizedCvResult {
  pdfPath: string;
  texPath: string;
  compiler: string;
  texSource: string;
}

export interface CompilerAvailability {
  pdflatex: boolean;
  tectonic: boolean;
  recommended: 'pdflatex' | 'tectonic' | null;
}

export interface GenerateOptimizedCvArgs {
  cvText: string;
  jdText: string;
  analysis: StoreAtsAnalysis | null;
  user: User;
  /** Free-form notes the user can add for THIS run only (e.g. 'shorten the
   *  summary', 'drop the leadership section', 'lead with the AI experience'). */
  refinementInstructions?: string | null;
}

/** Build the LaTeX-friendly contact block fed to Claude. Includes the
 *  free-form profile.md narrative when present so Claude has rich context
 *  about the candidate (background, anecdotes, what they care about). */
export function buildProfileBlock(user: User): string {
  const contactLines: string[] = [];
  if (user.name) contactLines.push(`Name: ${user.name}`);
  if (user.email) contactLines.push(`Email: ${user.email}`);
  if (user.phone) contactLines.push(`Phone: ${user.phone}`);
  if (user.linkedin) contactLines.push(`LinkedIn: ${user.linkedin}`);
  if (user.github) contactLines.push(`GitHub: ${user.github}`);
  if (user.portfolio) contactLines.push(`Portfolio: ${user.portfolio}`);
  if (user.location) contactLines.push(`Location: ${user.location}`);
  if (user.targetRole) contactLines.push(`Target role: ${user.targetRole}`);
  if (user.targetCompany) contactLines.push(`Target company: ${user.targetCompany}`);

  const md = (user.profileMarkdown ?? '').trim();
  if (!md) return contactLines.join('\n');

  // Append the markdown narrative under a clear separator so Claude knows
  // it's softer context (anecdotes / values) vs hard contact facts above.
  return `${contactLines.join('\n')}\n\n--- Career narrative (markdown) ---\n${md}`;
}

/** Returns true when the user has provided enough contact info for a clean CV. */
export function isProfileReadyForCv(user: User): boolean {
  return Boolean(user.name && user.email && (user.phone || user.linkedin));
}

/**
 * Two-stage CV optimization:
 *
 *   1. POST /v1/ai/optimize-cv on the Worker — Claude (server-side
 *      Anthropic key) generates the .tex source. JWT-gated,
 *      rate-limited 10/day.
 *   2. invoke `compile_optimized_cv_tex` on the local Rust backend
 *      to compile the .tex to PDF using pdflatex/tectonic on the
 *      user's machine. The PDF lives in the per-app data dir.
 *
 *  The split keeps the LLM credit centralised (subscription model)
 *  while LaTeX compilation stays where the toolchain actually runs.
 */
export async function generateOptimizedCv(
  args: GenerateOptimizedCvArgs,
): Promise<OptimizedCvResult> {
  const analysisJson = JSON.stringify(args.analysis ?? {});
  const refinement = (args.refinementInstructions ?? '').trim() || null;

  // Stage 1 — server-side LLM call.
  const { tex } = await postAi<{ tex: string; remaining: number }>(
    'optimize-cv',
    {
      cvText: args.cvText,
      jdText: args.jdText,
      analysisJson,
      profileBlock: buildProfileBlock(args.user),
      refinementInstructions: refinement,
    },
  );

  // Stage 2 — local compilation (LaTeX toolchain on the user's
  // machine). The Rust command also writes the .tex alongside the
  // PDF so the user can re-edit later.
  return invoke<OptimizedCvResult>('compile_optimized_cv_tex', {
    texSource: tex,
  });
}

export async function detectLatexCompilers(): Promise<CompilerAvailability> {
  return invoke<CompilerAvailability>('detect_latex_compilers');
}
