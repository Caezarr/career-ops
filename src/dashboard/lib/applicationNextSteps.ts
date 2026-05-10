import type { ApplicationStage } from '../store';
import { postAi } from './aiClient';

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
}

/**
 * Generate 3-5 actionable next-step strings for an application via
 * the Career OS Worker (server-managed Anthropic key, JWT-gated,
 * rate-limited 30/day per user). Returns the steps array directly;
 * the slice persists them on the application record.
 */
export async function generateApplicationNextSteps(
  args: GenerateNextStepsArgs,
): Promise<string[]> {
  const { steps } = await postAi<{ steps: string[]; remaining: number }>(
    'next-steps',
    {
      company: args.company,
      role: args.role,
      stage: args.stage,
      jdText: args.jdText ?? null,
      cvText: args.cvText ?? null,
    },
  );
  return steps;
}
