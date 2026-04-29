import { ArrowRight, TrendingUp } from "lucide-react";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "../../primitives";
import { useAppStore } from "../../store";
import { useNavigation } from "../../navigation";

interface InsightsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function InsightsModal({ open, onClose }: InsightsModalProps) {
  const { navigate } = useNavigation();
  const applications = useAppStore((s) => s.applications);
  const prepSessions = useAppStore((s) => s.prepSessions);

  // Aggregate stats.
  const interviews = applications.filter(
    (a) => a.stage === "interview" || a.stage === "phone_screen",
  ).length;
  const sessionScores = prepSessions.flatMap((s) =>
    Object.values(s.scores),
  );
  const avgScore =
    sessionScores.length > 0
      ? (
          sessionScores.reduce((a, b) => a + b, 0) / sessionScores.length
        ).toFixed(1)
      : "—";

  const jobs = useAppStore((s) => s.jobs);
  // Last 10 timeline events across all applications.
  const events = applications
    .flatMap((a) => {
      const job = jobs.find((j) => j.id === a.jobId);
      return a.timeline.map((t) => ({ ...t, company: job?.company ?? "" }));
    })
    .slice(0, 10);

  return (
    <Modal open={open} onClose={onClose} size="lg" ariaLabel="Full insights">
      <ModalHeader
        title="This week's insights"
        subtitle="Quality, interviews, and recent activity"
        onClose={onClose}
      />
      <ModalBody>
        <section className="ds-insight-section">
          <div className="ds-insight-section__title">Answer quality (8 weeks)</div>
          <svg
            viewBox="0 0 600 160"
            preserveAspectRatio="none"
            className="ds-insight-chart"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="ds-insight-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M 0 130 C 60 122, 110 110, 180 96 S 300 64, 380 48 S 520 22, 600 12 L 600 160 L 0 160 Z"
              fill="url(#ds-insight-grad)"
            />
            <path
              d="M 0 130 C 60 122, 110 110, 180 96 S 300 64, 380 48 S 520 22, 600 12"
              fill="none"
              stroke="#6366f1"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </section>

        <section className="ds-insight-stats">
          <div className="ds-insight-stat">
            <div className="ds-insight-stat__label">Interviews</div>
            <div className="ds-insight-stat__value">{interviews}</div>
          </div>
          <div className="ds-insight-stat">
            <div className="ds-insight-stat__label">Avg score</div>
            <div className="ds-insight-stat__value">{avgScore}/10</div>
          </div>
          <div className="ds-insight-stat">
            <div className="ds-insight-stat__label">Most improved</div>
            <div className="ds-insight-stat__value">Behavioral</div>
            <div className="ds-insight-stat__delta">
              <TrendingUp size={12} /> +18%
            </div>
          </div>
        </section>

        <section className="ds-insight-section">
          <div className="ds-insight-section__title">Recent activity</div>
          {events.length === 0 ? (
            <div className="ds-empty">No recent activity yet.</div>
          ) : (
            <ul className="ds-timeline">
              {events.map((e) => (
                <li key={e.id} className="ds-timeline__item">
                  <span className="ds-timeline__dot" />
                  <div className="ds-timeline__body">
                    <div className="ds-timeline__title">{e.title}</div>
                    <div className="ds-timeline__meta">
                      {e.company ? `${e.company} · ` : ""}
                      {e.date}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </ModalBody>
      <ModalFooter>
        <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>
          Close
        </button>
        <button
          type="button"
          className="ds-btn ds-btn--primary"
          onClick={() => {
            navigate("prep");
            onClose();
          }}
        >
          Open Prep <ArrowRight size={14} />
        </button>
      </ModalFooter>
    </Modal>
  );
}
