import { Sparkles } from 'lucide-react';
import { mockCVAnalysis } from '../../data/cv';
import { useAppStore } from '../../store';

export default function AISuggestionsCard() {
  const selectedCvId = useAppStore((s) => s.selectedCvId);
  const atsByCv = useAppStore((s) => s.atsByCv);
  const analysis = selectedCvId ? atsByCv[selectedCvId] : undefined;

  // Show the real suggestions (suggested text wins) — fall back to seed mock.
  const items = analysis?.suggestions.length
    ? analysis.suggestions.slice(0, 3).map((s) => s.suggested || s.rationale)
    : mockCVAnalysis.aiSuggestions;

  return (
    <div className="cv-side-card">
      <div className="cv-side-card__icon cv-side-card__icon--indigo" aria-hidden="true">
        <Sparkles size={18} strokeWidth={2.2} />
      </div>
      <div className="cv-side-card__content">
        <h3 className="cv-side-card__title">
          AI suggestions
          {analysis && (
            <span className="cv-side-card__badge" aria-label="From last analysis">live</span>
          )}
        </h3>
        <ul className="cv-side-card__list">
          {items.map((item, idx) => (
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
