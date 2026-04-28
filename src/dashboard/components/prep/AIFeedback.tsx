import { Sparkles, CheckCircle2 } from 'lucide-react';

interface AIFeedbackProps {
  items: string[];
}

export default function AIFeedback({ items }: AIFeedbackProps) {
  return (
    <div className="prep-ai-feedback">
      <div className="prep-ai-feedback__header">
        <Sparkles size={14} strokeWidth={2} />
        <span>AI feedback</span>
      </div>
      <ul className="prep-ai-feedback__list">
        {items.map((item, idx) => (
          <li key={idx} className="prep-ai-feedback__item">
            <CheckCircle2 size={14} strokeWidth={2} className="prep-ai-feedback__check" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
