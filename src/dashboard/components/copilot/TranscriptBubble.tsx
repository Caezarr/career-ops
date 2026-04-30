import UserAvatar from '../UserAvatar';
import { Mic, Sparkles } from 'lucide-react';
import type { CopilotSpeaker } from '../../store/slices/copilotSessions';

interface TranscriptBubbleProps {
  speaker: CopilotSpeaker;
  /** Optional override label — falls back to a default per speaker. */
  name?: string;
  text: string;
  /** Pre-formatted timestamp string (e.g. "00:12:05" or "9:41 AM"). */
  timestamp: string;
  /** Highlight an in-flight bubble (e.g. live recruiter line still
   *  being transcribed). */
  live?: boolean;
}

const DEFAULT_NAME: Record<CopilotSpeaker, string> = {
  recruiter: 'Recruiter',
  you: 'You',
  system: 'System',
};

/** A single transcript bubble. The shape matches the persisted
 *  `CopilotTranscriptItem` so wiring is direct. */
export default function TranscriptBubble({
  speaker,
  name,
  text,
  timestamp,
  live = false,
}: TranscriptBubbleProps) {
  const displayName = name ?? DEFAULT_NAME[speaker];
  const bubbleClass = `cp-bubble cp-bubble--${speaker}${live ? ' cp-bubble--live' : ''}`;

  // System messages render as a centred, dimmer line — they're not a
  // real conversation turn, more like "Pitch generated" or the
  // permission warning.
  if (speaker === 'system') {
    return (
      <div className={bubbleClass}>
        <div className="cp-bubble__system">
          <Sparkles size={12} strokeWidth={2} />
          <span className="cp-bubble__system-text">{text}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={bubbleClass}>
      {speaker === 'recruiter' ? (
        <div className="cp-bubble__avatar" aria-hidden="true">
          <Mic size={14} strokeWidth={2} />
        </div>
      ) : (
        <div className="cp-bubble__avatar cp-bubble__avatar--user" aria-hidden="true">
          <UserAvatar size={28} />
          <span className="cp-bubble__avatar-dot" />
        </div>
      )}
      <div className="cp-bubble__body">
        <div className="cp-bubble__meta">
          <span className="cp-bubble__name">{displayName}</span>
          <span className="cp-bubble__time">{timestamp}</span>
          {live && <span className="cp-bubble__live-dot" aria-hidden="true" />}
        </div>
        <p className="cp-bubble__text">{text}</p>
      </div>
    </div>
  );
}
