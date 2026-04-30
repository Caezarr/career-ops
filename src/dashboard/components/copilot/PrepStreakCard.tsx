import { Flame, CheckCircle2, Circle } from 'lucide-react';
import { usePrepStreak } from '../../hooks/usePrepStreak';

const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function PrepStreakCard() {
  const { days, weekDots, hasTodayActivity } = usePrepStreak();

  // Honest copy when there's no activity yet — the mock card always
  // showed "12 days" which is misleading on a fresh install.
  const subtitle =
    days === 0
      ? 'Start a session today'
      : hasTodayActivity
      ? 'Keep it going'
      : "Don't break the chain";

  return (
    <section className="cp-summary-card" aria-label="Prep streak">
      <span className="cp-summary-card__eyebrow">Prep streak</span>

      <div className="cp-streak-row">
        <Flame
          size={22}
          strokeWidth={2}
          className={
            'cp-streak-flame' + (days > 0 ? '' : ' cp-streak-flame--cold')
          }
          aria-hidden="true"
        />
        <span className="cp-streak-number">{days}</span>
        <span className="cp-streak-unit">day{days === 1 ? '' : 's'}</span>
      </div>

      <span className="cp-summary-card__subtitle">{subtitle}</span>

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
