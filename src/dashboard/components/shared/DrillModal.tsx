import { Modal, ModalBody, ModalFooter, ModalHeader, useToast } from "../../primitives";
import type { DrillData } from "../../data/prep";

interface DrillModalProps {
  open: boolean;
  onClose: () => void;
  drill: DrillData | null;
}

const SAMPLE_QUESTIONS: Record<string, string[]> = {
  "DCF Modeling": [
    "Walk me through a DCF.",
    "How would you handle a negative growth rate?",
    "What's a reasonable WACC for a SaaS company?",
    "How do you value a money-losing startup?",
  ],
  "Leadership Stories": [
    "Tell me about a time you led under pressure.",
    "Describe a conflict with a teammate and how you resolved it.",
    "Walk me through a project where you stepped up unexpectedly.",
    "What's the hardest decision you've made as a leader?",
  ],
  "Merger Case": [
    "Should Company A acquire Company B?",
    "Estimate the synergies of this merger.",
    "Walk me through your due diligence approach.",
    "What's the biggest risk in this deal?",
  ],
};

export default function DrillModal({ open, onClose, drill }: DrillModalProps) {
  const toast = useToast();
  if (!drill) return null;
  const samples = SAMPLE_QUESTIONS[drill.title] ?? [
    "Sample question 1",
    "Sample question 2",
    "Sample question 3",
  ];

  return (
    <Modal open={open} onClose={onClose} size="md" ariaLabel={drill.title}>
      <ModalHeader
        title={drill.title}
        subtitle={`${drill.questions} questions · ${drill.minutes} min`}
        onClose={onClose}
      />
      <ModalBody>
        <div className="ds-shared-stack">
          <div
            className="ds-shared-info"
            style={{ background: "var(--indigo-soft)" }}
          >
            <span style={{ fontWeight: 600, color: "var(--indigo-text)" }}>
              {drill.category}
            </span>
            <span>· {drill.questions} questions · {drill.minutes} min</span>
          </div>
          <div>
            <div className="ds-shared-label" style={{ marginBottom: 8 }}>
              Sample questions
            </div>
            <ul className="ds-shared-list">
              {samples.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
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
            toast.info("Drill started — coming soon");
            onClose();
          }}
        >
          Start drill
        </button>
      </ModalFooter>
    </Modal>
  );
}
