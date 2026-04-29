import {
  User,
  Key,
  AudioWaveform,
  Palette,
  Bell,
  CreditCard,
} from 'lucide-react';
import { useAppStore, type SettingsTab } from '../../store';

interface NavItem {
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}

const items: NavItem[] = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'apiKeys', label: 'API Keys', icon: Key },
  { id: 'audio', label: 'Audio', icon: AudioWaveform },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'billing', label: 'Billing', icon: CreditCard },
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
          </button>
        );
      })}
    </nav>
  );
}
