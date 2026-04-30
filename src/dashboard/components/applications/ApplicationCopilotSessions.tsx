import { useMemo, useState } from 'react';
import { Sparkles, Mic, Play, ExternalLink } from 'lucide-react';
import { useAppStore } from '../../store';
import { useNavigation } from '../../navigation';
import CopilotSessionDetailModal from '../copilot/CopilotSessionDetailModal';

interface ApplicationCopilotSessionsProps {
  /** Job id of the linked posting — sessions filter on this. */
  jobId: string;
  /** CV id to seed the Copilot picker with when the user clicks
   *  "Start session". When omitted, the picker falls back to its
   *  saved choice / defaultCvId. */
  cvId?: string;
}

/** Tied Copilot sessions for an application. Surfaces the last 5
 *  Copilot sessions whose `jobId` matches this application's job, so
 *  the user can review past mock interviews / pitches for this role
 *  without leaving the Applications page. Empty state offers a
 *  one-click jump into the Copilot page with the picker pre-set. */
export default function ApplicationCopilotSessions({
  jobId,
  cvId,
}: ApplicationCopilotSessionsProps) {
  const sessions = useAppStore((s) => s.copilotSessions);
  const setPickerJobId = useAppStore((s) => s.setCopilotPickerJobId);
  const setPickerCvId = useAppStore((s) => s.setCopilotPickerCvId);
  const { navigate } = useNavigation();
  const [openId, setOpenId] = useState<string | null>(null);

  const tied = useMemo(
    () => sessions.filter((s) => s.jobId === jobId).slice(0, 5),
    [sessions, jobId],
  );

  function startSession() {
    // Pre-set the picker so the in-page Copilot panel reflects this
    // application's job + CV the moment the user lands on the page.
    // Actual session start still requires a click on the Start CTA —
    // we don't auto-start to give the user a chance to review the
    // picker.
    setPickerJobId(jobId);
    if (cvId) setPickerCvId(cvId);
    navigate('copilot');
  }

  function formatRelative(at: number): string {
    const elapsedMs = Date.now() - at;
    const m = Math.floor(elapsedMs / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(at).toLocaleDateString();
  }

  return (
    <section className="app-copilot-sessions" aria-label="Linked Copilot sessions">
      <header className="app-copilot-sessions__header">
        <div className="app-copilot-sessions__title-row">
          <Sparkles size={14} strokeWidth={2} className="app-copilot-sessions__title-icon" />
          <span className="app-copilot-sessions__title">Copilot sessions</span>
        </div>
        <button
          type="button"
          className="app-copilot-sessions__start"
          onClick={startSession}
          title="Open the Copilot page with this job pre-selected"
        >
          <Play size={11} strokeWidth={2} fill="currentColor" />
          <span>Start session</span>
        </button>
      </header>

      {tied.length === 0 ? (
        <div className="app-copilot-sessions__empty">
          <Mic size={14} strokeWidth={1.6} />
          <span>
            No Copilot sessions tied to this application yet. Start one
            and Career OS will use the JD + CV as live context.
          </span>
        </div>
      ) : (
        <ul className="app-copilot-sessions__list">
          {tied.map((sess) => {
            const turns = sess.transcript.length;
            const answers = sess.answers.length;
            const minutes = sess.endedAt
              ? Math.max(1, Math.round((sess.endedAt - sess.startedAt) / 60000))
              : null;
            return (
              <li key={sess.id}>
                <button
                  type="button"
                  className="app-copilot-sessions__row"
                  onClick={() => setOpenId(sess.id)}
                  title="Open transcript"
                >
                  <div className="app-copilot-sessions__row-text">
                    <span className="app-copilot-sessions__row-title">
                      {sess.mode === 'pitch' ? 'Pitch session' : 'Live interview'}
                      {sess.endedAt === null && (
                        <span className="app-copilot-sessions__live">Live</span>
                      )}
                    </span>
                    <span className="app-copilot-sessions__row-meta">
                      {turns} turn{turns === 1 ? '' : 's'} ·{' '}
                      {answers} answer{answers === 1 ? '' : 's'}
                      {minutes ? ` · ${minutes} min` : ''}
                    </span>
                  </div>
                  <span className="app-copilot-sessions__row-time">
                    {formatRelative(sess.startedAt)}
                  </span>
                  <ExternalLink size={12} strokeWidth={2} className="app-copilot-sessions__row-chev" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <CopilotSessionDetailModal
        open={openId !== null}
        sessionId={openId}
        onClose={() => setOpenId(null)}
      />
    </section>
  );
}
