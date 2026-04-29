import type { ReactNode } from 'react';
import Toggle from './Toggle';

interface PreferenceItemProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}

export default function PreferenceItem({
  icon,
  title,
  subtitle,
  checked,
  onChange,
}: PreferenceItemProps) {
  return (
    <div className="settings-pref">
      <div className="settings-pref__left">
        <div className="settings-pref__icon" aria-hidden="true">
          {icon}
        </div>
        <div className="settings-pref__text">
          <div className="settings-pref__title">{title}</div>
          <div className="settings-pref__subtitle">{subtitle}</div>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} ariaLabel={title} />
    </div>
  );
}
