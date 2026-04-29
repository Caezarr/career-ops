import { CheckCircle2, MoreHorizontal, RefreshCw } from 'lucide-react';
import PlanTask from './PlanTask';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useToast,
} from '../../primitives';
import { useAppStore } from '../../store';

export default function TodaysPlanCard() {
  const toast = useToast();
  const todaysPlan = useAppStore((s) => s.todaysPlan);
  const togglePlanTask = useAppStore((s) => s.togglePlanTask);

  function markAllDone() {
    for (const t of todaysPlan) {
      if (!t.done) togglePlanTask(t.id);
    }
    toast.success('All tasks marked done');
  }

  function resetDay() {
    for (const t of todaysPlan) {
      if (t.done) togglePlanTask(t.id);
    }
    toast.success('Day reset');
  }

  return (
    <section className="prep-plan">
      <div className="prep-plan__header">
        <h3 className="prep-plan__title">Today's prep plan</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="prep-plan__more" aria-label="More">
              <MoreHorizontal size={16} strokeWidth={2} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem icon={CheckCircle2} onSelect={markAllDone}>
              Mark all done
            </DropdownMenuItem>
            <DropdownMenuItem icon={RefreshCw} onSelect={resetDay}>
              Reset day
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ul className="prep-plan__list">
        {todaysPlan.map((t) => (
          <PlanTask
            key={t.id}
            title={t.title}
            duration={t.duration}
            done={t.done}
            onToggle={() => togglePlanTask(t.id)}
          />
        ))}
      </ul>
    </section>
  );
}
