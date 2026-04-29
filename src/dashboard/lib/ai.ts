import { invoke } from '@tauri-apps/api/core';

export interface AtsSuggestion {
  type: 'add' | 'reword' | 'remove';
  original: string;
  suggested: string;
  rationale: string;
}

export interface AtsAnalysis {
  atsScore: number;
  matchScore: number;
  strengths: string[];
  weaknesses: string[];
  missingKeywords: string[];
  suggestions: AtsSuggestion[];
}

export interface AnalyzeCvAtsArgs {
  cvId: string;
  jdText?: string | null;
  anthropicKey: string;
  model?: string | null;
}

/** Invoke the Rust `analyze_cv_ats` command. */
export async function analyzeCvAts(args: AnalyzeCvAtsArgs): Promise<AtsAnalysis> {
  return invoke<AtsAnalysis>('analyze_cv_ats', {
    cvId: args.cvId,
    jdText: args.jdText ?? null,
    anthropicKey: args.anthropicKey,
    model: args.model ?? null,
  });
}
