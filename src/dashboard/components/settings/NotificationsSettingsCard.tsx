import { Mail, Bell, Volume2, Activity, Megaphone } from 'lucide-react';
import { useState } from 'react';
import PreferenceItem from './PreferenceItem';

interface NotifPref {
  id: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  title: string;
  subtitle: string;
}

const ITEMS: NotifPref[] = [
  { id: 'email', icon: Mail, title: 'Email digest', subtitle: 'Daily summary by email' },
  { id: 'push', icon: Bell, title: 'Push notifications', subtitle: 'Real-time alerts on this device' },
  { id: 'sound', icon: Volume2, title: 'Sound', subtitle: 'Play a sound for important events' },
  { id: 'weekly', icon: Activity, title: 'Weekly summary', subtitle: 'A weekly digest of your prep activity' },
  { id: 'marketing', icon: Megaphone, title: 'Marketing', subtitle: 'Product updates and tips' },
];

export default function NotificationsSettingsCard() {
  const [state, setState] = useState<Record<string, boolean>>({
    email: true,
    push: true,
    sound: false,
    weekly: true,
    marketing: false,
  });

  return (
    <section className="settings-card" aria-labelledby="settings-notif-title">
      <h2 id="settings-notif-title" className="settings-card__title">
        Notifications
      </h2>
      <div className="settings-preferences__list" style={{ paddingTop: 4 }}>
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <PreferenceItem
              key={item.id}
              icon={<Icon size={16} strokeWidth={2} />}
              title={item.title}
              subtitle={item.subtitle}
              checked={state[item.id] ?? false}
              onChange={(next) => setState((s) => ({ ...s, [item.id]: next }))}
            />
          );
        })}
      </div>
    </section>
  );
}
