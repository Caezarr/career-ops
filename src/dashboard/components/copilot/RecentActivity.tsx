import { Mic, Sparkles, Square } from 'lucide-react';
import { useAppStore } from '../../store';
import type { CopilotSession } from '../../store/slices/copilotSessions';

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

function summarise(session: CopilotSession): {
  title: string;
  subtitle: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  variant: string;
} {
  const turns = session.transcript.length;
  const answers = session.answers.length;
  if (session.endedAt === null) {
    // In-progress
    return {
      title: session.company || (session.mode === 'pitch' ? 'Pitch in progress' : 'Live interview'),
      subtitle: `${session.role || (session.mode === 'pitch' ? 'Self-presentation' : 'Q&A')} · ${turns} turn${turns === 1 ? '' : 's'}`,
      Icon: Mic,
      variant: 'cp-activity-icon--purple',
    };
  }
  const minutes = session.endedAt
    ? Math.max(1, Math.round((session.endedAt - session.startedAt) / 60000))
    : 0;
  return {
    title: session.company || (session.mode === 'pitch' ? 'Pitch session' : 'Live interview'),
    subtitle: `${turns} turn${turns === 1 ? '' : 's'} · ${answers} answer${answers === 1 ? '' : 's'} · ${minutes} min`,
    Icon: session.mode === 'pitch' ? Sparkles : Square,
    variant: 'cp-activity-icon--indigo',
  };
}

/** Recent activity surfaces the user's last 5 Copilot sessions, pulled
 *  from the persisted `copilotSessions` slice. The legacy mock-driven
 *  feed (mock interview / AI feedback / resume tailored) has been
 *  replaced by real data — every Start session leaves a row here. */
export default function RecentActivity() {
  const sessions = useAppStore((s) => s.copilotSessions);
  const recent = sessions.slice(0, 5);

  return (
    <section className="cp-recent-activity" aria-label="Recent activity">
      <h3 className="cp-recent-activity__title">Recent sessions</h3>
      {recent.length === 0 ? (
        <div className="cp-recent-activity__empty">
          <Mic size={16} strokeWidth={1.6} />
          <span>
            Your recent Copilot sessions will appear here once you start one.
          </span>
        </div>
      ) : (
        <div className="cp-recent-activity__list">
          {recent.map((sess) => {
            const { title, subtitle, Icon, variant } = summarise(sess);
            return (
              <div className="cp-activity-item" key={sess.id}>
                <div className={`cp-activity-icon ${variant}`} aria-hidden="true">
                  <Icon size={16} strokeWidth={2} />
                </div>
                <div className="cp-activity-item__text">
                  <span className="cp-activity-item__title">{title}</span>
                  <span className="cp-activity-item__subtitle">{subtitle}</span>
                </div>
                <span className="cp-activity-item__timestamp">
                  {formatRelative(sess.startedAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
