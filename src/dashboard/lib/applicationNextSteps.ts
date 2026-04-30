import { invoke } from '@tauri-apps/api/core';
import type { ApplicationStage } from '../store';

export interface GenerateNextStepsArgs {
  company: string;
  role: string;
  stage: ApplicationStage;
  /** Job description text — optional but strongly recommended for
   *  stage-specific advice. */
  jdText?: string;
  /** CV parsed text — lets Claude reference the candidate's real
   *  experience instead of inventing things. */
  cvText?: string;
  anthropicKey: string;
  model?: string | null;
}

/**
 * Ask the Rust backend to generate 3-5 actionable next-step strings
 * for an application. The backend forces structured JSON output so
 * we don't have to parse free-form prose. Returns the steps array
 * directly; the slice persists them on the application record.
 */
export async function generateApplicationNextSteps(
  args: GenerateNextStepsArgs,
): Promise<string[]> {
  return invoke<string[]>('generate_application_next_steps', {
    input: {
      company: args.company,
      role: args.role,
      stage: args.stage,
      jdText: args.jdText ?? null,
      cvText: args.cvText ?? null,
      anthropicKey: args.anthropicKey,
      model: args.model ?? null,
    },
  });
}
