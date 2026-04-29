import { FileText, Users, Puzzle } from 'lucide-react';
import type { DrillData, DrillCategory } from '../../data/prep';

interface DrillCardProps {
  drill: DrillData;
  onStart?: () => void;
}

const ICON_MAP: Record<
  DrillCategory,
  { Icon: typeof FileText; tone: 'blue' | 'purple' | 'orange' }
> = {
  Technical: { Icon: FileText, tone: 'blue' },
  Behavioral: { Icon: Users, tone: 'purple' },
  Case: { Icon: Puzzle, tone: 'orange' },
};

export default function DrillCard({ drill, onStart }: DrillCardProps) {
  const { Icon, tone } = ICON_MAP[drill.category];
  return (
    <article className="prep-drill-card">
      <div className="prep-drill-card__top">
        <div className={`prep-drill-card__icon prep-drill-card__icon--${tone}`}>
          <Icon size={18} strokeWidth={2} />
        </div>
        <div className="prep-drill-card__heading">
          <span className="prep-drill-card__title">{drill.title}</span>
          <span className="prep-drill-card__category">{drill.category}</span>
        </div>
      </div>

      <div className="prep-drill-card__stats">
        <span>{drill.questions} questions</span>
        <span className="prep-drill-card__sep">·</span>
        <span>{drill.minutes} min</span>
      </div>

      <button type="button" className="prep-drill-card__start" onClick={onStart}>
        Start
      </button>
    </article>
  );
}
