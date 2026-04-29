import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../primitives";

interface GenerateOptimizedModalProps {
  open: boolean;
  onClose: () => void;
  targetRole: string;
  /** Called when the user confirms — parent wires this to addCv + open. */
  onCreate: () => void;
}

export default function GenerateOptimizedModal({
  open,
  onClose,
  targetRole,
  onCreate,
}: GenerateOptimizedModalProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const t = window.setTimeout(() => setLoading(false), 2000);
    return () => window.clearTimeout(t);
  }, [open]);

  const variantName = `Optimized for ${targetRole}`;

  return (
    <Modal open={open} onClose={onClose} size="md" ariaLabel="Generate optimized CV">
      <ModalHeader
        title={loading ? "Generating optimized CV..." : "Done!"}
        subtitle={loading ? targetRole : `New variant created`}
        onClose={onClose}
      />
      <ModalBody>
        {loading ? (
          <div className="ds-shared-loader" aria-live="polite">
            <span className="ds-shared-loader__dot" />
            <span className="ds-shared-loader__dot" />
            <span className="ds-shared-loader__dot" />
          </div>
        ) : (
          <div className="ds-shared-stack">
            <div
              className="ds-shared-info"
              style={{ background: "var(--green-soft)", color: "var(--green)" }}
            >
              <CheckCircle2 size={16} />
              <span style={{ color: "var(--text-1)" }}>
                New variant <strong>{variantName}</strong> created.
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-around",
                gap: 16,
                padding: 16,
                border: "1px solid var(--border-soft)",
                borderRadius: 10,
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Before
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "var(--orange)", marginTop: 4 }}>
                  84%
                </div>
              </div>
              <ArrowRight size={20} color="var(--text-3)" />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  After
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "var(--green)", marginTop: 4 }}>
                  89%
                </div>
              </div>
            </div>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>
          Close
        </button>
        <button
          type="button"
          className="ds-btn ds-btn--primary"
          onClick={() => {
            onCreate();
            onClose();
          }}
          disabled={loading}
        >
          Open CV
        </button>
      </ModalFooter>
    </Modal>
  );
}
