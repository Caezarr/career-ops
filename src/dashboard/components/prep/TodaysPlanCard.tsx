import { MoreHorizontal } from 'lucide-react';
import { mockTodaysPlan } from '../../data/prep';
import PlanTask from './PlanTask';

export default function TodaysPlanCard() {
  return (
    <section className="prep-plan">
      <div className="prep-plan__header">
        <h3 className="prep-plan__title">Today's prep plan</h3>
        <button type="button" className="prep-plan__more" aria-label="More">
          <MoreHorizontal size={16} strokeWidth={2} />
        </button>
      </div>
      <ul className="prep-plan__list">
        {mockTodaysPlan.map((t) => (
          <PlanTask key={t.id} title={t.title} duration={t.duration} done={t.done} />
        ))}
      </ul>
    </section>
  );
}
