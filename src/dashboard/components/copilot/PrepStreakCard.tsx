import { Flame, CheckCircle2, Circle } from 'lucide-react';
import { mockPrepStreak } from '../../data/copilot';

const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function PrepStreakCard() {
  const { days, weekDots } = mockPrepStreak;

  return (
    <section className="cp-summary-card" aria-label="Prep streak">
      <span className="cp-summary-card__eyebrow">Prep streak</span>

      <div className="cp-streak-row">
        <Flame size={22} strokeWidth={2} className="cp-streak-flame" aria-hidden="true" />
        <span className="cp-streak-number">{days}</span>
        <span className="cp-streak-unit">days</span>
      </div>

      <span className="cp-summary-card__subtitle">Keep it going</span>

      <div className="cp-week-dots" role="list">
        {WEEK_LABELS.map((label, i) => {
          const completed = weekDots[i];
          return (
            <div className="cp-week-dot" role="listitem" key={`${label}-${i}`}>
              <span className="cp-week-dot__label">{label}</span>
              {completed ? (
                <CheckCircle2
                  size={18}
                  strokeWidth={2}
                  className="cp-week-dot__icon cp-week-dot__icon--done"
                  aria-label="Completed"
                />
              ) : (
                <Circle
                  size={18}
                  strokeWidth={2}
                  className="cp-week-dot__icon cp-week-dot__icon--empty"
                  aria-label="Pending"
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
