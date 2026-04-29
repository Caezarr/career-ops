import { useEffect, useRef, useState } from "react";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../primitives";

interface RenameModalProps {
  open: boolean;
  onClose: () => void;
  initialName: string;
  title?: string;
  label?: string;
  onSave: (name: string) => void;
}

/** Generic single-input rename modal. */
export default function RenameModal({
  open,
  onClose,
  initialName,
  title = "Rename",
  label = "Name",
  onSave,
}: RenameModalProps) {
  const [value, setValue] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(initialName);
      // Autofocus + select content next tick so the focus trap is ready.
      const t = window.setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 30);
      return () => window.clearTimeout(t);
    }
  }, [open, initialName]);

  function handleSave() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSave(trimmed);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} size="sm" ariaLabel={title}>
      <ModalHeader title={title} onClose={onClose} />
      <ModalBody>
        <label className="ds-shared-row">
          <span className="ds-shared-label">{label}</span>
          <input
            ref={inputRef}
            type="text"
            className="ds-shared-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              }
            }}
          />
        </label>
      </ModalBody>
      <ModalFooter>
        <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="ds-btn ds-btn--primary"
          onClick={handleSave}
          disabled={!value.trim()}
        >
          Save
        </button>
      </ModalFooter>
    </Modal>
  );
}
