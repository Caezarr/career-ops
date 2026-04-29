import { MoreHorizontal } from 'lucide-react';
import { useAppStore } from '../../store';
import { getCvParsedText } from '../../store/slices/cvs';

/** Renders a CV's parsed text as a structured document. Uppercase lines become
 *  section headings (with divider). Lines starting with '- ' become bullets.
 *  This way each variant's preview content reflects its actual parsedText
 *  (used by the AI ATS analyzer too). */
function renderParsedText(text: string) {
  const lines = text.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];

  const flushBullets = (key: string) => {
    if (bulletBuffer.length > 0) {
      elements.push(
        <ul key={`bullets-${key}`} className="cv-preview-doc__bullets">
          {bulletBuffer.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>,
      );
      bulletBuffer = [];
    }
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();

    if (line.startsWith('- ')) {
      bulletBuffer.push(line.slice(2));
      return;
    }

    flushBullets(String(i));

    if (line === '') {
      elements.push(<div key={`sp-${i}`} className="cv-preview-doc__spacer" />);
      return;
    }

    // ALL CAPS short lines → section heading
    if (line.length <= 24 && /^[A-Z][A-Z\s&/]+$/.test(line)) {
      elements.push(
        <div key={`h-${i}`} className="cv-preview-doc__section">
          <div className="cv-preview-doc__section-title">{line}</div>
          <div className="cv-preview-doc__section-divider" />
        </div>,
      );
      return;
    }

    // First line = name (rendered larger)
    if (i === 0) {
      elements.push(
        <div key={`name-${i}`} className="cv-preview-doc__name">
          {line}
        </div>,
      );
      return;
    }
    // Second line = title
    if (i === 1) {
      elements.push(
        <div key={`title-${i}`} className="cv-preview-doc__title">
          {line}
        </div>,
      );
      return;
    }
    // Third line = contact
    if (i === 2) {
      elements.push(
        <div key={`contact-${i}`} className="cv-preview-doc__contact">
          {line}
        </div>,
      );
      return;
    }

    // Detect entry headers: contain ' — ' or ' – '
    if (line.includes(' — ') || line.includes(' – ')) {
      elements.push(
        <div key={`entry-${i}`} className="cv-preview-doc__entry-header">
          <div className="cv-preview-doc__entry-role">{line}</div>
        </div>,
      );
      return;
    }

    elements.push(
      <p key={`p-${i}`} className="cv-preview-doc__paragraph">
        {line}
      </p>,
    );
  });

  flushBullets('end');
  return elements;
}

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
          renderParsedText(parsedText)
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
