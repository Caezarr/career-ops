import ScoreChip from './ScoreChip';
import { mockCopilotSession } from '../../data/copilot';

export default function CopilotAnswerCard() {
  const { answer, scores } = mockCopilotSession;

  return (
    <div className="cp-answer">
      <span className="cp-section-eyebrow">Copilot answer</span>

      <div className="cp-answer__card">
        <p className="cp-answer__text">
          {answer}
          <span className="cp-answer__cursor" aria-hidden="true" />
        </p>
      </div>

      <div className="cp-answer__chips">
        {scores.map((score) => (
          <ScoreChip
            key={score.label}
            label={score.label}
            color={score.color}
            icon={score.icon}
          />
        ))}
      </div>
    </div>
  );
}
