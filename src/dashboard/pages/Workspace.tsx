import { useMemo } from 'react';
import {
  ArrowRight,
  Sparkles,
  Mic,
  FileText,
  CheckCircle2,
  Circle,
  AlertTriangle,
  PlayCircle,
  Mail,
  Target,
  TrendingUp,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import CompanyAvatar from '../components/CompanyAvatar';
import { useAppStore } from '../store';
import { useNavigation } from '../navigation';
import { useToast } from '../primitives';

/** Number of lifetime "preparation" steps tracked. Tune this when we
 *  add new check-points (mock interview, follow-up sent, etc.). */
const PREPARATION_STEPS = 5;

/** Heuristic match-score color buckets, mirroring the Pipeline + ATS
 *  card pills so the same number reads consistently across the app. */
function matchTone(match: number): 'green' | 'amber' | 'red' {
  if (match >= 85) return 'green';
  if (match >= 65) return 'amber';
  return 'red';
}

/**
 * Job War Room — the unified workspace for a single opportunity.
 *
 * Pulls everything we already know about a job into one page:
 *   - Match score + status pill (resolves linked application stage)
 *   - Why-you-match summary (uses cached ATS analysis)
 *   - Recommended CV variant (default + optimized links)
 *   - Action plan (AI next steps from the linked application)
 *   - Past Copilot sessions for this job
 *   - Preparation level meter (5 checkpoints)
 *   - Quick actions: start mock interview, open Copilot, draft follow-up
 *
 * The page is the "drill-down" of every browse surface — clicking a
 * job from Jobs / Applications / Pipeline lands here so the user sees
 * one ranked view of "what's left to do for this opportunity".
 */
export default function Workspace() {
  const { navigate } = useNavigation();
  const toast = useToast();
  const workspaceJobId = useAppStore((s) => s.workspaceJobId);
  const jobs = useAppStore((s) => s.jobs);
  const applications = useAppStore((s) => s.applications);
  const cvs = useAppStore((s) => s.cvs);
  const defaultCvId = useAppStore((s) => s.defaultCvId);
  const atsByCv = useAppStore((s) => s.atsByCv);
  const copilotSessions = useAppStore((s) => s.copilotSessions);
  const setCopilotPickerJobId = useAppStore((s) => s.setCopilotPickerJobId);
  const setCopilotPickerCvId = useAppStore((s) => s.setCopilotPickerCvId);
  const setSelectedApplication = useAppStore((s) => s.setSelectedApplication);

  // Resolve the linked entities — when no job is set yet, the page
  // shows an empty-state with a CTA to open the Jobs catalogue.
  const job = jobs.find((j) => j.id === workspaceJobId);
  const application = applications.find((a) => a.jobId === workspaceJobId);
  const cv = cvs.find((c) => c.id === (application?.cvId ?? defaultCvId)) ?? cvs[0];
  const ats = cv ? atsByCv[cv.id] : undefined;
  const linkedSessions = useMemo(
    () => copilotSessions.filter((s) => s.jobId === workspaceJobId).slice(0, 3),
    [copilotSessions, workspaceJobId],
  );

  // Preparation checklist — 5 atomic milestones we know how to track
  // today. Each row is { label, done, hint, action? } so the meter
  // can both render the score AND nudge the user to the next step.
  const checklist = useMemo(() => {
    const items: { id: string; label: string; done: boolean }[] = [
      {
        id: 'analyzed',
        label: 'Match analyzed against this CV',
        done: !!ats,
      },
      {
        id: 'optimized',
        label: 'CV variant optimized for this role',
        done: cvs.some((c) => /^optimized for /i.test(c.name) && c.id !== cv?.id) || cv?.atsScore !== undefined && (cv?.atsScore ?? 0) >= 85,
      },
      {
        id: 'applied',
        label: 'Application submitted',
        done: !!application,
      },
      {
        id: 'session',
        label: 'Copilot mock or live session done',
        done: linkedSessions.length > 0,
      },
      {
        id: 'next-steps',
        label: 'AI next-step plan generated',
        done: (application?.aiNextSteps?.length ?? 0) > 0,
      },
    ];
    return items;
  }, [ats, cvs, cv, application, linkedSessions]);

  const doneCount = checklist.filter((c) => c.done).length;
  const completionPct = Math.round((doneCount / PREPARATION_STEPS) * 100);

  // ── Empty state ────────────────────────────────────────────────
  if (!job) {
    return (
      <div className="dashboard">
        <Sidebar />
        <TopBar />
        <main className="dashboard__main">
          <div className="dashboard__main-scroll">
            <div className="workspace workspace--empty">
              <Target size={32} strokeWidth={1.6} />
              <h1>No job in focus yet</h1>
              <p>
                Pick an opportunity from your Jobs catalogue and Career OS
                builds the war room: match analysis, recommended CV, action
                plan, mock interviews — all in one place.
              </p>
              <button
                type="button"
                className="workspace__cta-primary"
                onClick={() => navigate('jobs')}
              >
                <span>Browse jobs</span>
                <ArrowRight size={14} strokeWidth={2.4} />
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────
  const tone = matchTone(application?.match ?? job.match ?? 0);
  const stageLabel =
    application?.stage === 'interview'
      ? 'In interviews'
      : application?.stage === 'phone_screen'
      ? 'Phone screen booked'
      : application?.stage === 'offer'
      ? 'Offer pending'
      : application?.stage === 'applied'
      ? 'Applied'
      : application?.stage === 'rejected'
      ? 'Closed'
      : 'Sourced';

  function startCopilotForJob() {
    if (!job) return;
    setCopilotPickerJobId(job.id);
    if (cv?.id) setCopilotPickerCvId(cv.id);
    navigate('copilot');
  }

  function openApplication() {
    if (application) {
      setSelectedApplication(application.id);
      navigate('applications');
    } else {
      toast.info(
        'No application yet',
        'Apply to this job from the Jobs catalogue to start tracking it here.',
      );
    }
  }

  return (
    <div className="dashboard">
      <Sidebar />
      <TopBar />
      <main className="dashboard__main">
        <div className="dashboard__main-scroll">
          <div className="workspace">
            {/* ── Hero ─────────────────────────────────────────── */}
            <header className="workspace__hero">
              <div className="workspace__hero-left">
                <CompanyAvatar company={job.company} size={56} />
                <div className="workspace__hero-text">
                  <span className="workspace__eyebrow">War Room</span>
                  <h1 className="workspace__title">
                    {job.company} · {job.role}
                  </h1>
                  <div className="workspace__hero-meta">
                    <span className={`workspace__pill workspace__pill--${tone}`}>
                      {application?.match ?? job.match ?? 0}% match
                    </span>
                    <span className="workspace__pill workspace__pill--neutral">
                      {stageLabel}
                    </span>
                    {job.location && (
                      <span className="workspace__meta-text">{job.location}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="workspace__hero-actions">
                <button
                  type="button"
                  className="workspace__cta-secondary"
                  onClick={openApplication}
                >
                  <FileText size={14} strokeWidth={2} />
                  <span>{application ? 'View application' : 'Apply'}</span>
                </button>
                <button
                  type="button"
                  className="workspace__cta-primary"
                  onClick={startCopilotForJob}
                >
                  <Mic size={14} strokeWidth={2} />
                  <span>Open Copilot</span>
                </button>
              </div>
            </header>

            {/* ── Preparation meter ────────────────────────────── */}
            <section
              className="workspace__prep"
              aria-label="Preparation level"
            >
              <div className="workspace__prep-header">
                <span className="workspace__eyebrow">Preparation</span>
                <strong className="workspace__prep-label">
                  {doneCount} of {PREPARATION_STEPS} steps done · {completionPct}%
                </strong>
              </div>
              <div className="workspace__prep-track" aria-hidden="true">
                <div
                  className="workspace__prep-fill"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              <ul className="workspace__prep-list">
                {checklist.map((item) => (
                  <li
                    key={item.id}
                    className={
                      'workspace__prep-item' +
                      (item.done ? ' workspace__prep-item--done' : '')
                    }
                  >
                    {item.done ? (
                      <CheckCircle2 size={14} strokeWidth={2.2} />
                    ) : (
                      <Circle size={14} strokeWidth={2} />
                    )}
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* ── 2-col grid: Match + CV ──────────────────────── */}
            <div className="workspace__grid">
              {/* Why you match */}
              <section className="workspace__panel" aria-label="Match analysis">
                <div className="workspace__panel-header">
                  <Sparkles size={16} strokeWidth={2} />
                  <h2 className="workspace__panel-title">Why you match</h2>
                </div>
                {ats ? (
                  <>
                    {ats.strengths && ats.strengths.length > 0 && (
                      <div className="workspace__strengths">
                        <span className="workspace__sub-eyebrow">Strengths</span>
                        <ul>
                          {ats.strengths.slice(0, 3).map((s, i) => (
                            <li key={i}>
                              <CheckCircle2 size={12} strokeWidth={2.4} />
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {ats.missingKeywords && ats.missingKeywords.length > 0 && (
                      <div className="workspace__gaps">
                        <span className="workspace__sub-eyebrow">Gaps to close</span>
                        <div className="workspace__gap-chips">
                          {ats.missingKeywords.slice(0, 8).map((kw, i) => (
                            <span key={i} className="workspace__gap-chip">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="workspace__empty">
                    <AlertTriangle size={14} strokeWidth={2} />
                    <span>
                      No match analysis yet. Run one from the CV → ATS Analyzer
                      with this JD pasted in.
                    </span>
                    <button
                      type="button"
                      className="workspace__inline-cta"
                      onClick={() => navigate('cv')}
                    >
                      Open ATS Analyzer →
                    </button>
                  </div>
                )}
              </section>

              {/* Recommended CV */}
              <section className="workspace__panel" aria-label="Recommended CV">
                <div className="workspace__panel-header">
                  <FileText size={16} strokeWidth={2} />
                  <h2 className="workspace__panel-title">Recommended CV</h2>
                </div>
                {cv ? (
                  <>
                    <div className="workspace__cv-row">
                      <div>
                        <div className="workspace__cv-name">{cv.name}</div>
                        <div className="workspace__cv-sub">
                          ATS {cv.atsScore ?? '—'}%
                          {ats?.projectedAtsScore != null &&
                            ` → ${ats.projectedAtsScore}% projected`}
                        </div>
                      </div>
                      <div
                        className={`workspace__pill workspace__pill--${
                          (cv.atsScore ?? 0) >= 85 ? 'green' : 'amber'
                        }`}
                      >
                        {(cv.atsScore ?? 0) >= 85 ? 'Optimised' : 'Improvable'}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="workspace__inline-cta"
                      onClick={() => navigate('cv')}
                    >
                      Open CV manager →
                    </button>
                  </>
                ) : (
                  <div className="workspace__empty">
                    <AlertTriangle size={14} strokeWidth={2} />
                    <span>No CV uploaded yet. Add one in CV Manager.</span>
                    <button
                      type="button"
                      className="workspace__inline-cta"
                      onClick={() => navigate('cv')}
                    >
                      Open CV manager →
                    </button>
                  </div>
                )}
              </section>
            </div>

            {/* ── Action plan ──────────────────────────────────── */}
            <section className="workspace__panel" aria-label="Action plan">
              <div className="workspace__panel-header">
                <TrendingUp size={16} strokeWidth={2} />
                <h2 className="workspace__panel-title">Action plan</h2>
                {application && (
                  <button
                    type="button"
                    className="workspace__inline-cta workspace__inline-cta--right"
                    onClick={openApplication}
                  >
                    See full detail →
                  </button>
                )}
              </div>
              {application?.aiNextSteps && application.aiNextSteps.length > 0 ? (
                <ul className="workspace__steps">
                  {application.aiNextSteps.map((step, i) => (
                    <li key={i}>
                      <span className="workspace__step-num">{i + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="workspace__empty">
                  <span>
                    No AI next steps yet. Open the application detail and
                    click "Generate next steps".
                  </span>
                  {application && (
                    <button
                      type="button"
                      className="workspace__inline-cta"
                      onClick={openApplication}
                    >
                      Open application →
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* ── 2-col bottom: Sessions + Quick actions ──────── */}
            <div className="workspace__grid">
              <section
                className="workspace__panel"
                aria-label="Past Copilot sessions"
              >
                <div className="workspace__panel-header">
                  <Mic size={16} strokeWidth={2} />
                  <h2 className="workspace__panel-title">Practice sessions</h2>
                </div>
                {linkedSessions.length > 0 ? (
                  <ul className="workspace__sessions">
                    {linkedSessions.map((s) => (
                      <li key={s.id}>
                        <span className="workspace__session-mode">
                          {s.mode === 'pitch' ? 'Pitch' : 'Q&A'}
                        </span>
                        <span className="workspace__session-meta">
                          {s.transcript.length} bubble
                          {s.transcript.length === 1 ? '' : 's'} ·{' '}
                          {s.answers.length} answer
                          {s.answers.length === 1 ? '' : 's'}
                        </span>
                        <span className="workspace__session-date">
                          {new Date(s.startedAt).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="workspace__empty">
                    <span>No practice runs for this opportunity yet.</span>
                  </div>
                )}
                <button
                  type="button"
                  className="workspace__cta-secondary workspace__cta-block"
                  onClick={startCopilotForJob}
                >
                  <PlayCircle size={14} strokeWidth={2} />
                  <span>Start mock with this context</span>
                </button>
              </section>

              <section
                className="workspace__panel"
                aria-label="Quick actions"
              >
                <div className="workspace__panel-header">
                  <Mail size={16} strokeWidth={2} />
                  <h2 className="workspace__panel-title">Quick actions</h2>
                </div>
                <div className="workspace__quick">
                  <button
                    type="button"
                    className="workspace__quick-btn"
                    onClick={() => navigate('prep')}
                  >
                    <PlayCircle size={14} strokeWidth={2} />
                    <span>Open mock interview library</span>
                  </button>
                  <button
                    type="button"
                    className="workspace__quick-btn"
                    onClick={() => navigate('cv')}
                  >
                    <Sparkles size={14} strokeWidth={2} />
                    <span>Generate optimized CV</span>
                  </button>
                  <button
                    type="button"
                    className="workspace__quick-btn workspace__quick-btn--soon"
                    disabled
                    title="Coming soon"
                  >
                    <Mail size={14} strokeWidth={2} />
                    <span>Draft recruiter follow-up</span>
                    <span className="workspace__soon-pill">Soon</span>
                  </button>
                  <button
                    type="button"
                    className="workspace__quick-btn workspace__quick-btn--soon"
                    disabled
                    title="Coming soon"
                  >
                    <Target size={14} strokeWidth={2} />
                    <span>15 probable questions</span>
                    <span className="workspace__soon-pill">Soon</span>
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
