import type { WeakArea } from '../../data/prep';

interface WeakAreasProps {
  items: WeakArea[];
}

export default function WeakAreas({ items }: WeakAreasProps) {
  return (
    <div className="prep-weak-areas">
      <span className="prep-weak-areas__label">Weak areas</span>
      <div className="prep-weak-areas__pills">
        {items.map((it) => (
          <span
            key={it.label}
            className={`prep-weak-pill prep-weak-pill--${it.color}`}
          >
            {it.label}
          </span>
        ))}
      </div>
    </div>
  );
}
