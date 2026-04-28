import { CheckCircle2, Eye, Calendar, Bell } from 'lucide-react';
import type { TimelineEvent, TimelineIcon } from '../../data/applications';

interface ApplicationTimelineProps {
  events: TimelineEvent[];
}

const ICON_MAP: Record<TimelineIcon, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  check: CheckCircle2,
  eye: Eye,
  calendar: Calendar,
  bell: Bell,
};

// Tone class (light bg + colored icon) keyed by icon type, used for the
// 28x28 rounded container. The first event renders differently — see below.
const TONE_BY_ICON: Record<TimelineIcon, string> = {
  check: 'tone-green',
  eye: 'tone-blue',
  calendar: 'tone-purple',
  bell: 'tone-orange',
};

export default function ApplicationTimeline({ events }: ApplicationTimelineProps) {
  return (
    <section className="app-detail__section">
      <h3 className="app-detail__section-title">Timeline</h3>

      <ol className="app-detail__timeline">
        {events.map((evt, idx) => {
          const Icon = ICON_MAP[evt.icon];
          const isFirstSolid = idx === 0 && evt.icon === 'check' && evt.state === 'done';

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
