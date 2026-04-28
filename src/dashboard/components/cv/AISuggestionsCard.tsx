import { Sparkles } from 'lucide-react';
import { mockCVAnalysis } from '../../data/cv';

export default function AISuggestionsCard() {
  return (
    <div className="cv-side-card">
      <div className="cv-side-card__icon cv-side-card__icon--indigo" aria-hidden="true">
        <Sparkles size={18} strokeWidth={2.2} />
      </div>
      <div className="cv-side-card__content">
        <h3 className="cv-side-card__title">AI suggestions</h3>
        <ul className="cv-side-card__list">
          {mockCVAnalysis.aiSuggestions.map((item, idx) => (
            <li key={idx} className="cv-side-card__item">
              <span className="cv-side-card__num" aria-hidden="true">{idx + 1}</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
