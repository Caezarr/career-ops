import { Target, ChevronDown, LineChart, Sparkles } from 'lucide-react';
import KeywordMatchSection from './KeywordMatchSection';
import MissingKeywords from './MissingKeywords';
import SuggestedEdits from './SuggestedEdits';
import DiffSection from './DiffSection';
import { mockTailoring } from '../../data/cv';

export default function TailoringWorkspace() {
  return (
    <section className="cv-workspace" aria-label="Tailoring workspace">
      <h2 className="cv-workspace__title">Tailoring workspace</h2>

      <div className="cv-workspace__top">
        <div className="cv-workspace__field">
          <label className="cv-workspace__label">Target role</label>
          <button type="button" className="cv-workspace__dropdown cv-workspace__dropdown--wide">
            <span className="cv-workspace__dropdown-left">
              <Target size={14} strokeWidth={2.2} className="cv-workspace__dropdown-icon" />
              <span className="cv-workspace__dropdown-text">{mockTailoring.targetRole}</span>
            </span>
            <ChevronDown size={16} className="cv-workspace__dropdown-chevron" />
          </button>
        </div>

        <div className="cv-workspace__field">
          <label className="cv-workspace__label">Base CV</label>
          <button type="button" className="cv-workspace__dropdown">
            <span className="cv-workspace__dropdown-left">
              <span className="cv-pdf-badge cv-pdf-badge--mini" aria-hidden="true">PDF</span>
              <span className="cv-workspace__dropdown-text">{mockTailoring.baseCV}</span>
            </span>
            <ChevronDown size={16} className="cv-workspace__dropdown-chevron" />
          </button>
        </div>

        <div className="cv-workspace__actions">
          <button type="button" className="cv-workspace__btn cv-workspace__btn--ghost">
            <LineChart size={14} strokeWidth={2} />
            <span>Analyze match</span>
          </button>
          <button type="button" className="cv-workspace__btn cv-workspace__btn--primary">
            <Sparkles size={14} strokeWidth={2.2} />
            <span>Generate optimized CV</span>
          </button>
        </div>
      </div>

      <div className="cv-workspace__analysis">
        <KeywordMatchSection
          before={mockTailoring.beforeMatch}
          after={mockTailoring.afterMatch}
        />
        <MissingKeywords keywords={mockTailoring.missingKeywords} />
        <SuggestedEdits edits={mockTailoring.suggestedEdits} />
      </div>

      <DiffSection
        removeReduce={mockTailoring.removeReduce}
        addStrengthen={mockTailoring.addStrengthen}
      />
    </section>
  );
}
