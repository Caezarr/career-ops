import { CheckCircle2 } from 'lucide-react';

interface WhyYouMatchCardProps {
  items: string[];
}

export default function WhyYouMatchCard({ items }: WhyYouMatchCardProps) {
  return (
    <section className="why-match">
      <h3 className="why-match__title">Why you match</h3>
      <ul className="why-match__grid">
        {items.map((item, idx) => (
          <li key={idx} className="why-match__item">
            <CheckCircle2 size={16} className="why-match__icon" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
