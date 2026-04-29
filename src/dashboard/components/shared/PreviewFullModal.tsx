import { Download } from "lucide-react";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../primitives";
import { mockCVPreview } from "../../data/cv";

interface PreviewFullModalProps {
  open: boolean;
  onClose: () => void;
  cvName?: string;
  onExport: () => void;
}

/** Full-size CV preview — re-uses the inline preview card markup but at xl size. */
export default function PreviewFullModal({
  open,
  onClose,
  cvName,
  onExport,
}: PreviewFullModalProps) {
  const cv = mockCVPreview;
  return (
    <Modal open={open} onClose={onClose} size="xl" ariaLabel="CV preview">
      <ModalHeader
        title={cvName ?? "CV preview"}
        subtitle="PDF · 1 page · Updated today"
        onClose={onClose}
      />
      <ModalBody>
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
      </ModalBody>
      <ModalFooter>
        <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>
          Close
        </button>
        <button type="button" className="ds-btn ds-btn--primary" onClick={onExport}>
          <Download size={14} />
          <span>Export PDF</span>
        </button>
      </ModalFooter>
    </Modal>
  );
}
