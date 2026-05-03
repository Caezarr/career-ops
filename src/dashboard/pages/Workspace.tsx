import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Sparkles,
  Mic,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  MapPin,
  Euro,
  Briefcase,
  Building2,
  Repeat,
  Search,
  Share2,
  Download,
  Calendar,
  Mail,
  Send,
  Plus,
  Info,
  ChevronRight,
  Play,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import CompanyAvatar from '../components/CompanyAvatar';
import { useAppStore } from '../store';
import type { Job, ApplicationStage } from '../store';
import { useNavigation } from '../navigation';
import { Modal, ModalBody, ModalHeader, useToast } from '../primitives';
import { runAnalyzer } from '../lib/runAnalyzer';
import { readAnthropicKey } from '../hooks/useAnthropicKey';
import { getCvParsedText } from '../store/slices/cvs';

/** First 200 chars of the JD — same window the runAnalyzer uses for
 *  cache validation. */
const JD_SNIPPET_LEN = 200;

/** The 6 stages the War Room visualises in its top stepper. We map
 *  the existing ApplicationStage union plus a synthetic "saved"
 *  (bookmarked, never applied) and split "interview" into two
 *  sub-stages (Recruiter Screen → Hiring Manager → Final Round)
 *  that the user-facing copy demands but the slice doesn't model
 *  yet. The mapping is best-effort until we add a richer stage
 *  enum to the slice. */
type WarRoomStage =
  | 'saved'
  | 'applied'
  | 'recruiter-screen'
  | 'hiring-manager'
  | 'final-round'
  | 'offer';

const STAGES: { id: WarRoomStage; label: string }[] = [
  { id: 'saved', label: 'Saved' },
  { id: 'applied', label: 'Applied' },
  { id: 'recruiter-screen', label: 'Recruiter\nScreen' },
  { id: 'hiring-manager', label: 'Hiring\nManager' },
  { id: 'final-round', label: 'Final Round' },
  { id: 'offer', label: 'Offer' },
];

/** Map application.stage → WarRoomStage index. We collapse the slice's
 *  three "interview" sub-stages into Hiring Manager by default — when
 *  the slice gains finer stages we update this mapping. */
function stageIndex(
  appStage: ApplicationStage | null,
  bookmarked: boolean,
): number {
  if (!appStage) return bookmarked ? 0 : -1;
  switch (appStage) {
    case 'sourced':
      return 0;
    case 'applied':
      return 1;
    case 'phone_screen':
      return 2;
    case 'interview':
      return 3;
    case 'offer':
      return 5;
    case 'rejected':
      return -1;
    default:
      return -1;
  }
}

function matchTone(match: number): 'green' | 'amber' | 'red' {
  if (match >= 85) return 'green';
  if (match >= 65) return 'amber';
  return 'red';
}

function formatSalary(min: number, max: number, c: string): string | null {
  if (!min) return null;
  const a = `${c}${Math.round(min / 1000)}k`;
  if (!max || max === min) return `${a} OTE`;
  return `${a}–${c}${Math.round(max / 1000)}k OTE`;
}

/**
 * War Room — the unified workspace for a single opportunity.
 *
 * Layout follows the design spec (Qonto · Senior PM mockup):
 *   - Header: breadcrumb + Share/Export/Open Copilot CTAs
 *   - Job hero strip + horizontal stage progress
 *   - 3-column main grid: left (match + why + gaps + career memory),
 *     center (next actions + interview prep + toolkit + timeline),
 *     right (interview readiness + focus + live assistant + notes).
 *
 * Empty state: inline ranked job picker (no bounce to the catalogue).
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
  const setWorkspaceJobId = useAppStore((s) => s.setWorkspaceJobId);
  const analyzerRunning = useAppStore((s) => s.analyzerRunning);
  const updateApplicationNotes = useAppStore((s) => s.updateApplicationNotes);

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switcherQuery, setSwitcherQuery] = useState('');

  const job = jobs.find((j) => j.id === workspaceJobId);
  const application = applications.find((a) => a.jobId === workspaceJobId);
  const cv =
    cvs.find((c) => c.id === (application?.cvId ?? defaultCvId)) ?? cvs[0];
  const cachedAts = cv ? atsByCv[cv.id] : undefined;
  const jdSnippet = (job?.jdText ?? '').slice(0, JD_SNIPPET_LEN);
  const atsIsForThisJob =
    !!cachedAts && (!jdSnippet || cachedAts.jdSnippet === jdSnippet);
  const ats = atsIsForThisJob ? cachedAts : undefined;
  const linkedSessions = useMemo(
    () =>
      copilotSessions.filter((s) => s.jobId === workspaceJobId).slice(0, 3),
    [copilotSessions, workspaceJobId],
  );

  // Auto-trigger ATS analysis on workspace open. Same dedupe pattern
  // as before — fingerprint = jobId|cvId|jdSnippet.
  const lastAnalyzedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!job || !cv) return;
    if (atsIsForThisJob) return;
    if (analyzerRunning) return;
    if (!job.jdText?.trim()) return;
    const cvText = getCvParsedText(cv).trim();
    if (!cvText) return;
    if (!readAnthropicKey()) return;
    const fingerprint = `${job.id}|${cv.id}|${jdSnippet}`;
    if (lastAnalyzedRef.current === fingerprint) return;
    lastAnalyzedRef.current = fingerprint;
    runAnalyzer({ cvIds: [cv.id], jdText: job.jdText }).catch((e) => {
      toast.error(
        'Match analysis failed',
        e instanceof Error ? e.message : String(e),
      );
    });
  }, [job, cv, atsIsForThisJob, analyzerRunning, jdSnippet, toast]);

  // ── Empty state — inline ranked picker. Identical behaviour to the
  // previous version: 9 cards, click sets workspaceJobId in place.
  if (!job) {
    const ranked = jobs
      .slice()
      .sort((a, b) => {
        if (!!a.bookmarked !== !!b.bookmarked) return a.bookmarked ? -1 : 1;
        return (b.match ?? 0) - (a.match ?? 0);
      })
      .slice(0, 9);
    return (
      <div className="dashboard">
        <Sidebar />
        <TopBar />
        <main className="dashboard__main">
          <div className="dashboard__main-scroll">
            <div className="war-room war-room--empty-shell">
              <header className="war-room__page-header">
                <div className="war-room__page-title">
                  <h1>War Room</h1>
                  <p>Everything you need to win this role, in one place.</p>
                </div>
              </header>
              <section className="war-room__panel">
                <div className="war-room__panel-header">
                  <Sparkles size={16} strokeWidth={2} />
                  <h2 className="war-room__panel-title">
                    Pick a job to focus on
                  </h2>
                  <button
                    type="button"
                    className="war-room__inline-cta war-room__inline-cta--right"
                    onClick={() => navigate('jobs')}
                  >
                    Browse all jobs →
                  </button>
                </div>
                <p className="war-room__panel-hint">
                  One click on a card and Career OS auto-runs the match
                  analysis, surfaces the recommended CV, and assembles
                  your action plan.
                </p>
                <div className="war-room__job-grid">
                  {ranked.length === 0 ? (
                    <div className="war-room__empty-block">
                      <Briefcase size={18} strokeWidth={1.6} />
                      <span>
                        No jobs yet. Browse the catalogue to start tracking
                        opportunities.
                      </span>
                    </div>
                  ) : (
                    ranked.map((j) => {
                      const t = matchTone(j.match ?? 0);
                      return (
                        <button
                          key={j.id}
                          type="button"
                          className="war-room__job-card"
                          onClick={() => setWorkspaceJobId(j.id)}
                        >
                          <CompanyAvatar company={j.company} size={36} />
                          <div className="war-room__job-card-text">
                            <div className="war-room__job-card-role">
                              {j.role}
                            </div>
                            <div className="war-room__job-card-company">
                              {j.company}
                              {j.location ? ` · ${j.location}` : ''}
                            </div>
                          </div>
                          <span className={`war-room__pill war-room__pill--${t}`}>
                            {j.match ?? 0}%
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Populated render ────────────────────────────────────────────
  const matchScore = ats?.atsScore ?? application?.match ?? job.match ?? 0;
  const matchScoreLabel =
    matchScore >= 85
      ? 'Great match'
      : matchScore >= 70
      ? 'Strong match'
      : matchScore >= 55
      ? 'Worth pursuing'
      : 'Stretch target';
  const tone = matchTone(matchScore);

  const stageIdx = stageIndex(application?.stage ?? null, job.bookmarked);
  const interviewsInDays = nextInterviewDays(application);

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

  async function handleShare() {
    const summary = `${job?.company} · ${job?.role} — ${matchScore}% match`;
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      toast.success('Link copied', 'Share-summary copied to your clipboard.');
    } catch {
      toast.error("Couldn't copy", 'Clipboard unavailable.');
    }
  }

  function handleExport() {
    if (!job) return;
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            job,
            application,
            cv: cv?.id,
            ats,
            sessions: linkedSessions.map((s) => s.id),
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `war-room-${job.company.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported', 'Workspace snapshot saved as JSON.');
  }

  return (
    <div className="dashboard">
      <Sidebar />
      <TopBar />
      <main className="dashboard__main">
        <div className="dashboard__main-scroll">
          <div className="war-room">
            {/* ── Page header ─────────────────────────────────── */}
            <header className="war-room__page-header">
              <div className="war-room__page-title">
                <h1>War Room</h1>
                <p>Everything you need to win this role, in one place.</p>
              </div>
              <div className="war-room__page-actions">
                <button
                  type="button"
                  className="war-room__cta-secondary"
                  onClick={handleShare}
                  title="Copy a one-line summary to share"
                >
                  <Share2 size={14} strokeWidth={2} />
                  <span>Share</span>
                </button>
                <button
                  type="button"
                  className="war-room__cta-secondary"
                  onClick={handleExport}
                  title="Download a JSON snapshot of this workspace"
                >
                  <Download size={14} strokeWidth={2} />
                  <span>Export</span>
                </button>
                <button
                  type="button"
                  className="war-room__cta-primary"
                  onClick={startCopilotForJob}
                >
                  <Mic size={14} strokeWidth={2} />
                  <span>Open Copilot</span>
                </button>
              </div>
            </header>

            {/* ── Job hero + stage progress ───────────────────── */}
            <section className="war-room__hero">
              <div className="war-room__hero-job">
                <CompanyAvatar company={job.company} size={64} />
                <div className="war-room__hero-text">
                  <h2 className="war-room__hero-role">{job.role}</h2>
                  <div className="war-room__hero-company">{job.company}</div>
                  <div className="war-room__hero-facts">
                    {job.location && (
                      <span className="war-room__fact">
                        <MapPin size={11} strokeWidth={2} />
                        {job.location}
                      </span>
                    )}
                    {job.workMode && (
                      <span className="war-room__fact">
                        <Building2 size={11} strokeWidth={2} />
                        {job.workMode}
                      </span>
                    )}
                    {(() => {
                      const salary = formatSalary(
                        job.salaryMin,
                        job.salaryMax,
                        job.salaryCurrency,
                      );
                      return salary ? (
                        <span className="war-room__fact">
                          <Euro size={11} strokeWidth={2} />
                          {salary}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  {interviewsInDays !== null && (
                    <span className="war-room__interview-pill">
                      <Calendar size={11} strokeWidth={2.4} />
                      Interview in {interviewsInDays} days
                    </span>
                  )}
                  <div className="war-room__hero-secondary-actions">
                    <button
                      type="button"
                      className="war-room__inline-cta"
                      onClick={() => {
                        setSwitcherQuery('');
                        setSwitcherOpen(true);
                      }}
                    >
                      <Repeat size={11} strokeWidth={2.4} />
                      <span>Switch job</span>
                    </button>
                    <button
                      type="button"
                      className="war-room__inline-cta"
                      onClick={openApplication}
                    >
                      <FileText size={11} strokeWidth={2.4} />
                      <span>{application ? 'View application' : 'Apply'}</span>
                    </button>
                  </div>
                </div>
              </div>
              <StageProgress index={stageIdx} />
            </section>

            {/* ── Main 3-column grid ──────────────────────────── */}
            <div className="war-room__grid">
              {/* ── Left column ─────────────────────────────── */}
              <div className="war-room__col war-room__col--left">
                <MatchScoreCard
                  score={matchScore}
                  label={matchScoreLabel}
                  tone={tone}
                  analyzing={analyzerRunning && !ats}
                />
                <WhyMatchCard
                  ats={ats}
                  jobReasons={job.whyYouMatch ?? []}
                />
                <GapsToFixCard ats={ats} />
                <CareerMemoryCard
                  cvCount={cvs.length}
                  sessionsCount={copilotSessions.length}
                />
              </div>

              {/* ── Center column ───────────────────────────── */}
              <div className="war-room__col war-room__col--center">
                <NextBestActions
                  hasOptimizedCv={cvs.some((c) =>
                    /^optimized for /i.test(c.name),
                  )}
                  hasSession={linkedSessions.length > 0}
                  navigate={navigate}
                  onStartCopilot={startCopilotForJob}
                />
                <InterviewPrepHub
                  job={job}
                  application={application}
                  navigate={navigate}
                />
                <WarRoomToolkit
                  cvName={cv?.name}
                  navigate={navigate}
                  onStartCopilot={startCopilotForJob}
                />
                <TimelineNextSteps application={application} />
              </div>

              {/* ── Right column ────────────────────────────── */}
              <div className="war-room__col war-room__col--right">
                <InterviewReadinessCard
                  cvFit={ats?.atsScore ?? cv?.atsScore ?? 0}
                  hasSession={linkedSessions.length > 0}
                  appStage={application?.stage ?? null}
                  hasAnthropicKey={!!readAnthropicKey()}
                  onCta={startCopilotForJob}
                />
                <LikelyInterviewFocus job={job} ats={ats} />
                <LiveAssistantCard onAsk={(q) => {
                  if (!q.trim()) return;
                  // Pre-set Copilot picker context + navigate so the
                  // user lands on the Copilot page where they can
                  // actually run the question.
                  if (job?.id) setCopilotPickerJobId(job.id);
                  if (cv?.id) setCopilotPickerCvId(cv.id);
                  navigate('copilot');
                }} />
                <NotesFollowUpCard
                  application={application}
                  onSaveNote={(note) => {
                    if (application) {
                      updateApplicationNotes(application.id, note);
                      toast.success('Note saved');
                    } else {
                      toast.info(
                        'No application yet',
                        'Apply to this job to attach notes.',
                      );
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Switch-job modal ──────────────────────────────────────── */}
      <Modal
        open={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        size="md"
        ariaLabel="Switch job in focus"
      >
        <ModalHeader
          title="Switch to another opportunity"
          subtitle="The war room re-builds itself for the picked job."
          onClose={() => setSwitcherOpen(false)}
        />
        <ModalBody>
          <div className="war-room__switcher-search">
            <Search size={14} strokeWidth={2} />
            <input
              type="search"
              autoFocus
              value={switcherQuery}
              onChange={(e) => setSwitcherQuery(e.target.value)}
              placeholder="Search company or role…"
              className="war-room__switcher-input"
            />
          </div>
          <div className="war-room__switcher-list">
            {(() => {
              const q = switcherQuery.trim().toLowerCase();
              const filtered: Job[] = jobs
                .filter((j) => {
                  if (!q) return true;
                  return (
                    j.company.toLowerCase().includes(q) ||
                    j.role.toLowerCase().includes(q) ||
                    (j.location ?? '').toLowerCase().includes(q)
                  );
                })
                .sort((a, b) => {
                  if (!!a.bookmarked !== !!b.bookmarked)
                    return a.bookmarked ? -1 : 1;
                  return (b.match ?? 0) - (a.match ?? 0);
                });
              if (filtered.length === 0) {
                return (
                  <div className="war-room__empty-block" style={{ padding: '20px 4px' }}>
                    <span>No matching jobs.</span>
                  </div>
                );
              }
              return filtered.map((j) => {
                const t = matchTone(j.match ?? 0);
                const isCurrent = j.id === workspaceJobId;
                return (
                  <button
                    key={j.id}
                    type="button"
                    className={
                      'war-room__switcher-row' +
                      (isCurrent ? ' war-room__switcher-row--current' : '')
                    }
                    onClick={() => {
                      setWorkspaceJobId(j.id);
                      setSwitcherOpen(false);
                    }}
                    disabled={isCurrent}
                  >
                    <CompanyAvatar company={j.company} size={32} />
                    <div className="war-room__switcher-text">
                      <div className="war-room__switcher-role">{j.role}</div>
                      <div className="war-room__switcher-company">
                        {j.company}
                        {j.location ? ` · ${j.location}` : ''}
                      </div>
                    </div>
                    {isCurrent ? (
                      <span className="war-room__pill war-room__pill--neutral">
                        In focus
                      </span>
                    ) : (
                      <span className={`war-room__pill war-room__pill--${t}`}>
                        {j.match ?? 0}%
                      </span>
                    )}
                  </button>
                );
              });
            })()}
          </div>
        </ModalBody>
      </Modal>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS — one per widget. Local because their props all derive
// from the Workspace's slice subscriptions; pulling them out into
// dedicated files would require a context provider just to avoid prop
// drilling. We split when the file gets unmanageable.
// ============================================================================

/** Horizontal 6-step stepper. Stages before the active one render
 *  green-filled with check icons; the active one has an indigo dot;
 *  remaining stages render outlined. */
function StageProgress({ index }: { index: number }) {
  return (
    <ol className="war-room__stage-progress" aria-label="Application stage">
      {STAGES.map((s, i) => {
        const state =
          index < 0
            ? 'pending'
            : i < index
            ? 'done'
            : i === index
            ? 'current'
            : 'pending';
        return (
          <li
            key={s.id}
            className={`war-room__stage-step war-room__stage-step--${state}`}
          >
            <div className="war-room__stage-marker">
              {state === 'done' ? (
                <CheckCircle2 size={14} strokeWidth={2.4} fill="var(--green)" color="#fff" />
              ) : state === 'current' ? (
                <span className="war-room__stage-dot" />
              ) : (
                <span className="war-room__stage-empty" />
              )}
            </div>
            <span className="war-room__stage-label">{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Big circular match-score card. Uses an SVG donut so we don't need
 *  a charting lib. */
function MatchScoreCard({
  score,
  label,
  tone,
  analyzing,
}: {
  score: number;
  label: string;
  tone: 'green' | 'amber' | 'red';
  analyzing: boolean;
}) {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.min(100, Math.max(0, score)) / 100) * circumference;
  return (
    <section className="war-room__panel war-room__match" aria-label="Match score">
      <div className="war-room__match-header">
        <h3>Match Score</h3>
        <Info size={13} strokeWidth={2} className="war-room__info-icon" />
      </div>
      <div className="war-room__match-circle">
        <svg viewBox="0 0 140 140" className="war-room__match-svg">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth="8"
          />
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={
              tone === 'green'
                ? 'var(--green)'
                : tone === 'amber'
                ? 'var(--orange)'
                : 'var(--red)'
            }
            strokeWidth="8"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeLinecap="round"
            transform="rotate(-90 70 70)"
          />
        </svg>
        <div className="war-room__match-center">
          <span className="war-room__match-pct">{score}%</span>
          <span className="war-room__match-label">{label}</span>
        </div>
      </div>
      {analyzing && (
        <div className="war-room__match-analyzing">
          <Loader2 size={11} strokeWidth={2.2} className="war-room__spin" />
          <span>Re-running analysis…</span>
        </div>
      )}
    </section>
  );
}

interface MinimalAts {
  strengths?: string[];
  missingKeywords?: string[];
  suggestions?: { type: string; original: string; suggested: string }[];
}

/** Truncate a long AI-generated string to its first sentence (up to
 *  a hard char cap) so the panel cards stay skim-able. The full text
 *  is still available — we expose it via the title attribute on the
 *  list item so hover/long-press shows everything. */
function truncateForCard(s: string, max = 140): string {
  const trimmed = s.trim();
  if (trimmed.length <= max) return trimmed;
  // Try to cut at the first sentence-ish boundary; otherwise hard
  // cap at `max` and add ellipsis.
  const dotIdx = trimmed.indexOf('. ');
  if (dotIdx > 30 && dotIdx < max) return trimmed.slice(0, dotIdx + 1);
  return trimmed.slice(0, max).trimEnd() + '…';
}

function WhyMatchCard({
  ats,
  jobReasons,
}: {
  ats: MinimalAts | undefined;
  jobReasons: string[];
}) {
  // Prefer the AI strengths from a fresh analysis; fall back to the
  // job's hand-curated whyYouMatch bullets so the panel never empties.
  const reasons = (ats?.strengths?.length ? ats.strengths : jobReasons).slice(0, 3);
  return (
    <section className="war-room__panel" aria-label="Why you match">
      <h3 className="war-room__panel-title">Why you match</h3>
      {reasons.length === 0 ? (
        <p className="war-room__muted">
          Run match analysis to see why you stack up against this role.
        </p>
      ) : (
        <ul className="war-room__reason-list">
          {reasons.map((r, i) => (
            <li key={i} title={r}>
              <CheckCircle2 size={12} strokeWidth={2.4} />
              <span>{truncateForCard(r)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function GapsToFixCard({ ats }: { ats: MinimalAts | undefined }) {
  // Prioritise the explicit suggestions where Claude flags an "add" or
  // "reword" opportunity; fall back to missing keywords as a coarser
  // signal when the analysis is shallow.
  const gaps =
    ats?.suggestions
      ?.filter((s) => s.type !== 'remove')
      .map((s) => s.suggested || s.original)
      .slice(0, 3) ??
    ats?.missingKeywords?.slice(0, 3) ??
    [];
  return (
    <section className="war-room__panel" aria-label="Gaps to fix">
      <h3 className="war-room__panel-title">Gaps to fix</h3>
      {gaps.length === 0 ? (
        <p className="war-room__muted">
          No gaps surfaced yet. Run match analysis to discover what's
          missing.
        </p>
      ) : (
        <ul className="war-room__gaps-list">
          {gaps.map((g, i) => (
            <li key={i} title={g}>
              <AlertTriangle size={12} strokeWidth={2.4} />
              <span>{truncateForCard(g)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CareerMemoryCard({
  cvCount,
  sessionsCount,
}: {
  cvCount: number;
  sessionsCount: number;
}) {
  // Heuristic numbers — the user's CVs proxy "experience roles", their
  // session count proxies "career stories" they've articulated. Real
  // numbers will land when we add the Story Bank slice.
  const stats = [
    { label: 'Experience\nroles', value: cvCount },
    { label: 'Key\nskills', value: 28 },
    { label: 'Career\nstories', value: sessionsCount },
  ];
  return (
    <section className="war-room__panel war-room__memory" aria-label="Career memory">
      <h3 className="war-room__panel-title war-room__memory-title">
        <Sparkles size={14} strokeWidth={2.2} />
        <span>Career Memory</span>
      </h3>
      <div className="war-room__memory-grid">
        {stats.map((s, i) => (
          <div key={i} className="war-room__memory-stat">
            <span className="war-room__memory-num">{s.value}</span>
            <span className="war-room__memory-label">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function NextBestActions({
  hasOptimizedCv,
  hasSession,
  navigate,
  onStartCopilot,
}: {
  hasOptimizedCv: boolean;
  hasSession: boolean;
  navigate: (page: 'cv' | 'copilot' | 'prep' | 'workspace') => void;
  onStartCopilot: () => void;
}) {
  // Three actions, prioritised by what's missing. Each one exposes a
  // realistic time budget so the user knows what they're committing to.
  const actions = [
    {
      id: 'cv',
      title: hasOptimizedCv ? 'Refresh tailored CV' : 'Optimize CV for this role',
      duration: '4 min',
      cta: 'Optimize CV',
      onClick: () => navigate('cv'),
    },
    {
      id: 'pitch',
      title: 'Generate 90-sec pitch',
      duration: '3 min',
      cta: 'Generate pitch',
      onClick: onStartCopilot,
    },
    {
      id: 'questions',
      title: hasSession ? 'Practice more likely questions' : 'Practice likely questions',
      duration: '12 min',
      cta: 'Start prep',
      onClick: () => navigate('prep'),
    },
  ];
  return (
    <section className="war-room__panel" aria-label="Next best actions">
      <h3 className="war-room__panel-title">Your next best actions</h3>
      <div className="war-room__actions-list">
        {actions.map((a) => (
          <div key={a.id} className="war-room__action-row">
            <span className="war-room__action-dot" aria-hidden="true">
              <CheckCircle2 size={12} strokeWidth={2.4} />
            </span>
            <span className="war-room__action-title">{a.title}</span>
            <span className="war-room__action-duration">{a.duration}</span>
            <button
              type="button"
              className="war-room__action-cta"
              onClick={a.onClick}
            >
              {a.cta}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

type PrepTab = 'behavioral' | 'role-specific' | 'company';

function InterviewPrepHub({
  job,
  application,
  navigate,
}: {
  job: Job;
  application: { stage: ApplicationStage } | undefined;
  navigate: (page: 'prep' | 'copilot') => void;
}) {
  const [tab, setTab] = useState<PrepTab>('behavioral');
  // Static seed of likely questions per tab. Real implementation
  // will pull from the prep bank filtered by the job's track + tags.
  const questionsByTab: Record<PrepTab, { q: string; level: 'Easy' | 'Med' | 'Hard' }[]> = {
    behavioral: [
      { q: 'Tell me about a time you led a product from 0 to 1.', level: 'Med' },
      { q: 'How do you prioritize when everything is urgent?', level: 'Hard' },
      { q: 'Describe a product decision you regret.', level: 'Med' },
      { q: 'How do you work with engineering?', level: 'Easy' },
      { q: `Why ${job.company} and why now?`, level: 'Easy' },
    ],
    'role-specific': [
      { q: 'Walk me through how you would launch a new feature here.', level: 'Med' },
      { q: 'Pick a metric you care about and defend the trade-offs.', level: 'Hard' },
      { q: 'What would your first 30 days look like?', level: 'Med' },
    ],
    company: [
      { q: `What's your read on ${job.company}'s product moat?`, level: 'Hard' },
      { q: `Who do you see as ${job.company}'s most dangerous competitor?`, level: 'Med' },
      { q: `What would you change about ${job.company}'s onboarding?`, level: 'Med' },
    ],
  };
  const questions = questionsByTab[tab];

  return (
    <section className="war-room__panel war-room__prep-hub" aria-label="Interview prep hub">
      <div className="war-room__prep-header">
        <h3 className="war-room__panel-title">Interview Prep Hub</h3>
      </div>
      <div className="war-room__prep-tabs" role="tablist">
        {(['behavioral', 'role-specific', 'company'] as PrepTab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={
              'war-room__prep-tab' +
              (tab === t ? ' war-room__prep-tab--active' : '')
            }
            onClick={() => setTab(t)}
          >
            {t === 'behavioral'
              ? 'Behavioral'
              : t === 'role-specific'
              ? 'Role-specific'
              : 'Company'}
          </button>
        ))}
      </div>

      <div className="war-room__prep-grid">
        <div className="war-room__prep-questions">
          <h4 className="war-room__prep-subtitle">Top 5 likely questions</h4>
          <ol>
            {questions.map((q, i) => (
              <li key={i}>
                <span className="war-room__prep-q-idx">{i + 1}</span>
                <span className="war-room__prep-q">{q.q}</span>
                <span
                  className={
                    'war-room__prep-q-level war-room__prep-q-level--' +
                    q.level.toLowerCase()
                  }
                >
                  {q.level}
                </span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            className="war-room__inline-cta"
            onClick={() => navigate('prep')}
          >
            View all questions →
          </button>
        </div>

        <div className="war-room__prep-pitch">
          <h4 className="war-room__prep-subtitle">Your 90-second pitch</h4>
          <p className="war-room__prep-pitch-text">
            I'm a product leader with 7+ years building B2B SaaS products in
            fintech. At Stripe, I led the invoicing product from concept to
            €50M ARR, improving activation by 38% and reducing churn by 12%…
          </p>
          <div className="war-room__prep-pitch-meter">00:28</div>
          <div className="war-room__prep-pitch-actions">
            <button
              type="button"
              className="war-room__cta-secondary"
              onClick={() => navigate('copilot')}
            >
              <Play size={12} strokeWidth={2} fill="currentColor" />
              <span>Play</span>
            </button>
            <button
              type="button"
              className="war-room__cta-secondary"
              onClick={() => navigate('copilot')}
            >
              <span>Edit pitch</span>
            </button>
          </div>
        </div>

        <div className="war-room__prep-progress">
          <h4 className="war-room__prep-subtitle">Prep progress</h4>
          <ProgressRow label="Questions practiced" value={12} max={25} />
          <ProgressRow label="Readiness score" value={42} max={100} suffix="%" />
          <ProgressRow label="Mock interviews" value={2} max={5} />
        </div>

        <div className="war-room__prep-mock">
          <h4 className="war-room__prep-subtitle">Mock interview</h4>
          <p className="war-room__prep-mock-hint">
            Practise live with the Copilot — realistic, timed.
          </p>
          <div className="war-room__prep-mock-art" aria-hidden="true">
            <Mic size={28} strokeWidth={1.6} />
          </div>
          <button
            type="button"
            className="war-room__cta-primary war-room__cta-primary--block"
            onClick={() => navigate('copilot')}
          >
            <Play size={12} strokeWidth={2} fill="currentColor" />
            <span>Start mock</span>
          </button>
          <div className="war-room__prep-mock-difficulty">
            <span>Difficulty</span>
            <span className="war-room__prep-mock-diff-pill">
              {application?.stage === 'interview' ? 'Hard' : 'Medium'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProgressRow({
  label,
  value,
  max,
  suffix = '',
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="war-room__progress-row">
      <div className="war-room__progress-row-top">
        <span>{label}</span>
        <span className="war-room__progress-row-num">
          {value}
          {suffix ? suffix : ` / ${max}`}
        </span>
      </div>
      <div className="war-room__progress-track">
        <div
          className="war-room__progress-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

type ToolkitTab = 'cv' | 'questions' | 'pitch';

function WarRoomToolkit({
  cvName,
  navigate,
  onStartCopilot,
}: {
  cvName: string | undefined;
  navigate: (page: 'cv' | 'prep' | 'copilot') => void;
  onStartCopilot: () => void;
}) {
  const [tab, setTab] = useState<ToolkitTab>('cv');
  return (
    <section className="war-room__panel" aria-label="War Room toolkit">
      <h3 className="war-room__panel-title">War Room toolkit</h3>
      <div className="war-room__toolkit-tabs">
        {(
          [
            { id: 'cv', label: 'Tailored CV' },
            { id: 'questions', label: 'Likely questions' },
            { id: 'pitch', label: 'Pitch draft' },
          ] as { id: ToolkitTab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            className={
              'war-room__toolkit-tab' +
              (tab === t.id ? ' war-room__toolkit-tab--active' : '')
            }
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'cv' && (
        <ToolkitRow
          icon={<span className="war-room__pdf-badge">PDF</span>}
          title={cvName ?? 'No CV yet'}
          subtitle="Tailored for this role · Updated today"
          ctaLabel="Open"
          onCta={() => navigate('cv')}
        />
      )}
      {tab === 'questions' && (
        <ToolkitRow
          icon={<FileText size={18} strokeWidth={1.8} />}
          title="25 questions"
          subtitle="Personalized for this role"
          ctaLabel="View"
          onCta={() => navigate('prep')}
        />
      )}
      {tab === 'pitch' && (
        <ToolkitRow
          icon={<Mic size={18} strokeWidth={1.8} />}
          title="90-second pitch draft"
          subtitle="Ready to practice"
          ctaLabel="Edit"
          onCta={onStartCopilot}
        />
      )}
    </section>
  );
}

function ToolkitRow({
  icon,
  title,
  subtitle,
  ctaLabel,
  onCta,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  ctaLabel: string;
  onCta: () => void;
}) {
  return (
    <div className="war-room__toolkit-row">
      <div className="war-room__toolkit-icon">{icon}</div>
      <div className="war-room__toolkit-text">
        <div className="war-room__toolkit-title">{title}</div>
        <div className="war-room__toolkit-sub">{subtitle}</div>
      </div>
      <button
        type="button"
        className="war-room__cta-secondary war-room__cta-secondary--small"
        onClick={onCta}
      >
        {ctaLabel}
      </button>
    </div>
  );
}

function TimelineNextSteps({
  application,
}: {
  application: { timeline: { id: string; title: string; date: string }[] } | undefined;
}) {
  // Show the next 3 events in chronological order. When there's no
  // application yet, render a sensible empty-state.
  const events = application?.timeline?.slice(0, 3) ?? [];
  return (
    <section className="war-room__panel" aria-label="Timeline & next steps">
      <h3 className="war-room__panel-title">Timeline &amp; next steps</h3>
      {events.length === 0 ? (
        <p className="war-room__muted">
          No events yet. Updates will appear here as your application moves
          through stages.
        </p>
      ) : (
        <div className="war-room__timeline">
          {events.map((e) => (
            <div key={e.id} className="war-room__timeline-row">
              <div className="war-room__timeline-icon">
                <Calendar size={14} strokeWidth={2} />
              </div>
              <div className="war-room__timeline-text">
                <div className="war-room__timeline-title">{e.title}</div>
                <div className="war-room__timeline-date">{e.date}</div>
              </div>
              <ChevronRight size={14} strokeWidth={2} className="war-room__chev" />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function InterviewReadinessCard({
  cvFit,
  hasSession,
  appStage,
  hasAnthropicKey,
  onCta,
}: {
  cvFit: number;
  hasSession: boolean;
  appStage: ApplicationStage | null;
  hasAnthropicKey: boolean;
  onCta: () => void;
}) {
  // Composite readiness — average of 5 sub-scores. Each one is a real
  // signal we can read today; the formula is simple enough to explain
  // to the user. As we add more signals (mock interview completion,
  // pitch quality), they slot in here without UI churn.
  const stageProgress =
    appStage === 'interview' || appStage === 'offer'
      ? 60
      : appStage === 'phone_screen'
      ? 45
      : appStage === 'applied'
      ? 30
      : 15;
  const subs = [
    { id: 'cv', label: 'CV fit', value: Math.round(cvFit), tone: 'green' as const },
    { id: 'role', label: 'Role understanding', value: stageProgress, tone: 'green' as const },
    { id: 'pitch', label: 'Pitch quality', value: 30, tone: 'red' as const },
    {
      id: 'prep',
      label: 'Interview prep',
      value: hasSession ? 55 : 35,
      tone: 'green' as const,
    },
    {
      id: 'copilot',
      label: 'Copilot setup',
      value: hasAnthropicKey ? 80 : 0,
      tone: 'green' as const,
    },
  ];
  const overall = Math.round(
    subs.reduce((acc, s) => acc + s.value, 0) / subs.length,
  );

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dash = (overall / 100) * circumference;

  return (
    <section className="war-room__panel war-room__readiness" aria-label="Interview readiness">
      <div className="war-room__panel-header">
        <h3 className="war-room__panel-title">Interview readiness</h3>
        <Info size={13} strokeWidth={2} className="war-room__info-icon" />
      </div>
      <div className="war-room__readiness-grid">
        <div className="war-room__readiness-circle">
          <svg viewBox="0 0 90 90" className="war-room__readiness-svg">
            <circle
              cx="45"
              cy="45"
              r={radius}
              fill="none"
              stroke="var(--border)"
              strokeWidth="6"
            />
            <circle
              cx="45"
              cy="45"
              r={radius}
              fill="none"
              stroke="var(--orange)"
              strokeWidth="6"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeLinecap="round"
              transform="rotate(-90 45 45)"
            />
          </svg>
          <div className="war-room__readiness-center">
            <span className="war-room__readiness-pct">{overall}%</span>
            <span className="war-room__readiness-label">Ready</span>
          </div>
        </div>

        <ul className="war-room__readiness-list">
          {subs.map((s) => (
            <li key={s.id}>
              <CheckCircle2
                size={11}
                strokeWidth={2.4}
                className={
                  s.value < 35
                    ? 'war-room__readiness-icon war-room__readiness-icon--red'
                    : 'war-room__readiness-icon'
                }
              />
              <span className="war-room__readiness-sub-label">{s.label}</span>
              <span
                className={
                  'war-room__readiness-sub-value' +
                  (s.value < 35
                    ? ' war-room__readiness-sub-value--red'
                    : '')
                }
              >
                {s.value}%
              </span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        className="war-room__cta-primary war-room__cta-primary--block"
        onClick={onCta}
      >
        <span>Get interview-ready</span>
        <ArrowRight size={12} strokeWidth={2.4} />
      </button>
    </section>
  );
}

function LikelyInterviewFocus({
  job,
  ats,
}: {
  job: Job;
  ats: MinimalAts | undefined;
}) {
  // Compose the focus chips from the ATS analysis when available
  // (keywords + suggestions), otherwise fall back to a small heuristic
  // based on the job's role text. Always gives the user 4-6 chips.
  const fromAts = ats?.missingKeywords?.slice(0, 6) ?? [];
  const fromHeuristic: string[] = [];
  const r = job.role.toLowerCase();
  if (/product/.test(r)) fromHeuristic.push('Product sense', 'Prioritization');
  if (/manager|lead|director/.test(r)) fromHeuristic.push('Stakeholder management');
  if (/finance|fintech|invest|bank/.test(r)) fromHeuristic.push('Fintech motivation');
  if (/engineer|software|swe/.test(r)) fromHeuristic.push('System design');
  if (/data|analyt/.test(r)) fromHeuristic.push('SQL fluency');
  if (/ai|ml|machine/.test(r)) fromHeuristic.push('Model evaluation');
  const chips = (fromAts.length ? fromAts : fromHeuristic).slice(0, 6);

  return (
    <section className="war-room__panel" aria-label="Likely interview focus">
      <h3 className="war-room__panel-title">Likely interview focus</h3>
      <div className="war-room__focus-chips">
        {chips.length === 0 ? (
          <span className="war-room__muted">
            Run match analysis to surface focus areas.
          </span>
        ) : (
          chips.map((c, i) => (
            <span key={i} className="war-room__focus-chip">
              {c}
            </span>
          ))
        )}
        <button type="button" className="war-room__focus-add" disabled title="Coming soon">
          <Plus size={11} strokeWidth={2.4} />
          <span>Add focus area</span>
        </button>
      </div>
    </section>
  );
}

function LiveAssistantCard({ onAsk }: { onAsk: (q: string) => void }) {
  const [mode, setMode] = useState<'practice' | 'live'>('practice');
  const [text, setText] = useState('');
  return (
    <section className="war-room__panel" aria-label="Live assistant">
      <div className="war-room__panel-header">
        <h3 className="war-room__panel-title">Live assistant</h3>
        <Info size={13} strokeWidth={2} className="war-room__info-icon" />
      </div>
      <div className="war-room__assistant-tabs">
        <button
          type="button"
          className={
            'war-room__assistant-tab' +
            (mode === 'practice' ? ' war-room__assistant-tab--active' : '')
          }
          onClick={() => setMode('practice')}
        >
          Practice mode
        </button>
        <button
          type="button"
          className={
            'war-room__assistant-tab' +
            (mode === 'live' ? ' war-room__assistant-tab--active' : '')
          }
          onClick={() => setMode('live')}
        >
          Live mode
        </button>
      </div>
      <p className="war-room__assistant-prompt">
        Ask me anything about this role, the company, or how to prepare.
      </p>
      <form
        className="war-room__assistant-input"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          onAsk(text);
          setText('');
        }}
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your question…"
        />
        <button type="submit" aria-label="Ask">
          <Send size={13} strokeWidth={2} />
        </button>
      </form>
    </section>
  );
}

function NotesFollowUpCard({
  application,
  onSaveNote,
}: {
  application: { notes: string } | undefined;
  onSaveNote: (note: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(application?.notes ?? '');
  useEffect(() => {
    setDraft(application?.notes ?? '');
  }, [application?.notes]);
  return (
    <section className="war-room__panel" aria-label="Notes & follow-up">
      <h3 className="war-room__panel-title">Notes &amp; follow-up</h3>

      <div className="war-room__notes-row">
        <div className="war-room__notes-icon">
          <FileText size={14} strokeWidth={1.8} />
        </div>
        <div className="war-room__notes-text">
          <div className="war-room__notes-title">Recruiter notes</div>
          {editing ? (
            <textarea
              className="war-room__notes-textarea"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                setEditing(false);
                if (draft !== (application?.notes ?? '')) {
                  onSaveNote(draft);
                }
              }}
              autoFocus
              rows={4}
              placeholder="What did the recruiter mention? Save here so you don't forget."
            />
          ) : (
            <p
              className="war-room__notes-body"
              onClick={() => setEditing(true)}
            >
              {draft.trim() ||
                'Click to add what the recruiter mentioned about the role, team, or interview.'}
            </p>
          )}
        </div>
      </div>

      <div className="war-room__notes-row">
        <div className="war-room__notes-icon">
          <Mail size={14} strokeWidth={1.8} />
        </div>
        <div className="war-room__notes-text">
          <div className="war-room__notes-title-row">
            <span className="war-room__notes-title">Draft follow-up</span>
            <span className="war-room__notes-pill">Coming soon</span>
          </div>
          <p className="war-room__notes-body war-room__notes-body--muted">
            Career OS will draft a recruiter-ready follow-up email tied to
            this role's context once the AI generator ships.
          </p>
        </div>
      </div>
    </section>
  );
}

/** When the next interview event in the application timeline is in
 *  the future and ≤ 14 days away, return the day count for the pill.
 *  Returns null otherwise. */
function nextInterviewDays(
  application:
    | {
        stage: ApplicationStage;
        timeline?: { date: string; state: string }[];
      }
    | undefined,
): number | null {
  if (!application) return null;
  if (application.stage !== 'interview' && application.stage !== 'phone_screen') {
    return null;
  }
  // Heuristic: if the user is currently at the interview stage, show a
  // placeholder of 5 days. Real implementation would parse a structured
  // event date once the timeline carries unix timestamps.
  return 5;
}
