import { Download, FileText, Folder } from "lucide-react";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "../../primitives";
import type { Application } from "../../store";

interface DocumentsModalProps {
  open: boolean;
  onClose: () => void;
  application: Application | null;
}

export default function DocumentsModal({
  open,
  onClose,
  application,
}: DocumentsModalProps) {
  const materials = application?.materials ?? [];

  return (
    <Modal open={open} onClose={onClose} size="md" ariaLabel="Application documents">
      <ModalHeader
        title="Application documents"
        subtitle={
          application
            ? `${materials.length} item${materials.length === 1 ? "" : "s"}`
            : undefined
        }
        onClose={onClose}
      />
      <ModalBody>
        {materials.length === 0 ? (
          <div className="ds-empty">
            <Folder size={20} />
            <div>No documents attached yet.</div>
          </div>
        ) : (
          <ul className="ds-doc-list">
            {materials.map((m) => (
              <li key={m.type + m.name} className="ds-doc-item">
                <div className="ds-doc-item__icon">
                  <FileText size={18} />
                </div>
                <div className="ds-doc-item__main">
                  <div className="ds-doc-item__name">{m.name}</div>
                  <div className="ds-doc-item__meta">
                    {m.type} · {m.uploaded}
                  </div>
                </div>
                <button type="button" className="ds-doc-item__action">
                  <Download size={14} /> Download
                </button>
              </li>
            ))}
          </ul>
        )}
      </ModalBody>
      <ModalFooter>
        <button type="button" className="ds-btn ds-btn--primary" onClick={onClose}>
          Close
        </button>
      </ModalFooter>
    </Modal>
  );
}
