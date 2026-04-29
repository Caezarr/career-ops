import { useAppStore } from '../../store';
import { useToast } from '../../primitives';

export default function MonitorToggle() {
  const on = useAppStore((s) => s.monitorMatches);
  const setOn = useAppStore((s) => s.setMonitorMatches);
  const toast = useToast();

  function handleToggle() {
    const next = !on;
    setOn(next);
    if (next) {
      toast.success('Monitoring new matches');
    } else {
      toast.info('Match monitoring paused');
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Monitor new matches"
      className={`monitor-toggle${on ? ' monitor-toggle--on' : ''}`}
      onClick={handleToggle}
    >
      <span className="monitor-toggle__knob" />
    </button>
  );
}
