import { useState } from 'react';
import {
  Mail,
  Calendar,
  FileText,
  ListChecks,
  MoreHorizontal,
  Check,
} from 'lucide-react';
import clsx from 'clsx';
import '../styles/tasks.css';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useToast,
} from '../primitives';
import { useAppStore } from '../store';
import type { DashboardTask } from '../store';
import { AddTaskModal } from './shared';

const ICON_MAP = {
  mail: Mail,
  calendar: Calendar,
  file: FileText,
  list: ListChecks,
} as const;

export default function TodayTasks() {
  const toast = useToast();
  const tasks = useAppStore((s) => s.todaysTasks);
  const toggleTask = useAppStore((s) => s.toggleDashboardTask);
  const setApps = useAppStore.setState;

  const [addOpen, setAddOpen] = useState(false);

  const openCount = tasks.filter((t) => !t.done).length;

  function markAllDone() {
    setApps((state) => ({
      todaysTasks: state.todaysTasks.map((t) => ({ ...t, done: true })),
    }));
    toast.success('All tasks marked done');
  }

  return (
    <section className="today-tasks" aria-label="Today's tasks">
      <div className="today-tasks__header">
        <h2 className="today-tasks__title">Today's tasks</h2>
        <span className="today-tasks__count">{openCount}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="today-tasks__more"
              aria-label="More options"
            >
              <MoreHorizontal size={16} strokeWidth={2} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={markAllDone}>
              Mark all done
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setAddOpen(true)}>
              Add task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="today-tasks__list">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task.id)} />
        ))}
        {tasks.length === 0 && (
          <div className="ds-empty">
            <ListChecks size={20} />
            <span>No tasks yet — add one to get started.</span>
          </div>
        )}
      </div>

      <AddTaskModal open={addOpen} onClose={() => setAddOpen(false)} />
    </section>
  );
}

function TaskRow({
  task,
  onToggle,
}: {
  task: DashboardTask;
  onToggle: () => void;
}) {
  const Icon = ICON_MAP[task.icon];
  return (
    <div className={clsx('task-item', task.done && 'task-item--done')}>
      <div className={`task-item__icon task-item__icon--${task.subtitleColor}`}>
        <Icon size={18} strokeWidth={2} />
      </div>
      <div className="task-item__text">
        <div className="task-item__title">{task.title}</div>
        <div
          className={`task-item__subtitle task-item__subtitle--${task.subtitleColor}`}
        >
          {task.subtitle}
        </div>
      </div>
      <button
        type="button"
        className={clsx(
          'task-item__check',
          task.done && 'task-item__check--done',
        )}
        aria-label={
          task.done
            ? `Mark "${task.title}" as not done`
            : `Mark "${task.title}" as done`
        }
        aria-pressed={task.done}
        onClick={onToggle}
      >
        {task.done && <Check size={12} strokeWidth={3} />}
      </button>
    </div>
  );
}
