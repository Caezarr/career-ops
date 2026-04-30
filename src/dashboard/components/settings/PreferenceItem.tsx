import type { ReactNode } from 'react';
import Toggle from './Toggle';

interface PreferenceItemProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Mark the item as not yet implemented — disables the toggle, dims the
   *  row, and shows a "Coming soon" pill. We surface what's planned
   *  honestly rather than letting users flip dead flags. */
  comingSoon?: boolean;
}

export default function PreferenceItem({
  icon,
  title,
  subtitle,
  checked,
  onChange,
  comingSoon = false,
}: PreferenceItemProps) {
  return (
    <div
      className={
        'settings-pref' + (comingSoon ? ' settings-pref--soon' : '')
      }
      aria-disabled={comingSoon || undefined}
    >
      <div className="settings-pref__left">
        <div className="settings-pref__icon" aria-hidden="true">
          {icon}
        </div>
        <div className="settings-pref__text">
          <div className="settings-pref__title-row">
            <span className="settings-pref__title">{title}</span>
            {comingSoon && (
              <span className="settings-pref__badge">Coming soon</span>
            )}
          </div>
          <div className="settings-pref__subtitle">{subtitle}</div>
        </div>
      </div>
      <Toggle
        checked={comingSoon ? false : checked}
        onChange={comingSoon ? () => {} : onChange}
        ariaLabel={title}
      />
    </div>
  );
}
