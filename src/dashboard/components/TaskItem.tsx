import { Mail, Calendar, FileText, ListChecks } from 'lucide-react';
import type { TaskItemData } from '../data/mock';

const iconMap = {
  mail: Mail,
  calendar: Calendar,
  fileText: FileText,
  listChecks: ListChecks,
} as const;

interface TaskItemProps {
  task: TaskItemData;
}

export default function TaskItem({ task }: TaskItemProps) {
  const Icon = iconMap[task.iconKey];

  return (
    <div className="task-item">
      <div className={`task-item__icon task-item__icon--${task.color}`}>
        <Icon size={18} strokeWidth={2} />
      </div>
      <div className="task-item__text">
        <div className="task-item__title">{task.title}</div>
        <div className={`task-item__subtitle task-item__subtitle--${task.color}`}>
          {task.subtitle}
        </div>
      </div>
      <button
        type="button"
        className="task-item__check"
        aria-label={`Mark "${task.title}" as done`}
      />
    </div>
  );
}
