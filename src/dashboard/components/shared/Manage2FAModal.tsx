import { ShieldCheck } from "lucide-react";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  useConfirm,
  useToast,
} from "../../primitives";

interface Manage2FAModalProps {
  open: boolean;
  onClose: () => void;
}

export default function Manage2FAModal({ open, onClose }: Manage2FAModalProps) {
  const toast = useToast();
  const confirm = useConfirm();

  async function handleDisable() {
    const ok = await confirm({
      title: "Disable two-factor authentication?",
      description:
        "Your account will be less secure. You can re-enable 2FA at any time.",
      confirmLabel: "Disable",
      destructive: true,
    });
    if (ok) {
      toast.success("Two-factor authentication disabled");
      onClose();
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="sm" ariaLabel="Manage 2FA">
      <ModalHeader title="Two-factor authentication" onClose={onClose} />
      <ModalBody>
        <div className="ds-shared-stack">
          <div
            className="ds-shared-info"
            style={{ background: "var(--green-soft)" }}
          >
            <ShieldCheck size={16} color="var(--green)" />
            <div>
              <div style={{ fontWeight: 600, color: "var(--text-1)" }}>2FA is enabled</div>
              <div style={{ color: "var(--text-2)" }}>
                You'll be asked for a code when signing in from a new device.
              </div>
            </div>
          </div>
          <span className="ds-shared-hint">
            Authenticator app · last used 3 days ago
          </span>
        </div>
      </ModalBody>
      <ModalFooter>
        <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>
          Close
        </button>
        <button type="button" className="ds-btn ds-btn--danger" onClick={handleDisable}>
          Disable 2FA
        </button>
      </ModalFooter>
    </Modal>
  );
}
