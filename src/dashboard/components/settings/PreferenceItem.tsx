import { useState } from 'react';
import type { ReactNode } from 'react';
import Toggle from './Toggle';

interface PreferenceItemProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  defaultEnabled?: boolean;
}

export default function PreferenceItem({
  icon,
  title,
  subtitle,
  defaultEnabled = true,
}: PreferenceItemProps) {
  const [on, setOn] = useState<boolean>(defaultEnabled);

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
      <Toggle checked={on} onChange={setOn} ariaLabel={title} />
    </div>
  );
}
