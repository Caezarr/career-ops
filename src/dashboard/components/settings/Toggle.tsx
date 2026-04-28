import { useState, useEffect } from 'react';

interface ToggleProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  size?: 'sm' | 'md';
  ariaLabel?: string;
}

export default function Toggle({
  checked,
  defaultChecked = true,
  onChange,
  size = 'md',
  ariaLabel,
}: ToggleProps) {
  const isControlled = checked !== undefined;
  const [internal, setInternal] = useState<boolean>(defaultChecked);

  useEffect(() => {
    if (isControlled) {
      setInternal(Boolean(checked));
    }
  }, [checked, isControlled]);

  const value = isControlled ? Boolean(checked) : internal;

  const handleClick = () => {
    const next = !value;
    if (!isControlled) setInternal(next);
    onChange?.(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={ariaLabel}
      className={
        'set-toggle' +
        (value ? ' set-toggle--on' : '') +
        (size === 'sm' ? ' set-toggle--sm' : '')
      }
      onClick={handleClick}
    >
      <span className="set-toggle__knob" />
    </button>
  );
}
