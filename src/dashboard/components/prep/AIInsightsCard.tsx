import { Sparkles, MoreHorizontal, CheckCircle2, AlertCircle } from 'lucide-react';
import { mockAIInsights, type InsightStatus } from '../../data/prep';

const ICON_FOR_STATUS: Record<InsightStatus, typeof CheckCircle2> = {
  good: CheckCircle2,
  warning: AlertCircle,
  bad: AlertCircle,
};

export default function AIInsightsCard() {
  return (
    <section className="prep-insights">
      <div className="prep-insights__header">
        <div className="prep-insights__title-wrap">
          <Sparkles size={15} strokeWidth={2} className="prep-insights__sparkle" />
          <h3 className="prep-insights__title">AI insights</h3>
        </div>
        <button type="button" className="prep-insights__more" aria-label="More">
          <MoreHorizontal size={16} strokeWidth={2} />
        </button>
      </div>

      <ul className="prep-insights__list">
        {mockAIInsights.map((it) => {
          const Icon = ICON_FOR_STATUS[it.status];
          return (
            <li key={it.id} className="prep-insights__item">
              <Icon
                size={16}
                strokeWidth={2}
                className={`prep-insights__icon prep-insights__icon--${it.status}`}
              />
              <span className="prep-insights__text">{it.text}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
