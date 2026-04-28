import { Sparkles } from 'lucide-react';

interface AISummaryCardProps {
  summary: string;
}

export default function AISummaryCard({ summary }: AISummaryCardProps) {
  return (
    <section className="ai-summary">
      <header className="ai-summary__header">
        <Sparkles size={14} className="ai-summary__icon" />
        <span className="ai-summary__title">AI summary</span>
        <span className="ai-summary__beta">Beta</span>
      </header>
      <p className="ai-summary__body">{summary}</p>
      <a href="#match" className="ai-summary__link">
        See how we matched you →
      </a>
    </section>
  );
}
