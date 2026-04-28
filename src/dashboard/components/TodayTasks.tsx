import { MoreHorizontal } from 'lucide-react';
import '../styles/tasks.css';
import { mockTasks } from '../data/mock';
import TaskItem from './TaskItem';

export default function TodayTasks() {
  return (
    <section className="today-tasks" aria-label="Today's tasks">
      <div className="today-tasks__header">
        <h2 className="today-tasks__title">Today's tasks</h2>
        <span className="today-tasks__count">{mockTasks.length}</span>
        <button type="button" className="today-tasks__more" aria-label="More options">
          <MoreHorizontal size={16} strokeWidth={2} />
        </button>
      </div>
      <div className="today-tasks__list">
        {mockTasks.map((task) => (
          <TaskItem key={task.id} task={task} />
        ))}
      </div>
    </section>
  );
}
