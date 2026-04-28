import { ShieldCheck } from 'lucide-react';
import { mockCVAnalysis } from '../../data/cv';

export default function StrengthsCard() {
  return (
    <div className="cv-side-card">
      <div className="cv-side-card__icon cv-side-card__icon--green" aria-hidden="true">
        <ShieldCheck size={18} strokeWidth={2.2} />
      </div>
      <div className="cv-side-card__content">
        <h3 className="cv-side-card__title">Strengths</h3>
        <ul className="cv-side-card__list">
          {mockCVAnalysis.strengths.map((item, idx) => (
            <li key={idx} className="cv-side-card__item">
              <span className="cv-side-card__dot cv-side-card__dot--green" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
