import { MoreHorizontal } from 'lucide-react';
import { mockCVPreview } from '../../data/cv';

export default function CVPreviewCard() {
  const cv = mockCVPreview;

  return (
    <div className="cv-preview-card">
      <div className="cv-preview-card__top">
        <span className="cv-pdf-badge" aria-hidden="true">PDF</span>
        <div className="cv-preview-card__top-text">
          <div className="cv-preview-card__name">Consulting CV</div>
          <div className="cv-preview-card__meta">PDF · 1 page · Updated today</div>
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
        <div className="cv-preview-doc__header">
          <div className="cv-preview-doc__name">{cv.name}</div>
          <div className="cv-preview-doc__title">{cv.title}</div>
          <div className="cv-preview-doc__contact">{cv.contact}</div>
        </div>

        <div className="cv-preview-doc__section">
          <div className="cv-preview-doc__section-title">SUMMARY</div>
          <div className="cv-preview-doc__section-divider" />
          <p className="cv-preview-doc__paragraph">{cv.summary}</p>
        </div>

        <div className="cv-preview-doc__section">
          <div className="cv-preview-doc__section-title">EXPERIENCE</div>
          <div className="cv-preview-doc__section-divider" />
          {cv.experience.map((exp, idx) => (
            <div key={idx} className="cv-preview-doc__entry">
              <div className="cv-preview-doc__entry-header">
                <div className="cv-preview-doc__entry-role">{exp.role}</div>
                <div className="cv-preview-doc__entry-period">{exp.period}</div>
              </div>
              <div className="cv-preview-doc__entry-sub">
                {exp.company} &nbsp;&nbsp; {exp.location}
              </div>
              <ul className="cv-preview-doc__bullets">
                {exp.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="cv-preview-doc__section">
          <div className="cv-preview-doc__section-title">EDUCATION</div>
          <div className="cv-preview-doc__section-divider" />
          {cv.education.map((edu, idx) => (
            <div key={idx} className="cv-preview-doc__entry">
              <div className="cv-preview-doc__entry-header">
                <div className="cv-preview-doc__entry-role">{edu.degree}</div>
                <div className="cv-preview-doc__entry-period">{edu.year}</div>
              </div>
              <div className="cv-preview-doc__entry-sub">{edu.school}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
