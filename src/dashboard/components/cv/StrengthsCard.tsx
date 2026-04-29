import { ShieldCheck } from 'lucide-react';
import { mockCVAnalysis } from '../../data/cv';
import { useAppStore } from '../../store';

export default function StrengthsCard() {
  const selectedCvId = useAppStore((s) => s.selectedCvId);
  const atsByCv = useAppStore((s) => s.atsByCv);
  const analysis = selectedCvId ? atsByCv[selectedCvId] : undefined;

  // Show real strengths from the last Analyze match, fall back to seed mock.
  const items = analysis?.strengths.length ? analysis.strengths : mockCVAnalysis.strengths;

  return (
    <div className="cv-side-card">
      <div className="cv-side-card__icon cv-side-card__icon--green" aria-hidden="true">
        <ShieldCheck size={18} strokeWidth={2.2} />
      </div>
      <div className="cv-side-card__content">
        <h3 className="cv-side-card__title">
          Strengths
          {analysis && (
            <span className="cv-side-card__badge" aria-label="From last analysis">live</span>
          )}
        </h3>
        <ul className="cv-side-card__list">
          {items.map((item, idx) => (
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
