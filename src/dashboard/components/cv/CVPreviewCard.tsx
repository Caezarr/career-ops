import { MoreHorizontal } from 'lucide-react';
import { useAppStore } from '../../store';
import { getCvParsedText } from '../../store/slices/cvs';
import { renderCvDocument } from './renderCvDocument';

export default function CVPreviewCard() {
  const cvs = useAppStore((s) => s.cvs);
  const selectedCvId = useAppStore((s) => s.selectedCvId);
  const selectedCv = cvs.find((c) => c.id === selectedCvId) ?? cvs[0];

  const displayName = selectedCv?.name ?? 'Consulting CV';
  const displayMeta = `PDF · 1 page · ${selectedCv?.lastEdited ?? 'Updated today'}`;
  const parsedText = selectedCv ? getCvParsedText(selectedCv) : '';

  return (
    <div className="cv-preview-card">
      <div className="cv-preview-card__top">
        <span className="cv-pdf-badge" aria-hidden="true">PDF</span>
        <div className="cv-preview-card__top-text">
          <div className="cv-preview-card__name">{displayName}</div>
          <div className="cv-preview-card__meta">{displayMeta}</div>
        </div>
        <button
          type="button"
          className="cv-preview-card__more"
          aria-label="More actions"
        >
          <MoreHorizontal size={16} strokeWidth={2} />
        </button>
      </div>

      <div className="cv-preview-doc" aria-label="CV preview">
        {parsedText.trim() ? (
          renderCvDocument(parsedText)
        ) : (
          <div className="cv-preview-doc__empty">
            <p>This variant has no preview content yet.</p>
            <p style={{ marginTop: 6, fontSize: 11, color: 'var(--text-3)' }}>
              Re-upload a PDF or duplicate from a populated variant.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
