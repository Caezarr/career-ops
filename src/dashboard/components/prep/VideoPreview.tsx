import { Mic } from 'lucide-react';

export default function VideoPreview() {
  return (
    <div className="prep-video">
      <div className="prep-video__glow" aria-hidden="true" />
      <div className="prep-video__badge">
        <Mic size={12} strokeWidth={2.4} />
        <span>AI Interviewer</span>
      </div>
    </div>
  );
}
