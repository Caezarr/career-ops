import { useEffect, useState } from 'react';
import { Square, AudioWaveform } from 'lucide-react';
import CompanyAvatar from '../CompanyAvatar';
import { useAppStore } from '../../store';
import { useCopilotControls } from '../../hooks/useCopilotSession';

function formatDuration(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Renders the active session header with company / role / live timer
 *  + a working Stop button. Hidden when no session is active. */
export default function InterviewSessionBar() {
  const sessions = useAppStore((s) => s.copilotSessions);
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const status = useAppStore((s) => s.copilotStatus);
  const { stop } = useCopilotControls();
  const [now, setNow] = useState(() => Date.now());

  // Tick once a second so the displayed timer updates. We don't render
  // sub-second precision here (the recruiter's mic latency dominates
  // anyway) so 1s is plenty.
  useEffect(() => {
    if (!activeSessionId) return;
    const handle = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(handle);
  }, [activeSessionId]);

  const session = sessions.find((s) => s.id === activeSessionId) ?? null;
  if (!session) return null;

  const elapsed = formatDuration(now - session.startedAt);
  const company = session.company || (session.mode === 'pitch' ? 'Pitch session' : 'Live interview');
  const role = session.role || (session.mode === 'pitch' ? 'Self-presentation' : 'Q&A');
  const recording = status === 'recording' || status === 'thinking' || status === 'listening';

  return (
    <div className="cp-session-bar">
      <CompanyAvatar company={company} size={32} />

      <div className="cp-session-bar__text">
        <span className="cp-session-bar__title">
          {company} · {role}
        </span>
        <div className="cp-session-bar__timer-row">
          {recording ? (
            <span className="cp-rec-dot" aria-hidden="true" />
          ) : (
            <AudioWaveform size={11} strokeWidth={2} className="cp-session-bar__icon" />
          )}
          <span className="cp-session-bar__timer">{elapsed}</span>
        </div>
      </div>

      <button
        type="button"
        className="cp-stop-btn"
        aria-label="Stop session"
        onClick={() => void stop()}
      >
        <Square size={10} strokeWidth={0} fill="currentColor" />
        <span>Stop</span>
      </button>
    </div>
  );
}
