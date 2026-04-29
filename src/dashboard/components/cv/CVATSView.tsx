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
import { readAnthropicKey } from '../../hooks/useAnthropicKey';
import { runAnalyzer } from '../../lib/runAnalyzer';

const JD_SNIPPET_LEN = 200;

export default function CVATSView() {
  const toast = useToast();
  const cvs = useAppStore((s) => s.cvs);
  const atsByCv = useAppStore((s) => s.atsByCv);
  const setSelectedCv = useAppStore((s) => s.setSelectedCv);

  // Persisted JD textarea (survives nav + restart).
  const jd = useAppStore((s) => s.atsAnalyzerJd);
  const setJd = useAppStore((s) => s.setAtsAnalyzerJd);

  // Background run state — lives in the store so the run keeps progressing
  // even when the user navigates away from this tab.
  const running = useAppStore((s) => s.analyzerRunning);
  const runProgress = useAppStore((s) => s.analyzerProgress);
  const analyzerJdSnippet = useAppStore((s) => s.analyzerJdSnippet);

  const [expandedCvId, setExpandedCvId] = useState<string | null>(null);

  const jdSnippet = jd.slice(0, JD_SNIPPET_LEN);

  /** Comparison rows = all CVs joined with their cached analysis (if same JD). */
  const rows = useMemo(() => {
    return cvs
      .map((cv) => {
        const cached = atsByCv[cv.id];
        const sameJd = cached?.jdSnippet === jdSnippet;
        // Only show progress for the run that matches the JD currently typed.
        const progressForCurrentJd =
          analyzerJdSnippet === jdSnippet ? runProgress[cv.id] : undefined;
        return {
          cv,
          analysis: sameJd ? cached : undefined,
          state: progressForCurrentJd,
        };
      })
      .sort((a, b) => {
        const sa = a.analysis?.atsScore ?? -1;
        const sb = b.analysis?.atsScore ?? -1;
        return sb - sa;
      });
  }, [cvs, atsByCv, jdSnippet, runProgress, analyzerJdSnippet]);

  const bestRow = rows.find((r) => r.analysis);
  const bestAtsScore = bestRow?.analysis?.atsScore ?? null;

  async function runAll(force: boolean) {
    try {
      const result = await runAnalyzer({
        cvIds: cvs.map((c) => c.id),
        jdText: jd,
        force,
      });
      if (!result) {
        toast.info('Already running', 'Wait for the current run to finish.');
        return;
      }
      const { completed, cached, failed, bestCvId } = result;
      const best = bestCvId ? cvs.find((c) => c.id === bestCvId) : null;
      const bits: string[] = [];
      if (cached > 0) bits.push(`${cached} from cache`);
      if (failed > 0) bits.push(`${failed} failed`);
      const desc = best
        ? `Best match: ${best.name}${bits.length ? ' · ' + bits.join(' · ') : ''}`
        : bits.join(' · ') || undefined;
      toast.success(
        `Compared ${completed} variant${completed === 1 ? '' : 's'}`,
        desc,
      );
    } catch (e) {
      toast.error(
        'Couldn\'t start the analysis',
        typeof e === 'string' ? e : (e as Error).message ?? 'Unknown error',
      );
    }
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
                  ? 'Comparing in background…'
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
          {running && (
            <div className="cv-ats-analyzer__hint cv-ats-analyzer__hint--info">
              <Sparkles size={13} />
              <span>
                You can navigate to other pages — the analysis keeps running
                and the results will be here when you come back.
              </span>
            </div>
          )}
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
