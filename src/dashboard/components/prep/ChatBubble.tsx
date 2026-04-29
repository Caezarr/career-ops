import UserAvatar from '../UserAvatar';

interface ChatBubbleProps {
  from: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export default function ChatBubble({ from, text, timestamp }: ChatBubbleProps) {
  const isAI = from === 'ai';
  return (
    <div className={`prep-bubble prep-bubble--${from}`}>
      {isAI ? (
        <div className={`prep-bubble__avatar prep-bubble__avatar--${from}`}>AI</div>
      ) : (
        <UserAvatar size={28} className={`prep-bubble__avatar prep-bubble__avatar--${from}`} />
      )}
      <div className="prep-bubble__content">
        <p className="prep-bubble__text">{text}</p>
        <span className="prep-bubble__time">{timestamp}</span>
      </div>
    </div>
  );
}
