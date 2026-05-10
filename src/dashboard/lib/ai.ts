import { invoke } from '@tauri-apps/api/core';
import { postAi } from './aiClient';

export interface AtsSuggestion {
  type: 'add' | 'reword' | 'remove';
  original: string;
  suggested: string;
  rationale: string;
}

export interface AtsAnalysis {
  atsScore: number;
  matchScore: number;
  /** ATS score AFTER applying all suggestions (Claude's projection). */
  projectedAtsScore: number;
  strengths: string[];
  weaknesses: string[];
  missingKeywords: string[];
  suggestions: AtsSuggestion[];
}

export interface AnalyzeCvAtsArgs {
  /** Either cvId (DB lookup) OR cvText. When cvId is set we resolve
   *  the parsedText locally (avoids re-uploading bulk CV blobs to
   *  the worker on every call). */
  cvId?: string | null;
  cvText?: string | null;
  jdText?: string | null;
}

/**
 * Analyze a CV against a JD via the Career OS Worker
 * (server-managed Anthropic key). Subscription model: no BYOK.
 *
 * If only `cvId` is supplied we fetch the parsed text via the
 * existing Rust command, then send to the worker — keeps the wire
 * payload small.
 */
export async function analyzeCvAts(args: AnalyzeCvAtsArgs): Promise<AtsAnalysis> {
  let cvText = args.cvText ?? null;
  if (!cvText && args.cvId) {
    // Pull parsedText from local DB so we send it to the worker
    // ourselves; saves a DB lookup hop server-side.
    try {
      const cv = await invoke<{ parsedText?: string | null }>('db_get_cv', {
        id: args.cvId,
      });
      cvText = cv?.parsedText ?? null;
    } catch {
      /* fall through — the worker will reject empty cvText */
    }
  }

  const { analysis } = await postAi<{ analysis: AtsAnalysis; remaining: number }>(
    'analyze-cv-ats',
    {
      cvText: cvText ?? '',
      jdText: args.jdText ?? null,
    },
  );

  // Best-effort: cache the score locally on the CV row. Failure
  // is silent — the analysis already reached the user.
  if (args.cvId && typeof analysis.atsScore === 'number') {
    try {
      await invoke('db_update_cv', {
        input: { id: args.cvId, atsScore: analysis.atsScore },
      });
    } catch {
      /* leave it */
    }
  }

  return analysis;
}
