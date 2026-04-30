import { invoke } from '@tauri-apps/api/core';
import type { User } from '../store';
import type { StoreAtsAnalysis } from '../store/types';

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
  anthropicKey: string;
  model?: string | null;
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

/** Invoke the Rust generate_optimized_cv command. */
export async function generateOptimizedCv(
  args: GenerateOptimizedCvArgs,
): Promise<OptimizedCvResult> {
  const analysisJson = JSON.stringify(args.analysis ?? {});
  const refinement = (args.refinementInstructions ?? '').trim();
  return invoke<OptimizedCvResult>('generate_optimized_cv', {
    input: {
      cvText: args.cvText,
      jdText: args.jdText,
      analysisJson,
      profileBlock: buildProfileBlock(args.user),
      refinementInstructions: refinement || null,
      anthropicKey: args.anthropicKey,
      model: args.model ?? null,
    },
  });
}

export async function detectLatexCompilers(): Promise<CompilerAvailability> {
  return invoke<CompilerAvailability>('detect_latex_compilers');
}
