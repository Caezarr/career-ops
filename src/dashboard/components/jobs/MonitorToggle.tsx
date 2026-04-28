import { useState } from 'react';

interface MonitorToggleProps {
  defaultOn?: boolean;
}

export default function MonitorToggle({ defaultOn = true }: MonitorToggleProps) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Monitor new matches"
      className={`monitor-toggle${on ? ' monitor-toggle--on' : ''}`}
      onClick={() => setOn((v) => !v)}
    >
      <span className="monitor-toggle__knob" />
    </button>
  );
}
