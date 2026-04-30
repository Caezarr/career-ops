import { useEffect, useMemo, useRef } from 'react';
import { Maximize2, MessageCircle } from 'lucide-react';
import TranscriptBubble from './TranscriptBubble';
import { useAppStore } from '../../store';

/** Format a unix-ms timestamp relative to the session start as
 *  HH:MM:SS, the same shape the overlay used. */
function formatElapsed(at: number, sessionStart: number): string {
  const sec = Math.max(0, Math.round((at - sessionStart) / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Live transcript — reads from the active Copilot session in the
 *  store. Renders persisted bubbles plus the in-flight `pendingTranscript`
 *  as a "live" bubble at the bottom. Auto-scrolls when new content
 *  lands. */
export default function LiveTranscript() {
  const sessions = useAppStore((s) => s.copilotSessions);
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const pendingTranscript = useAppStore((s) => s.pendingTranscript);
  const status = useAppStore((s) => s.copilotStatus);

  // Resolve the session to render. Prefer the active one; fall back to
  // the most recent so the user can still see the last interview's
  // transcript when nothing is live.
  const session = useMemo(() => {
    if (activeSessionId) {
      return sessions.find((s) => s.id === activeSessionId) ?? null;
    }
    return sessions[0] ?? null;
  }, [sessions, activeSessionId]);

  const listRef = useRef<HTMLDivElement | null>(null);
  // Auto-scroll to the bottom whenever the bubble count changes or the
  // pending transcript updates. Use scrollHeight after the DOM paints.
  const lastSignature = `${session?.transcript.length ?? 0}|${pendingTranscript.length}`;
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [lastSignature]);

  const isLive = activeSessionId !== null && status !== 'idle';
  const hasContent = (session?.transcript.length ?? 0) > 0 || !!pendingTranscript.trim();

  return (
    <div className="cp-live-transcript">
      <div className="cp-live-transcript__header">
        <span className="cp-section-eyebrow">Live transcript</span>
        <div className="cp-live-transcript__header-right">
          {isLive ? (
            <span className="cp-pill cp-pill--green cp-pill--small">Live</span>
          ) : session ? (
            <span className="cp-pill cp-pill--small" style={{ background: 'var(--bg-soft)', color: 'var(--text-3)' }}>
              Last
            </span>
          ) : null}
          <button
            type="button"
            className="cp-icon-btn"
            aria-label="Expand transcript"
            title="Expand"
          >
            <Maximize2 size={14} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="cp-live-transcript__list" ref={listRef}>
        {!hasContent && (
          <div className="cp-live-transcript__empty">
            <MessageCircle size={18} strokeWidth={1.6} />
            <span>
              {isLive
                ? 'Listening for the recruiter…'
                : 'Start a session to capture the live transcript here.'}
            </span>
          </div>
        )}

        {session?.transcript.map((item) => (
          <TranscriptBubble
            key={item.id}
            speaker={item.speaker}
            name={item.speakerLabel}
            text={item.text}
            timestamp={formatElapsed(item.at, session.startedAt)}
          />
        ))}

        {/* Live in-flight recruiter bubble — appears while the
            backend is still pushing transcript replacements. */}
        {pendingTranscript.trim() && session && (
          <TranscriptBubble
            speaker="recruiter"
            text={pendingTranscript}
            timestamp={formatElapsed(Date.now(), session.startedAt)}
            live
          />
        )}
      </div>
    </div>
  );
}
