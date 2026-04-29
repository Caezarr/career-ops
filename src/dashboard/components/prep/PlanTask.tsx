import { CheckCircle2, Circle } from 'lucide-react';

interface PlanTaskProps {
  done?: boolean;
  title: string;
  duration: string;
  onToggle?: () => void;
}

export default function PlanTask({ done = false, title, duration, onToggle }: PlanTaskProps) {
  return (
    <li className="prep-task">
      <button
        type="button"
        className="prep-task__check-btn"
        onClick={onToggle}
        aria-label={done ? `Mark ${title} as not done` : `Mark ${title} as done`}
        aria-pressed={done}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          marginRight: 8,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        {done ? (
          <CheckCircle2
            size={18}
            strokeWidth={2}
            className="prep-task__icon prep-task__icon--done"
          />
        ) : (
          <Circle
            size={18}
            strokeWidth={2}
            className="prep-task__icon prep-task__icon--todo"
          />
        )}
      </button>
      <span
        className="prep-task__title"
        style={done ? { textDecoration: 'line-through', color: 'var(--text-3)' } : undefined}
      >
        {title}
      </span>
      <span className="prep-task__duration">{duration}</span>
    </li>
  );
}
