import { useEffect, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  useToast,
} from "../../primitives";
import { useAppStore } from "../../store";

interface ChangePhotoModalProps {
  open: boolean;
  onClose: () => void;
  initials: string;
}

/** Read a File as a data URL so it persists in localStorage (vs object URLs). */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function ChangePhotoModal({
  open,
  onClose,
  initials,
}: ChangePhotoModalProps) {
  const toast = useToast();
  const updateUser = useAppStore((s) => s.updateUser);
  const currentUrl = useAppStore((s) => s.user.avatarUrl);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // When the modal closes, clear the local preview so reopening starts fresh.
  useEffect(() => {
    if (!open) setPreviewUrl(null);
  }, [open]);

  async function pickFile(file: File) {
    if (file.size > 4 * 1024 * 1024) {
      toast.error('File too large', 'PNG or JPG up to 4MB.');
      return;
    }
    try {
      const dataUrl = await readAsDataUrl(file);
      setPreviewUrl(dataUrl);
    } catch {
      toast.error('Could not read file');
    }
  }

  function save() {
    if (!previewUrl) {
      onClose();
      return;
    }
    updateUser({ avatarUrl: previewUrl });
    toast.success('Photo updated', 'New photo applied across the app.');
    onClose();
  }

  function removePhoto() {
    updateUser({ avatarUrl: undefined });
    setPreviewUrl(null);
    toast.success('Photo removed', 'Initials will be shown again.');
    onClose();
  }

  const display = previewUrl ?? currentUrl;

  return (
    <Modal open={open} onClose={onClose} size="sm" ariaLabel="Change photo">
      <ModalHeader title="Change photo" onClose={onClose} />
      <ModalBody>
        <div className="ds-shared-center">
          <div
            className="ds-shared-avatar-preview"
            style={
              display
                ? { backgroundImage: `url(${display})`, backgroundSize: "cover", backgroundPosition: "center", color: "transparent" }
                : undefined
            }
          >
            {!display && initials}
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
            accept="image/png,image/jpeg,image/webp"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void pickFile(f);
              e.target.value = '';
            }}
          />
          <span className="ds-shared-hint">PNG or JPG up to 4MB</span>
        </div>
      </ModalBody>
      <ModalFooter>
        {currentUrl ? (
          <button
            type="button"
            className="ds-btn ds-btn--secondary"
            onClick={removePhoto}
            style={{ marginRight: 'auto' }}
          >
            Remove photo
          </button>
        ) : null}
        <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="ds-btn ds-btn--primary"
          onClick={save}
          disabled={!previewUrl}
        >
          Save
        </button>
      </ModalFooter>
    </Modal>
  );
}
