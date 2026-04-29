import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, KeyRound, Sparkles } from 'lucide-react';
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '../../primitives';
import { analyzeCvAts, type AtsAnalysis } from '../../lib/ai';
import { readAnthropicKey, readClaudeModel } from '../../hooks/useAnthropicKey';
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

  const targetCvId = cvId ?? selectedCvId ?? cvs[0]?.id;
  const targetCv = cvs.find((c) => c.id === targetCvId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AtsAnalysis | null>(null);
  const [keyMissing, setKeyMissing] = useState(false);

  useEffect(() => {
    if (!open) return;

    setResult(null);
    setError(null);
    setKeyMissing(false);

    const key = readAnthropicKey();
    if (!key) {
      setKeyMissing(true);
      return;
    }
    if (!targetCv) {
      setError('No CV selected.');
      return;
    }

    const cvText = getCvParsedText(targetCv).trim();
    if (!cvText) {
      setError(
        'This CV has no parsed text yet. Re-upload the PDF or create a variant from a populated CV.',
      );
      return;
    }

    let cancelled = false;
    setLoading(true);

    analyzeCvAts({
      cvId: targetCvId,
      cvText,
      jdText: jdText ?? null,
      anthropicKey: key,
      model: readClaudeModel(),
    })
      .then((res) => {
        if (cancelled) return;
        setResult(res);
        // Persist the new ATS score + the full analysis in the store so the
        // right-panel cards (Strengths, AI suggestions) and the tailoring
        // workspace (Keyword match, Missing keywords, Suggested edits, Diff)
        // all reflect this run instead of the seed mock.
        if (targetCvId && targetCv) {
          const scoreBefore = targetCv.atsScore;
          updateCv(targetCvId, { atsScore: res.atsScore });
          // Defensive: if Claude somehow returned a projected lower than the
          // current score, ignore it (the model is supposed to clamp).
          const projected = Math.max(res.projectedAtsScore ?? res.atsScore, res.atsScore);
          setAtsAnalysis(targetCvId, {
            atsScore: res.atsScore,
            matchScore: res.matchScore,
            projectedAtsScore: projected,
            strengths: res.strengths,
            weaknesses: res.weaknesses,
            missingKeywords: res.missingKeywords,
            suggestions: res.suggestions,
            scoreBefore,
            ranAt: Date.now(),
            jdSnippet: jdText?.slice(0, 200),
          });
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setError(typeof e === 'string' ? e : (e as Error).message ?? 'Analysis failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // Intentionally NOT including `targetCv`, `updateCv`, `setAtsAnalysis`
    // in the deps: targetCv is recomputed on every render (the array selector
    // returns a new ref each time the store updates) — including it would
    // cause the effect to cancel and refetch on every render, leading to an
    // infinite loop where the result is never visibly applied.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, targetCvId, jdText]);

  const headerTitle = loading
    ? 'Analyzing match…'
    : keyMissing
    ? 'Set up Anthropic key to analyze'
    : error
    ? 'Analysis failed'
    : 'Match analysis';

  const headerSubtitle = loading
    ? `Comparing ${targetCv?.name ?? 'your CV'} against the role`
    : result
    ? `${targetCv?.name ?? 'CV'} · ${jdText?.trim() ? 'matched against the JD' : 'baseline scoring'}`
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
