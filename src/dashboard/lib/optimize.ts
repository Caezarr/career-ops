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
}

/** Build the LaTeX-friendly contact block fed to Claude. Keeps secret-less. */
export function buildProfileBlock(user: User): string {
  const lines: string[] = [];
  if (user.name) lines.push(`Name: ${user.name}`);
  if (user.email) lines.push(`Email: ${user.email}`);
  if (user.phone) lines.push(`Phone: ${user.phone}`);
  if (user.linkedin) lines.push(`LinkedIn: ${user.linkedin}`);
  if (user.github) lines.push(`GitHub: ${user.github}`);
  if (user.portfolio) lines.push(`Portfolio: ${user.portfolio}`);
  if (user.location) lines.push(`Location: ${user.location}`);
  if (user.targetRole) lines.push(`Target role: ${user.targetRole}`);
  if (user.targetCompany) lines.push(`Target company: ${user.targetCompany}`);
  return lines.join('\n');
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
  return invoke<OptimizedCvResult>('generate_optimized_cv', {
    input: {
      cvText: args.cvText,
      jdText: args.jdText,
      analysisJson,
      profileBlock: buildProfileBlock(args.user),
      anthropicKey: args.anthropicKey,
      model: args.model ?? null,
    },
  });
}

export async function detectLatexCompilers(): Promise<CompilerAvailability> {
  return invoke<CompilerAvailability>('detect_latex_compilers');
}
