import { Sparkles } from 'lucide-react';

interface AINextStepsCardProps {
  steps: string[];
}

export default function AINextStepsCard({ steps }: AINextStepsCardProps) {
  return (
    <section className="ai-next-steps">
      <header className="ai-next-steps__header">
        <Sparkles size={16} strokeWidth={2} className="ai-next-steps__header-icon" />
        <span className="ai-next-steps__title">AI next steps</span>
      </header>
      <ul className="ai-next-steps__list">
        {steps.map((step) => (
          <li key={step} className="ai-next-steps__item">
            <span className="ai-next-steps__dot" aria-hidden="true" />
            <span>{step}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
