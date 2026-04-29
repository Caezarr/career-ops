import { useMemo, useState } from 'react';
import {
  Sparkles,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  RotateCw,
  ChevronDown,
  ChevronUp,
  KeyRound,
} from 'lucide-react';
import { useToast } from '../../primitives';
import { useAppStore } from '../../store';
import { getCvParsedText } from '../../store/slices/cvs';
import { analyzeCvAts } from '../../lib/ai';
import { readAnthropicKey, readClaudeModel } from '../../hooks/useAnthropicKey';

const JD_SNIPPET_LEN = 200;

/** Per-CV run state during a comparison run. */
interface RunState {
  status: 'idle' | 'queued' | 'running' | 'done' | 'error' | 'skipped-cached';
  error?: string;
}

export default function CVATSView() {
  const toast = useToast();
  const cvs = useAppStore((s) => s.cvs);
  const updateCv = useAppStore((s) => s.updateCv);
  const setAtsAnalysis = useAppStore((s) => s.setAtsAnalysis);
  const atsByCv = useAppStore((s) => s.atsByCv);
  const setSelectedCv = useAppStore((s) => s.setSelectedCv);
  // JD lives in the store so leaving the tab and coming back keeps the
  // input — and the same JD is reused by Tailoring's Analyze match so
  // the cache hits there instead of burning credits on a re-run.
  const jd = useAppStore((s) => s.atsAnalyzerJd);
  const setJd = useAppStore((s) => s.setAtsAnalyzerJd);

  const [running, setRunning] = useState(false);
  const [runState, setRunState] = useState<Record<string, RunState>>({});
  const [expandedCvId, setExpandedCvId] = useState<string | null>(null);

  const jdSnippet = jd.slice(0, JD_SNIPPET_LEN);

  /** Comparison rows = all CVs joined with their cached analysis (if same JD). */
  const rows = useMemo(() => {
    return cvs
      .map((cv) => {
        const cached = atsByCv[cv.id];
        const sameJd = cached?.jdSnippet === jdSnippet;
        const state = runState[cv.id];
        return {
          cv,
          analysis: sameJd ? cached : undefined,
          state,
        };
      })
      .sort((a, b) => {
        // Sort by ats score desc; CVs with no analysis go to the bottom.
        const sa = a.analysis?.atsScore ?? -1;
        const sb = b.analysis?.atsScore ?? -1;
        return sb - sa;
      });
  }, [cvs, atsByCv, jdSnippet, runState]);

  const bestRow = rows.find((r) => r.analysis);
  const bestAtsScore = bestRow?.analysis?.atsScore ?? null;

  async function runAll(force: boolean) {
    const text = jd.trim();
    if (!text) {
      toast.error('Paste a job description first');
      return;
    }
    const key = readAnthropicKey();
    if (!key) {
      toast.error(
        'Anthropic key missing',
        'Open the Copilot overlay → Settings to add it.',
      );
      return;
    }
    if (cvs.length === 0) {
      toast.error('No CVs to compare', 'Import at least one CV first.');
      return;
    }

    setRunning(true);
    const initial: Record<string, RunState> = {};
    cvs.forEach((cv) => {
      initial[cv.id] = { status: 'queued' };
    });
    setRunState(initial);

    let completed = 0;
    for (const cv of cvs) {
      // Cache hit: don't re-run if same JD already cached, unless force.
      const cached = atsByCv[cv.id];
      if (!force && cached?.jdSnippet === jdSnippet) {
        setRunState((s) => ({ ...s, [cv.id]: { status: 'skipped-cached' } }));
        completed++;
        continue;
      }

      const cvText = getCvParsedText(cv).trim();
      if (!cvText) {
        setRunState((s) => ({
          ...s,
          [cv.id]: { status: 'error', error: 'No parsed text on this variant' },
        }));
        continue;
      }

      setRunState((s) => ({ ...s, [cv.id]: { status: 'running' } }));

      try {
        const res = await analyzeCvAts({
          cvId: cv.id,
          cvText,
          jdText: text,
          anthropicKey: key,
          model: readClaudeModel(),
        });
        const projected = Math.max(res.projectedAtsScore ?? res.atsScore, res.atsScore);
        updateCv(cv.id, { atsScore: res.atsScore });
        setAtsAnalysis(cv.id, {
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
        setRunState((s) => ({ ...s, [cv.id]: { status: 'done' } }));
        completed++;
      } catch (e) {
        setRunState((s) => ({
          ...s,
          [cv.id]: {
            status: 'error',
            error: typeof e === 'string' ? e : (e as Error).message ?? 'failed',
          },
        }));
      }
    }

    setRunning(false);
    toast.success(
      `Compared ${completed} variant${completed === 1 ? '' : 's'}`,
      bestRow ? `Best match: ${bestRow.cv.name}` : undefined,
    );
  }

  const keyMissing = !readAnthropicKey();
  const hasResults = rows.some((r) => r.analysis);

  return (
    <section className="cv-ats-analyzer" aria-label="ATS analyzer">
      <header className="cv-ats-analyzer__header">
        <div>
          <h2 className="cv-workspace__title">ATS Analyzer</h2>
          <p className="cv-ats-analyzer__lede">
            Paste a job description and we'll score every CV variant against
            it, side by side. Pick the strongest one to send.
          </p>
        </div>
      </header>

      <div className="cv-ats-analyzer__grid">
        {/* ── Left: JD input ─────────────────────────────────────────────── */}
        <div className="cv-ats-analyzer__left">
          <label className="cv-ats-analyzer__label" htmlFor="cv-ats-jd">
            Job description
          </label>
          <textarea
            id="cv-ats-jd"
            className="ds-shared-textarea cv-ats-analyzer__textarea"
            rows={18}
            placeholder="Paste the full job description here…"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            disabled={running}
          />
          <div className="cv-ats-analyzer__cta-row">
            <button
              type="button"
              className="cv-workspace__btn cv-workspace__btn--primary"
              disabled={!jd.trim() || running || cvs.length === 0}
              onClick={() => void runAll(false)}
            >
              <Sparkles size={14} strokeWidth={2.2} />
              <span>
                {running
                  ? 'Comparing…'
                  : `Analyze across ${cvs.length} variant${cvs.length === 1 ? '' : 's'}`}
              </span>
            </button>
            {hasResults && (
              <button
                type="button"
                className="cv-workspace__btn cv-workspace__btn--ghost"
                disabled={running || !jd.trim()}
                onClick={() => void runAll(true)}
                title="Force a fresh analysis on every variant"
              >
                <RotateCw size={13} strokeWidth={2.2} />
                <span>Re-run all</span>
              </button>
            )}
          </div>
          {keyMissing && (
            <div className="cv-ats-analyzer__hint">
              <KeyRound size={13} />
              <span>
                Add your Anthropic API key in the Copilot overlay Settings to
                run analyses.
              </span>
            </div>
          )}
        </div>

        {/* ── Right: comparison results ──────────────────────────────────── */}
        <div className="cv-ats-analyzer__right">
          {!hasResults && !running && (
            <div className="cv-ats-analyzer__empty">
              <Sparkles size={22} />
              <h3>Compare your CVs against this role</h3>
              <p>
                Paste a JD on the left, click Analyze, and you'll see every
                variant scored side by side here. We'll badge the best match
                so you know which CV to send.
              </p>
            </div>
          )}

          {(hasResults || running) && (
            <div className="cv-ats-analyzer__table" role="table">
              <div className="cv-ats-analyzer__th" role="row">
                <span>Variant</span>
                <span>ATS</span>
                <span>Match</span>
                <span>Projected</span>
                <span />
              </div>

              {rows.map(({ cv, analysis, state }) => {
                const expanded = expandedCvId === cv.id;
                const isBest = analysis && analysis.atsScore === bestAtsScore && bestAtsScore !== null;
                const status = state?.status;
                const showLoader = status === 'running' || status === 'queued';

                return (
                  <div
                    key={cv.id}
                    role="row"
                    className={
                      'cv-ats-analyzer__tr' +
                      (expanded ? ' cv-ats-analyzer__tr--expanded' : '') +
                      (isBest ? ' cv-ats-analyzer__tr--best' : '')
                    }
                  >
                    <button
                      type="button"
                      className="cv-ats-analyzer__row-toggle"
                      onClick={() => {
                        if (analysis) {
                          setExpandedCvId(expanded ? null : cv.id);
                        }
                      }}
                      disabled={!analysis}
                    >
                      <div className="cv-ats-analyzer__name-cell">
                        <span className="cv-pdf-badge cv-pdf-badge--mini" aria-hidden="true">
                          PDF
                        </span>
                        <div className="cv-ats-analyzer__name-block">
                          <span className="cv-ats-analyzer__name">{cv.name}</span>
                          <span className="cv-ats-analyzer__role-focus">{cv.roleFocus}</span>
                        </div>
                        {isBest && (
                          <span className="cv-ats-analyzer__best-badge">
                            <Trophy size={11} />
                            <span>Best match</span>
                          </span>
                        )}
                      </div>

                      <span className="cv-ats-analyzer__score">
                        {showLoader ? (
                          <span className="cv-ats-analyzer__loader" />
                        ) : analysis ? (
                          <ScoreBubble value={analysis.atsScore} />
                        ) : status === 'error' ? (
                          <span title={state?.error} className="cv-ats-analyzer__cell-err">
                            <AlertTriangle size={13} />
                          </span>
                        ) : (
                          <span className="cv-ats-analyzer__cell-empty">—</span>
                        )}
                      </span>

                      <span className="cv-ats-analyzer__score">
                        {analysis ? (
                          <ScoreBubble value={analysis.matchScore} />
                        ) : (
                          <span className="cv-ats-analyzer__cell-empty">—</span>
                        )}
                      </span>

                      <span className="cv-ats-analyzer__score">
                        {analysis ? (
                          <ScoreBubble value={analysis.projectedAtsScore} muted />
                        ) : (
                          <span className="cv-ats-analyzer__cell-empty">—</span>
                        )}
                      </span>

                      <span className="cv-ats-analyzer__chevron">
                        {analysis &&
                          (expanded ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          ))}
                      </span>
                    </button>

                    {expanded && analysis && (
                      <div className="cv-ats-analyzer__detail">
                        <div className="cv-ats-analyzer__detail-grid">
                          <div>
                            <h4 className="ats-result__h">Strengths</h4>
                            <ul className="ats-result__list ats-result__list--good">
                              {analysis.strengths.slice(0, 3).map((s, i) => (
                                <li key={i}>
                                  <CheckCircle2 size={13} />
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="ats-result__h">Weaknesses</h4>
                            <ul className="ats-result__list ats-result__list--bad">
                              {analysis.weaknesses.slice(0, 3).map((s, i) => (
                                <li key={i}>
                                  <AlertTriangle size={13} />
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {analysis.missingKeywords.length > 0 && (
                          <div className="cv-ats-analyzer__keywords">
                            <h4 className="ats-result__h">Missing keywords</h4>
                            <div className="ats-result__chips">
                              {analysis.missingKeywords.slice(0, 8).map((k) => (
                                <span key={k} className="ats-result__chip">{k}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="cv-ats-analyzer__detail-actions">
                          <button
                            type="button"
                            className="cv-workspace__btn cv-workspace__btn--ghost"
                            onClick={() => {
                              setSelectedCv(cv.id);
                              toast.success(`${cv.name} selected`, 'Switch to CV Manager to edit it.');
                            }}
                          >
                            Use this variant
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ScoreBubble({ value, muted = false }: { value: number; muted?: boolean }) {
  const color: 'green' | 'orange' | 'red' =
    value >= 80 ? 'green' : value >= 60 ? 'orange' : 'red';
  return (
    <span
      className={
        'cv-ats-analyzer__pill cv-ats-analyzer__pill--' +
        color +
        (muted ? ' cv-ats-analyzer__pill--muted' : '')
      }
    >
      {value}%
    </span>
  );
}
