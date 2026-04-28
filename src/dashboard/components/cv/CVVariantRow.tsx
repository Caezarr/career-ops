import { MoreHorizontal } from 'lucide-react';
import ATSPill from './ATSPill';
import type { CVVariant } from '../../data/cv';

interface CVVariantRowProps {
  variant: CVVariant;
  selected: boolean;
  onSelect: (id: string) => void;
}

export default function CVVariantRow({ variant, selected, onSelect }: CVVariantRowProps) {
  return (
    <div
      className={`cv-variants__row${selected ? ' cv-variants__row--selected' : ''}`}
      role="row"
      onClick={() => onSelect(variant.id)}
    >
      <div className="cv-variants__cell cv-variants__cell--radio" role="cell">
        <span
          className={`cv-radio${selected ? ' cv-radio--selected' : ''}`}
          aria-checked={selected}
          role="radio"
          tabIndex={0}
        />
      </div>
      <div className="cv-variants__cell cv-variants__cell--name" role="cell">
        <span className="cv-pdf-badge" aria-hidden="true">PDF</span>
        <span className="cv-variants__name">{variant.name}</span>
      </div>
      <div className="cv-variants__cell cv-variants__cell--muted" role="cell">
        {variant.lastEdited}
      </div>
      <div className="cv-variants__cell cv-variants__cell--muted" role="cell">
        {variant.fileType}
      </div>
      <div className="cv-variants__cell cv-variants__cell--role" role="cell">
        {variant.roleFocus}
      </div>
      <div className="cv-variants__cell" role="cell">
        <ATSPill score={variant.atsScore} />
      </div>
      <div className="cv-variants__cell cv-variants__cell--actions" role="cell">
        <button
          type="button"
          className="cv-variants__icon-btn"
          aria-label="More actions"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
