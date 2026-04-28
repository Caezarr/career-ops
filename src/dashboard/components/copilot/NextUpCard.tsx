import { ArrowRight } from 'lucide-react';
import { mockNextUp } from '../../data/copilot';

export default function NextUpCard() {
  const { category, topic, inMinutes, durationMinutes } = mockNextUp;

  return (
    <section className="cp-summary-card" aria-label="Next up">
      <span className="cp-summary-card__eyebrow">Next up</span>
      <span className="cp-summary-card__title">{category}</span>
      <span className="cp-summary-card__subtitle">{topic}</span>
      <span className="cp-summary-card__meta">
        In {inMinutes} min · {durationMinutes} min
      </span>
      <button type="button" className="cp-btn cp-btn--outlined cp-btn--block">
        <span>View schedule</span>
        <ArrowRight size={13} strokeWidth={2} />
      </button>
    </section>
  );
}
