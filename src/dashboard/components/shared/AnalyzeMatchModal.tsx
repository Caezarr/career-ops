import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, KeyRound, Sparkles, RotateCw } from 'lucide-react';
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '../../primitives';
import { analyzeCvAts, type AtsAnalysis } from '../../lib/ai';
import { AiClientError } from '../../lib/aiClient';
import { useAppStore } from '../../store';
import { getCvParsedText } from '../../store/slices/cvs';
import CircularProgress from '../cv/CircularProgress';

interface AnalyzeMatchModalProps {
  open: boolean;
  onClose: () => void;
  /** When provided, analyzes that specific CV. Otherwise uses the selected CV. */
  cvId?: string;
  /** Optional JD text — without it, scores against a generic baseline. */
  jdText?: string;
  onApply?: (result: AtsAnalysis) => void;
}

export default function AnalyzeMatchModal({
  open,
  onClose,
  cvId,
  jdText,
  onApply,
}: AnalyzeMatchModalProps) {
  const cvs = useAppStore((s) => s.cvs);
  const selectedCvId = useAppStore((s) => s.selectedCvId);
  const updateCv = useAppStore((s) => s.updateCv);
  const setAtsAnalysis = useAppStore((s) => s.setAtsAnalysis);
  const atsByCv = useAppStore((s) => s.atsByCv);

  const targetCvId = cvId ?? selectedCvId ?? cvs[0]?.id;
  const targetCv = cvs.find((c) => c.id === targetCvId);

  // Cached analysis for this CV from the store, if any.
  const cached = targetCvId ? atsByCv[targetCvId] : undefined;
  const currentJd = (jdText ?? '').slice(0, 200);
  // Cache is valid if it exists AND was run against the same JD context.
  const cacheValid = !!cached && (cached.jdSnippet ?? '') === currentJd;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AtsAnalysis | null>(null);
  const [keyMissing, setKeyMissing] = useState(false);
  const [ranAt, setRanAt] = useState<number | undefined>(undefined);

  /** Run the analysis. `force=true` bypasses the cache. */
  const runAnalysis = useCallback(
    async (force: boolean) => {
      setError(null);
      setKeyMissing(false);
      setResult(null);

      if (!targetCv) {
        setError('No CV selected.');
        return;
      }

      // Cache hit → render it without calling Claude.
      if (!force && cacheValid && cached) {
        setResult({
          atsScore: cached.atsScore,
          matchScore: cached.matchScore,
          projectedAtsScore: cached.projectedAtsScore,
          strengths: cached.strengths,
          weaknesses: cached.weaknesses,
          missingKeywords: cached.missingKeywords,
          suggestions: cached.suggestions,
        });
        setRanAt(cached.ranAt);
        return;
      }

      const cvText = getCvParsedText(targetCv).trim();
      if (!cvText) {
        setError(
          'This CV has no parsed text yet. Re-upload the PDF or create a variant from a populated CV.',
        );
        return;
      }

      setLoading(true);
      try {
        const res = await analyzeCvAts({
          cvId: targetCvId,
          cvText,
          jdText: jdText ?? null,
        });
        setResult(res);
        const now = Date.now();
        setRanAt(now);

        if (targetCvId && targetCv) {
          const scoreBefore = targetCv.atsScore;
          updateCv(targetCvId, { atsScore: res.atsScore });
          const projected = Math.max(
            res.projectedAtsScore ?? res.atsScore,
            res.atsScore,
          );
          setAtsAnalysis(targetCvId, {
            atsScore: res.atsScore,
            matchScore: res.matchScore,
            projectedAtsScore: projected,
            strengths: res.strengths,
            weaknesses: res.weaknesses,
            missingKeywords: res.missingKeywords,
            suggestions: res.suggestions,
            scoreBefore,
            ranAt: now,
            jdSnippet: currentJd,
          });
        }
      } catch (e) {
        // AiClientError carries a user-actionable message + a
        // discriminant `kind`. Map the `no_auth` case to the
        // existing `keyMissing` UI (renamed semantically — the
        // prompt now says "sign in" instead of "set Anthropic key"
        // when KeyMissingPrompt is updated, but the gating logic
        // is the same).
        if (e instanceof AiClientError) {
          if (e.kind === 'no_auth') {
            setKeyMissing(true);
          } else {
            setError(e.message);
          }
        } else {
          setError(typeof e === 'string' ? e : (e as Error).message ?? 'Analysis failed');
        }
      } finally {
        setLoading(false);
      }
    },
    // Intentionally exhaustive deps via closure capture only — these refs
    // are stable enough for the modal's lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [targetCvId, jdText, cacheValid],
  );

  // Trigger on open: show cache or fetch.
  useEffect(() => {
    if (!open) return;
    void runAnalysis(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, targetCvId, jdText]);

  const headerTitle = loading
    ? 'Analyzing match…'
    : keyMissing
    ? 'Set up Anthropic key to analyze'
    : error
    ? 'Analysis failed'
    : 'Match analysis';

  const ageLabel = ranAt ? formatAgo(Date.now() - ranAt) : null;
  const headerSubtitle = loading
    ? `Comparing ${targetCv?.name ?? 'your CV'} against the role`
    : result
    ? `${targetCv?.name ?? 'CV'} · ${jdText?.trim() ? 'matched against the JD' : 'baseline scoring'}${
        ageLabel ? ` · last run ${ageLabel}` : ''
      }`
    : '';

  return (
    <Modal open={open} onClose={onClose} size="lg" ariaLabel="ATS analysis">
      <ModalHeader title={headerTitle} subtitle={headerSubtitle} onClose={onClose} />
      <ModalBody>
        {keyMissing && <KeyMissingPrompt />}
        {!keyMissing && loading && (
          <div className="ds-shared-loader" aria-live="polite">
            <span className="ds-shared-loader__dot" />
            <span className="ds-shared-loader__dot" />
            <span className="ds-shared-loader__dot" />
          </div>
        )}
        {!keyMissing && !loading && error && (
          <div className="ats-error" role="alert">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}
        {!keyMissing && !loading && !error && result && (
          <ResultView result={result} />
        )}
      </ModalBody>
      <ModalFooter>
        <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>
          Close
        </button>
        {result && (
          <button
            type="button"
            className="ds-btn ds-btn--secondary"
            onClick={() => void runAnalysis(true)}
            disabled={loading || keyMissing}
            title="Force a fresh analysis (consumes API credits)"
          >
            <RotateCw size={13} />
            <span style={{ marginLeft: 6 }}>Re-run</span>
          </button>
        )}
        <button
          type="button"
          className="ds-btn ds-btn--primary"
          onClick={() => {
            if (result) onApply?.(result);
            onClose();
          }}
          disabled={loading || !!error || keyMissing || !result}
        >
          Apply suggestions
        </button>
      </ModalFooter>
    </Modal>
  );
}

/** Human-readable 'X ago' from a millisecond delta. */
function formatAgo(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function KeyMissingPrompt() {
  return (
    <div className="ats-setup">
      <KeyRound size={28} />
      <div>
        <h3>Add your Anthropic API key</h3>
        <p>
          The ATS analyzer uses Claude to score your CV. Open the Copilot
          window (sidebar → <strong>Copilot</strong> → <em>Open Copilot →</em>),
          paste your key in Settings, then come back here.
        </p>
        <p className="ats-setup__hint">
          The key is stored locally on your Mac — never sent to our servers.
        </p>
      </div>
    </div>
  );
}

function ResultView({ result }: { result: AtsAnalysis }) {
  const atsColor: 'green' | 'orange' | 'red' =
    result.atsScore >= 80 ? 'green' : result.atsScore >= 60 ? 'orange' : 'red';
  const matchColor: 'green' | 'orange' | 'red' =
    result.matchScore >= 80 ? 'green' : result.matchScore >= 60 ? 'orange' : 'red';

  return (
    <div className="ats-result">
      <div className="ats-result__scores">
        <div className="ats-result__score">
          <CircularProgress value={result.atsScore} size={72} stroke={7} color={atsColor} labelSize={15} />
          <div>
            <div className="ats-result__score-label">ATS score</div>
            <div className="ats-result__score-hint">
              {result.atsScore >= 80
                ? 'Will pass most ATS filters'
                : result.atsScore >= 60
                ? 'Borderline — keyword tuning needed'
                : 'Likely filtered out — major rework required'}
            </div>
          </div>
        </div>
        <div className="ats-result__score">
          <CircularProgress value={result.matchScore} size={72} stroke={7} color={matchColor} labelSize={15} />
          <div>
            <div className="ats-result__score-label">Role match</div>
            <div className="ats-result__score-hint">
              {result.matchScore >= 80
                ? 'Strong fit'
                : result.matchScore >= 60
                ? 'Partial fit — see suggestions'
                : 'Weak fit — consider a tailored variant'}
            </div>
          </div>
        </div>
      </div>

      <div className="ats-result__cols">
        <div className="ats-result__col">
          <h4 className="ats-result__h">Strengths</h4>
          <ul className="ats-result__list ats-result__list--good">
            {result.strengths.map((s, i) => (
              <li key={i}>
                <CheckCircle2 size={14} />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="ats-result__col">
          <h4 className="ats-result__h">Weaknesses</h4>
          <ul className="ats-result__list ats-result__list--bad">
            {result.weaknesses.map((s, i) => (
              <li key={i}>
                <AlertTriangle size={14} />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {result.missingKeywords.length > 0 && (
        <div className="ats-result__keywords">
          <h4 className="ats-result__h">Missing keywords</h4>
          <div className="ats-result__chips">
            {result.missingKeywords.map((k) => (
              <span key={k} className="ats-result__chip">{k}</span>
            ))}
          </div>
        </div>
      )}

      {result.suggestions.length > 0 && (
        <div className="ats-result__suggestions">
          <h4 className="ats-result__h">
            <Sparkles size={14} />
            <span>Suggested edits ({result.suggestions.length})</span>
          </h4>
          <ul className="ats-result__edits">
            {result.suggestions.map((s, i) => (
              <li key={i} className={`ats-result__edit ats-result__edit--${s.type}`}>
                <span className={`ats-result__edit-tag ats-result__edit-tag--${s.type}`}>
                  {s.type}
                </span>
                <div className="ats-result__edit-body">
                  {s.original && s.original !== '<empty>' && (
                    <div className="ats-result__edit-original">{s.original}</div>
                  )}
                  <div className="ats-result__edit-suggested">{s.suggested}</div>
                  <div className="ats-result__edit-rationale">{s.rationale}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
