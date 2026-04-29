import { useState } from 'react';
import { TrendingUp, ArrowUpRight, ArrowRight } from 'lucide-react';
import '../styles/insight.css';
import { mockInsight } from '../data/mock';
import { InsightsModal } from './shared';

export default function InsightCard() {
  const [open, setOpen] = useState(false);

  return (
    <section className="insight-card" aria-label="Weekly insight">
      <div className="insight-card__header">
        <span className="insight-card__label">This week</span>
        <TrendingUp size={18} strokeWidth={2} className="insight-card__icon" />
      </div>

      <p className="insight-card__body">
        {mockInsight.interviewsThisWeek} interviews this week. Your answer quality is up{' '}
        <span className="insight-card__highlight">{mockInsight.qualityImprovement}%</span>.
      </p>

      <div className="insight-card__sub">
        <span>Above your 8-week average</span>
        <ArrowUpRight size={12} strokeWidth={2.4} />
      </div>

      <svg
        viewBox="0 0 240 60"
        className="insight-card__chart"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="insight-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M 0 48 C 30 44, 50 40, 80 36 S 130 26, 160 20 S 210 8, 240 4 L 240 60 L 0 60 Z"
          fill="url(#insight-grad)"
        />
        <path
          d="M 0 48 C 30 44, 50 40, 80 36 S 130 26, 160 20 S 210 8, 240 4"
          fill="none"
          stroke="#6366f1"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      <button
        type="button"
        className="insight-card__cta"
        onClick={() => setOpen(true)}
      >
        View full insights
        <ArrowRight
          size={13}
          strokeWidth={2.4}
          style={{ verticalAlign: 'middle', marginLeft: 6 }}
        />
      </button>

      <InsightsModal open={open} onClose={() => setOpen(false)} />
    </section>
  );
}
