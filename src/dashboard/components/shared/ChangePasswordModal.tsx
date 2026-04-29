import { useEffect, useState } from "react";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  useToast,
} from "../../primitives";

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    if (open) {
      setCurrent("");
      setNext("");
      setConfirm("");
    }
  }, [open]);

  const valid =
    current.length >= 1 &&
    next.length >= 8 &&
    confirm === next;

  return (
    <Modal open={open} onClose={onClose} size="sm" ariaLabel="Change password">
      <ModalHeader title="Change password" onClose={onClose} />
      <ModalBody>
        <div className="ds-shared-stack">
          <label className="ds-shared-row">
            <span className="ds-shared-label">Current password</span>
            <input
              type="password"
              className="ds-shared-input"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <label className="ds-shared-row">
            <span className="ds-shared-label">New password</span>
            <input
              type="password"
              className="ds-shared-input"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
            />
            <span className="ds-shared-hint">At least 8 characters</span>
          </label>
          <label className="ds-shared-row">
            <span className="ds-shared-label">Confirm new password</span>
            <input
              type="password"
              className="ds-shared-input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
            {confirm && confirm !== next && (
              <span className="ds-shared-hint" style={{ color: "var(--red)" }}>
                Passwords don't match
              </span>
            )}
          </label>
        </div>
      </ModalBody>
      <ModalFooter>
        <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="ds-btn ds-btn--primary"
          disabled={!valid}
          onClick={() => {
            toast.success("Password updated");
            onClose();
          }}
        >
          Save
        </button>
      </ModalFooter>
    </Modal>
  );
}
