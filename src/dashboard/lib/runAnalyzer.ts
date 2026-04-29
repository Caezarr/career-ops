import { useAppStore } from '../store';
import { getCvParsedText } from '../store/slices/cvs';
import { analyzeCvAts } from './ai';
import { readAnthropicKey, readClaudeModel } from '../hooks/useAnthropicKey';

const JD_SNIPPET_LEN = 200;

export interface RunAnalyzerInput {
  /** CV ids to score against the JD. Order is preserved. */
  cvIds: string[];
  jdText: string;
  /** When true, force a fresh API call even if the same JD already cached. */
  force?: boolean;
}

export interface RunAnalyzerResult {
  completed: number;
  cached: number;
  failed: number;
  bestCvId?: string;
}

/**
 * Run the multi-CV ATS comparison decoupled from React lifecycle.
 *
 * Reads + writes directly to the global Zustand store, so the run keeps
 * progressing even when the user navigates away from the ATS Analyzer
 * tab. State (analyzerRunning, analyzerProgress, atsByCv) updates are
 * picked up automatically by any subscribed component when the user
 * navigates back.
 *
 * Refuses to start if a run is already in progress (single-flight).
 */
export async function runAnalyzer(input: RunAnalyzerInput): Promise<RunAnalyzerResult | null> {
  const state = useAppStore.getState();

  if (state.analyzerRunning) {
    // Single-flight: silently ignore concurrent triggers.
    return null;
  }

  const text = input.jdText.trim();
  if (!text) {
    throw new Error('Paste a job description first');
  }
  const key = readAnthropicKey();
  if (!key) {
    throw new Error('Anthropic key missing — add it in the Copilot overlay Settings');
  }
  if (input.cvIds.length === 0) {
    throw new Error('No CVs to compare');
  }

  const jdSnippet = text.slice(0, JD_SNIPPET_LEN);
  const model = readClaudeModel();

  // Initialize global progress: every CV queued.
  const initial: Record<string, { status: 'queued' }> = {};
  input.cvIds.forEach((id) => {
    initial[id] = { status: 'queued' };
  });

  useAppStore.setState({
    analyzerRunning: true,
    analyzerProgress: initial,
    analyzerJdSnippet: jdSnippet,
    analyzerStartedAt: Date.now(),
  });

  let completed = 0;
  let cached = 0;
  let failed = 0;
  let bestCvId: string | undefined;
  let bestScore = -1;

  try {
    for (const cvId of input.cvIds) {
      const s = useAppStore.getState();
      const cv = s.cvs.find((c) => c.id === cvId);
      if (!cv) {
        s.setAnalyzerProgressFor(cvId, { status: 'error', error: 'CV not found' });
        failed++;
        continue;
      }

      // Cache hit: skip the API call.
      const cachedAnalysis = s.atsByCv[cvId];
      if (!input.force && cachedAnalysis?.jdSnippet === jdSnippet) {
        s.setAnalyzerProgressFor(cvId, { status: 'skipped-cached' });
        if (cachedAnalysis.atsScore > bestScore) {
          bestScore = cachedAnalysis.atsScore;
          bestCvId = cvId;
        }
        completed++;
        cached++;
        continue;
      }

      const cvText = getCvParsedText(cv).trim();
      if (!cvText) {
        s.setAnalyzerProgressFor(cvId, {
          status: 'error',
          error: 'No parsed text on this variant',
        });
        failed++;
        continue;
      }

      s.setAnalyzerProgressFor(cvId, { status: 'running' });

      try {
        const res = await analyzeCvAts({
          cvId,
          cvText,
          jdText: text,
          anthropicKey: key,
          model,
        });
        const projected = Math.max(
          res.projectedAtsScore ?? res.atsScore,
          res.atsScore,
        );
        const after = useAppStore.getState();
        after.updateCv(cvId, { atsScore: res.atsScore });
        after.setAtsAnalysis(cvId, {
          atsScore: res.atsScore,
          matchScore: res.matchScore,
          projectedAtsScore: projected,
          strengths: res.strengths,
          weaknesses: res.weaknesses,
          missingKeywords: res.missingKeywords,
          suggestions: res.suggestions,
          scoreBefore: cv.atsScore,
          ranAt: Date.now(),
          jdSnippet,
        });
        after.setAnalyzerProgressFor(cvId, { status: 'done' });
        if (res.atsScore > bestScore) {
          bestScore = res.atsScore;
          bestCvId = cvId;
        }
        completed++;
      } catch (e) {
        useAppStore.getState().setAnalyzerProgressFor(cvId, {
          status: 'error',
          error: typeof e === 'string' ? e : (e as Error).message ?? 'failed',
        });
        failed++;
      }
    }
  } finally {
    useAppStore.setState({ analyzerRunning: false });
  }

  return { completed, cached, failed, bestCvId };
}
