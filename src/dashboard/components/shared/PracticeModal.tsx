import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  useToast,
} from "../../primitives";
import DifficultyPill from "../prep/DifficultyPill";
import ScoreMetric from "../prep/ScoreMetric";
import { useAppStore, type PrepQuestion } from "../../store";

interface PracticeModalProps {
  open: boolean;
  onClose: () => void;
  question: PrepQuestion | null;
}

interface Scores {
  structure: number;
  conciseness: number;
  evidence: number;
  memorability: number;
}

function randScore(): number {
  // 6.5 → 9.5
  return Math.round((6.5 + Math.random() * 3) * 10) / 10;
}

const FEEDBACK_POOL = [
  "Lead with the impact, not the context.",
  "Quantify outcomes — numbers stick.",
  "Trim filler and sharpen the hook.",
  "Mirror the framework name explicitly.",
  "Tighten the first 20 seconds to grab attention.",
  "Tie the ending back to the role.",
];

export default function PracticeModal({ open, onClose, question }: PracticeModalProps) {
  const toast = useToast();
  const recordPrepSession = useAppStore((s) => s.recordPrepSession);
  const setPracticeScore = useAppStore((s) => s.setPracticeScore);

  const [answer, setAnswer] = useState("");
  const [phase, setPhase] = useState<"input" | "scoring" | "results">("input");
  const [scores, setScores] = useState<Scores | null>(null);
  const [feedback, setFeedback] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setAnswer("");
      setPhase("input");
      setScores(null);
      setFeedback([]);
      const t = window.setTimeout(() => textareaRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  function handleSubmit() {
    if (!question) return;
    setPhase("scoring");
    window.setTimeout(() => {
      const s: Scores = {
        structure: randScore(),
        conciseness: randScore(),
        evidence: randScore(),
        memorability: randScore(),
      };
      const fb = [...FEEDBACK_POOL].sort(() => Math.random() - 0.5).slice(0, 3);
      setScores(s);
      setFeedback(fb);
      setPhase("results");
    }, 1500);
  }

  function handleSaveClose() {
    if (!question || !scores) return;
    recordPrepSession({
      questionId: question.id,
      scores,
      feedback,
    });
    const avg =
      (scores.structure + scores.conciseness + scores.evidence + scores.memorability) /
      4;
    setPracticeScore(question.id, Math.round(avg * 10) / 10);
    toast.success("Session saved");
    onClose();
  }

  if (!question) return null;

  return (
    <Modal open={open} onClose={onClose} size="lg" ariaLabel="Practice question">
      <ModalHeader
        title={question.question}
        subtitle={`${question.framework} · ${question.category}`}
        onClose={onClose}
      />
      <ModalBody>
        <div className="ds-shared-stack">
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <DifficultyPill difficulty={question.difficulty} />
            <span className="ds-shared-pill">{question.framework}</span>
          </div>

          {phase === "input" && (
            <>
              <label className="ds-shared-row">
                <span className="ds-shared-label">Your answer</span>
                <textarea
                  ref={textareaRef}
                  className="ds-shared-textarea"
                  rows={6}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Speak through your answer here..."
                />
              </label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  className="ds-btn ds-btn--secondary"
                  disabled
                  onClick={() => toast.info("Audio recording is in beta")}
                >
                  <Mic size={14} />
                  <span>Record audio</span>
                </button>
                <span className="ds-shared-hint">
                  Tip: think Pyramid + STAR + MECE
                </span>
              </div>
            </>
          )}

          {phase === "scoring" && (
            <div className="ds-shared-loader" aria-live="polite">
              <span className="ds-shared-loader__dot" />
              <span className="ds-shared-loader__dot" />
              <span className="ds-shared-loader__dot" />
            </div>
          )}

          {phase === "results" && scores && (
            <div className="ds-shared-stack">
              <div className="prep-mock__metrics" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <ScoreMetric label="Structure" value={scores.structure} />
                <ScoreMetric label="Conciseness" value={scores.conciseness} />
                <ScoreMetric label="Evidence" value={scores.evidence} />
                <ScoreMetric label="Memorability" value={scores.memorability} />
              </div>
              <div>
                <div className="ds-shared-label" style={{ marginBottom: 6 }}>
                  Feedback
                </div>
                <ul className="ds-shared-list">
                  {feedback.map((fb, i) => (
                    <li key={i}>{fb}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>
          Cancel
        </button>
        {phase === "input" && (
          <button
            type="button"
            className="ds-btn ds-btn--primary"
            onClick={handleSubmit}
            disabled={!answer.trim()}
          >
            Submit & score
          </button>
        )}
        {phase === "scoring" && (
          <button type="button" className="ds-btn ds-btn--primary" disabled>
            Scoring…
          </button>
        )}
        {phase === "results" && (
          <button
            type="button"
            className="ds-btn ds-btn--primary"
            onClick={handleSaveClose}
          >
            Save & close
          </button>
        )}
      </ModalFooter>
    </Modal>
  );
}
