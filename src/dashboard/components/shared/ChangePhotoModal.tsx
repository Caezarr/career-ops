import { useEffect, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  useToast,
} from "../../primitives";

interface ChangePhotoModalProps {
  open: boolean;
  onClose: () => void;
  initials: string;
}

export default function ChangePhotoModal({
  open,
  onClose,
  initials,
}: ChangePhotoModalProps) {
  const toast = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open && previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [open, previewUrl]);

  function pickFile(file: File) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }

  return (
    <Modal open={open} onClose={onClose} size="sm" ariaLabel="Change photo">
      <ModalHeader title="Change photo" onClose={onClose} />
      <ModalBody>
        <div className="ds-shared-center">
          <div
            className="ds-shared-avatar-preview"
            style={
              previewUrl
                ? { backgroundImage: `url(${previewUrl})`, backgroundSize: "cover", backgroundPosition: "center", color: "transparent" }
                : undefined
            }
          >
            {!previewUrl && initials}
          </div>
          <button
            type="button"
            className="ds-btn ds-btn--secondary"
            onClick={() => fileRef.current?.click()}
          >
            <UploadCloud size={14} />
            <span>Choose image</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickFile(f);
            }}
          />
          <span className="ds-shared-hint">PNG or JPG up to 4MB</span>
        </div>
      </ModalBody>
      <ModalFooter>
        <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="ds-btn ds-btn--primary"
          onClick={() => {
            toast.success("Photo updated");
            onClose();
          }}
        >
          Save
        </button>
      </ModalFooter>
    </Modal>
  );
}
