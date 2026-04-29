import { Download } from 'lucide-react';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '../../primitives';
import { useAppStore } from '../../store';
import { getCvParsedText } from '../../store/slices/cvs';
import { renderCvDocument } from '../cv/renderCvDocument';

interface PreviewFullModalProps {
  open: boolean;
  onClose: () => void;
  /** Override the CV to preview. Defaults to the currently selected CV. */
  cvId?: string;
  /** Override displayed title. Falls back to the selected CV's name. */
  cvName?: string;
  onExport: () => void;
}

/** Full-size CV preview — same renderer as the right-panel CVPreviewCard so
 *  the modal always matches the variant the user actually has selected. */
export default function PreviewFullModal({
  open,
  onClose,
  cvId,
  cvName,
  onExport,
}: PreviewFullModalProps) {
  const cvs = useAppStore((s) => s.cvs);
  const selectedCvId = useAppStore((s) => s.selectedCvId);
  const targetId = cvId ?? selectedCvId ?? cvs[0]?.id;
  const targetCv = cvs.find((c) => c.id === targetId);

  const displayName = cvName ?? targetCv?.name ?? 'CV preview';
  const displayMeta = `PDF · 1 page · ${targetCv?.lastEdited ?? 'Updated today'}`;
  const parsedText = targetCv ? getCvParsedText(targetCv) : '';

  return (
    <Modal open={open} onClose={onClose} size="xl" ariaLabel="CV preview">
      <ModalHeader title={displayName} subtitle={displayMeta} onClose={onClose} />
      <ModalBody>
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
