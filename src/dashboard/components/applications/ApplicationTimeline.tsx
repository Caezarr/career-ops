import { CheckCircle2, Eye, Calendar, Bell, FileText } from 'lucide-react';
import type { TimelineEvent } from '../../store';

interface ApplicationTimelineProps {
  events: TimelineEvent[];
}

const ICON_MAP: Record<
  TimelineEvent['icon'],
  React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
> = {
  check: CheckCircle2,
  eye: Eye,
  calendar: Calendar,
  bell: Bell,
  note: FileText,
};

const TONE_BY_ICON: Record<TimelineEvent['icon'], string> = {
  check: 'tone-green',
  eye: 'tone-blue',
  calendar: 'tone-purple',
  bell: 'tone-orange',
  note: 'tone-blue',
};

export default function ApplicationTimeline({ events }: ApplicationTimelineProps) {
  return (
    <section className="app-detail__section">
      <h3 className="app-detail__section-title">Timeline</h3>

      <ol className="app-detail__timeline">
        {events.length === 0 && (
          <li className="ds-empty" style={{ padding: 16 }}>
            <span style={{ fontSize: 12 }}>No events yet</span>
          </li>
        )}
        {events.map((evt, idx) => {
          const Icon = ICON_MAP[evt.icon];
          const isFirstSolid =
            idx === 0 && evt.icon === 'check' && evt.state === 'done';

          return (
            <li key={evt.id} className="app-detail__timeline-event">
              {isFirstSolid ? (
                <span className="app-detail__timeline-icon app-detail__timeline-icon--solid">
                  <CheckCircle2
                    size={24}
                    strokeWidth={2.4}
                    className="app-detail__timeline-solid-icon"
                  />
                </span>
              ) : (
                <span
                  className={`app-detail__timeline-icon app-detail__timeline-icon--${TONE_BY_ICON[evt.icon]}`}
                >
                  <Icon size={14} strokeWidth={2.2} />
                </span>
              )}

              <div className="app-detail__timeline-text">
                <p className="app-detail__timeline-title">{evt.title}</p>
                <p className="app-detail__timeline-date">{evt.date}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
