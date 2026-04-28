import { CheckCircle2, Circle } from 'lucide-react';

interface PlanTaskProps {
  done?: boolean;
  title: string;
  duration: string;
}

export default function PlanTask({ done = false, title, duration }: PlanTaskProps) {
  return (
    <li className="prep-task">
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
      <span className="prep-task__title">{title}</span>
      <span className="prep-task__duration">{duration}</span>
    </li>
  );
}
