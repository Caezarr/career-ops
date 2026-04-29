import { Sparkles } from 'lucide-react';
import { useToast } from '../../primitives';

interface AINextStepsCardProps {
  steps: string[];
}

export default function AINextStepsCard({ steps }: AINextStepsCardProps) {
  const toast = useToast();

  if (steps.length === 0) return null;

  return (
    <section className="ai-next-steps">
      <header className="ai-next-steps__header">
        <Sparkles size={16} strokeWidth={2} className="ai-next-steps__header-icon" />
        <span className="ai-next-steps__title">AI next steps</span>
      </header>
      <ul className="ai-next-steps__list">
        {steps.map((step) => (
          <li
            key={step}
            className="ai-next-steps__item ai-next-steps__item--hover"
            onClick={() => toast.info(step)}
          >
            <span className="ai-next-steps__dot" aria-hidden="true" />
            <span>{step}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
