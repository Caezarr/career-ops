import {
  User,
  Key,
  AudioWaveform,
  Palette,
  Bell,
  CreditCard,
  MessageSquareWarning,
  Briefcase,
} from 'lucide-react';
import { useAppStore, type SettingsTab } from '../../store';

interface NavItem {
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  /** Render a small "Beta" chip next to the label — used to make the
   *  feedback entry visible without screaming. */
  beta?: boolean;
}

const items: NavItem[] = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'apiKeys', label: 'Developers', icon: Key },
  { id: 'jobSources', label: 'Job sources', icon: Briefcase },
  { id: 'audio', label: 'Audio', icon: AudioWaveform },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'feedback', label: 'Feedback', icon: MessageSquareWarning, beta: true },
];

export default function SettingsNav() {
  const active = useAppStore((s) => s.settingsTab);
  const setActive = useAppStore((s) => s.setSettingsTab);

  return (
    <nav className="settings-nav" aria-label="Settings sections">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={
              'settings-nav__item' +
              (isActive ? ' settings-nav__item--active' : '')
            }
            aria-current={isActive ? 'true' : undefined}
            onClick={() => setActive(item.id)}
          >
            <Icon size={18} strokeWidth={2} className="settings-nav__icon" />
            <span>{item.label}</span>
            {item.beta && <span className="settings-nav__chip">Beta</span>}
          </button>
        );
      })}
    </nav>
  );
}
