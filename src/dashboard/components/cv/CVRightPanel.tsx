import { Eye, Download } from 'lucide-react';
import CVPreviewCard from './CVPreviewCard';
import ATSScoreCard from './ATSScoreCard';
import StrengthsCard from './StrengthsCard';
import AISuggestionsCard from './AISuggestionsCard';

export default function CVRightPanel() {
  return (
    <div className="cv-right">
      <CVPreviewCard />
      <ATSScoreCard />
      <StrengthsCard />
      <AISuggestionsCard />

      <div className="cv-right__actions">
        <button type="button" className="cv-right__btn cv-right__btn--ghost">
          <Eye size={14} strokeWidth={2} />
          <span>Preview full</span>
        </button>
        <button type="button" className="cv-right__btn cv-right__btn--primary">
          <Download size={14} strokeWidth={2.2} />
          <span>Export PDF</span>
        </button>
      </div>
    </div>
  );
}
