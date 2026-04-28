import { CheckCircle2, Star } from 'lucide-react';
import type { ScoreChipData } from '../../data/copilot';

export default function ScoreChip({ label, color, icon }: ScoreChipData) {
  return (
    <span className={`cp-score-chip cp-score-chip--${color}`}>
      {icon === 'check' ? (
        <CheckCircle2 size={14} strokeWidth={2.2} className="cp-score-chip__icon" />
      ) : (
        <Star
          size={14}
          strokeWidth={2.2}
          className="cp-score-chip__icon"
          fill="currentColor"
        />
      )}
      <span className="cp-score-chip__label">{label}</span>
    </span>
  );
}
