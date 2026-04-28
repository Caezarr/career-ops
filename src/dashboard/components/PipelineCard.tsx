import CompanyAvatar from './CompanyAvatar';
import type { PipelineCardData } from '../data/mock';

interface PipelineCardProps {
  card: PipelineCardData;
}

function matchClass(score: number, ongoing?: boolean): string {
  if (ongoing) return 'pipeline-card__match--ongoing';
  if (score >= 90) return 'pipeline-card__match--green';
  if (score >= 80) return 'pipeline-card__match--green-soft';
  if (score >= 70) return 'pipeline-card__match--orange';
  return 'pipeline-card__match--red';
}

export default function PipelineCard({ card }: PipelineCardProps) {
  return (
    <article className="pipeline-card">
      <div className="pipeline-card__top">
        <CompanyAvatar company={card.company} size={28} />
        <div className="pipeline-card__text">
          <div className="pipeline-card__role">{card.role}</div>
          <div className="pipeline-card__company">{card.company}</div>
        </div>
      </div>
      <div className="pipeline-card__bottom">
        <span className="pipeline-card__date">{card.date}</span>
        <span className={`pipeline-card__match ${matchClass(card.match, card.ongoing)}`}>
          {card.match}%
        </span>
      </div>
    </article>
  );
}
