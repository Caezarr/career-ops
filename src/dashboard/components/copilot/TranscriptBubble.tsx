import type { TranscriptFrom } from '../../data/copilot';

interface TranscriptBubbleProps {
  from: TranscriptFrom;
  name: string;
  text: string;
  timestamp: string;
}

export default function TranscriptBubble({
  from,
  name,
  text,
  timestamp,
}: TranscriptBubbleProps) {
  const isAi = from === 'ai';

  return (
    <div className={`cp-bubble cp-bubble--${from}`}>
      <div className="cp-bubble__avatar" aria-hidden="true">
        <span className="cp-bubble__avatar-text">{isAi ? 'AI' : 'GR'}</span>
        {!isAi && <span className="cp-bubble__avatar-dot" />}
      </div>
      <div className="cp-bubble__body">
        <div className="cp-bubble__meta">
          <span className="cp-bubble__name">{name}</span>
          <span className="cp-bubble__time">{timestamp}</span>
        </div>
        <p className="cp-bubble__text">{text}</p>
      </div>
    </div>
  );
}
