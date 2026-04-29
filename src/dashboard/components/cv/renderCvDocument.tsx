import type { ReactNode } from 'react';

/** Renders a CV's parsed text as structured document JSX.
 *  - Uppercase short lines → section headings (with divider)
 *  - Lines starting '- '   → bullet lists
 *  - Lines containing ' — ' or ' – ' → entry headers (role / company / period)
 *  - First 3 lines special-cased (name / title / contact)
 *  - Empty lines → spacer
 *  Used by both CVPreviewCard (right panel) and PreviewFullModal so a single
 *  source of truth drives every CV preview surface. */
export function renderCvDocument(text: string): ReactNode[] {
  const lines = text.split(/\r?\n/);
  const elements: ReactNode[] = [];
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

    if (i === 0) {
      elements.push(
        <div key={`name-${i}`} className="cv-preview-doc__name">{line}</div>,
      );
      return;
    }
    if (i === 1) {
      elements.push(
        <div key={`title-${i}`} className="cv-preview-doc__title">{line}</div>,
      );
      return;
    }
    if (i === 2) {
      elements.push(
        <div key={`contact-${i}`} className="cv-preview-doc__contact">{line}</div>,
      );
      return;
    }

    if (line.includes(' — ') || line.includes(' – ')) {
      elements.push(
        <div key={`entry-${i}`} className="cv-preview-doc__entry-header">
          <div className="cv-preview-doc__entry-role">{line}</div>
        </div>,
      );
      return;
    }

    elements.push(
      <p key={`p-${i}`} className="cv-preview-doc__paragraph">{line}</p>,
    );
  });

  flushBullets('end');
  return elements;
}
