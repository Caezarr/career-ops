import { useEffect, useState } from "react";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../primitives";
import KeywordMatchSection from "../cv/KeywordMatchSection";
import MissingKeywords from "../cv/MissingKeywords";
import SuggestedEdits from "../cv/SuggestedEdits";
import { mockTailoring } from "../../data/cv";

interface AnalyzeMatchModalProps {
  open: boolean;
  onClose: () => void;
  onApply: () => void;
}

/** Analyze-match flow modal — fake 1.5s loader then results. */
export default function AnalyzeMatchModal({
  open,
  onClose,
  onApply,
}: AnalyzeMatchModalProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const t = window.setTimeout(() => setLoading(false), 1500);
    return () => window.clearTimeout(t);
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} size="lg" ariaLabel="Analyzing match">
      <ModalHeader
        title={loading ? "Analyzing match..." : "Match analysis"}
        subtitle={
          loading
            ? "Comparing your CV with the target role"
            : `${mockTailoring.targetRole}`
        }
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
            <KeywordMatchSection
              before={mockTailoring.beforeMatch}
              after={mockTailoring.afterMatch}
            />
            <MissingKeywords keywords={mockTailoring.missingKeywords} />
            <SuggestedEdits edits={mockTailoring.suggestedEdits} />
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
            onApply();
            onClose();
          }}
          disabled={loading}
        >
          Apply suggestions
        </button>
      </ModalFooter>
    </Modal>
  );
}
