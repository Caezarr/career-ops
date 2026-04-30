import { AudioWaveform, Play, Square, Sparkles } from 'lucide-react';
import { useAppStore } from '../../store';
import { useCopilotControls } from '../../hooks/useCopilotSession';

function formatStartedAgo(startedAt: number): string {
  const elapsedMs = Date.now() - startedAt;
  const m = Math.floor(elapsedMs / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/** Top-of-page summary card for the Copilot section. Replaces the
 *  popup-window flow — the Start button kicks off the session inline,
 *  the panel on the right does the rest. When a session is active it
 *  shows live elapsed + a Stop button. When idle it shows the last
 *  session as context, or an empty state for first-time users. */
export default function InterviewInProgress() {
  const sessions = useAppStore((s) => s.copilotSessions);
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const status = useAppStore((s) => s.copilotStatus);
  const mode = useAppStore((s) => s.copilotMode);
  const { start, stop } = useCopilotControls();

  const active = sessions.find((s) => s.id === activeSessionId) ?? null;
  const lastEnded = active ? null : sessions.find((s) => s.endedAt !== null);

  // ── Active session state ────────────────────────────────────────
  if (active) {
    const startedAgo = formatStartedAgo(active.startedAt);
    const company = active.company || (active.mode === 'pitch' ? 'Pitch session' : 'Live interview');
    const role = active.role || (active.mode === 'pitch' ? 'Self-presentation' : 'Q&A');

    return (
      <section className="cp-interview-card" aria-label="Interview in progress">
        <div className="cp-interview-card__top">
          <div className="cp-interview-card__avatar" aria-hidden="true">
            <AudioWaveform size={22} strokeWidth={2} />
          </div>
          <div className="cp-interview-card__text">
            <div className="cp-interview-card__title-row">
              <span className="cp-interview-card__title">{company}</span>
              {(status === 'recording' || status === 'thinking' || status === 'listening') && (
                <span className="cp-pill cp-pill--green">Live</span>
              )}
            </div>
            <span className="cp-interview-card__subtitle">
              {role} · {active.mode === 'pitch' ? 'Pitch mode' : 'Q&A mode'}
            </span>
            <span className="cp-interview-card__started">Started {startedAgo}</span>
          </div>
        </div>

        <div className="cp-interview-card__actions">
          <button
            type="button"
            className="cp-btn cp-btn--danger"
            onClick={() => void stop()}
          >
            <Square size={12} strokeWidth={0} fill="currentColor" />
            <span>Stop session</span>
          </button>
        </div>
      </section>
    );
  }

  // ── Last session — context for the user, plus a fresh Start ─────
  if (lastEnded) {
    const company = lastEnded.company || (lastEnded.mode === 'pitch' ? 'Last pitch' : 'Last interview');
    const role = lastEnded.role || (lastEnded.mode === 'pitch' ? 'Self-presentation' : 'Q&A');
    const elapsed = lastEnded.endedAt
      ? Math.round((lastEnded.endedAt - lastEnded.startedAt) / 60000)
      : 0;

    return (
      <section className="cp-interview-card" aria-label="Last session">
        <div className="cp-interview-card__top">
          <div className="cp-interview-card__avatar" aria-hidden="true">
            <Sparkles size={22} strokeWidth={2} />
          </div>
          <div className="cp-interview-card__text">
            <div className="cp-interview-card__title-row">
              <span className="cp-interview-card__title">{company}</span>
              <span
                className="cp-pill"
                style={{ background: 'var(--bg-soft)', color: 'var(--text-3)' }}
              >
                Ended
              </span>
            </div>
            <span className="cp-interview-card__subtitle">
              {role} · {lastEnded.transcript.length} bubble{lastEnded.transcript.length === 1 ? '' : 's'}
              {elapsed > 0 ? ` · ${elapsed} min` : ''}
            </span>
            <span className="cp-interview-card__started">{formatStartedAgo(lastEnded.startedAt)}</span>
          </div>
        </div>

        <div className="cp-interview-card__actions">
          <button
            type="button"
            className="cp-btn cp-btn--primary"
            onClick={() => void start({ mode })}
          >
            <Play size={14} strokeWidth={2} fill="currentColor" />
            <span>Start new {mode === 'pitch' ? 'pitch' : 'session'}</span>
          </button>
        </div>
      </section>
    );
  }

  // ── First-time / empty state ─────────────────────────────────────
  return (
    <section className="cp-interview-card" aria-label="No active session">
      <div className="cp-interview-card__top">
        <div className="cp-interview-card__avatar" aria-hidden="true">
          <Sparkles size={22} strokeWidth={2} />
        </div>
        <div className="cp-interview-card__text">
          <div className="cp-interview-card__title-row">
            <span className="cp-interview-card__title">No active session</span>
          </div>
          <span className="cp-interview-card__subtitle">
            Start a {mode === 'pitch' ? 'pitch' : 'live'} session — Career OS
            transcribes the recruiter and suggests answers in real time.
          </span>
        </div>
      </div>

      <div className="cp-interview-card__actions">
        <button
          type="button"
          className="cp-btn cp-btn--primary"
          onClick={() => void start({ mode })}
        >
          <Play size={14} strokeWidth={2} fill="currentColor" />
          <span>Start {mode === 'pitch' ? 'pitch' : 'session'}</span>
        </button>
      </div>
    </section>
  );
}
