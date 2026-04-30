import { Mail, Bell, Volume2, Activity, Megaphone, Play } from 'lucide-react';
import PreferenceItem from './PreferenceItem';
import { useAppStore } from '../../store';
import type { NotificationPrefs } from '../../store/slices/notificationPrefs';
import { playNotificationDing } from '../../lib/notificationSound';

interface NotifRow {
  id: keyof NotificationPrefs;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  title: string;
  subtitle: string;
  comingSoon?: boolean;
}

const ROWS: NotifRow[] = [
  {
    id: 'sound',
    Icon: Volume2,
    title: 'Notification sound',
    subtitle: 'Play a soft chime when Career OS surfaces a toast (e.g. analysis complete).',
  },
  {
    id: 'push',
    Icon: Bell,
    title: 'Native push notifications',
    subtitle: 'Show a macOS Notification Center alert on important events.',
    comingSoon: true,
  },
  {
    id: 'email',
    Icon: Mail,
    title: 'Email digest',
    subtitle: 'Daily summary by email — needs a notification service.',
    comingSoon: true,
  },
  {
    id: 'weekly',
    Icon: Activity,
    title: 'Weekly summary',
    subtitle: 'A weekly recap of your prep activity and pipeline movement.',
    comingSoon: true,
  },
  {
    id: 'marketing',
    Icon: Megaphone,
    title: 'Marketing',
    subtitle: 'Product updates and tips — sent at most once a fortnight.',
    comingSoon: true,
  },
];

export default function NotificationsSettingsCard() {
  const prefs = useAppStore((s) => s.notificationPrefs);
  const setPref = useAppStore((s) => s.setNotificationPref);

  return (
    <section className="settings-card" aria-labelledby="settings-notif-title">
      <h2 id="settings-notif-title" className="settings-card__title">
        Notifications
      </h2>
      <p className="settings-appearance__lede">
        Career OS keeps notifications local-first. The push / email channels
        unlock once we ship the notification service.
      </p>

      <div className="settings-preferences__list" style={{ paddingTop: 4 }}>
        {ROWS.map(({ id, Icon, title, subtitle, comingSoon }) => (
          <PreferenceItem
            key={id}
            icon={<Icon size={16} strokeWidth={2} />}
            title={title}
            subtitle={subtitle}
            checked={prefs[id]}
            comingSoon={comingSoon}
            onChange={(next) => setPref(id, next)}
          />
        ))}
      </div>

      {/* Test the sound after enabling — most browsers require a user
          gesture to unlock AudioContext, so a button next to the toggle
          is the natural place. */}
      <div className="settings-notif__test">
        <button
          type="button"
          className="settings-btn settings-btn--outline"
          onClick={() => playNotificationDing(prefs.sound ? 1 : 0.6)}
        >
          <Play size={13} />
          <span>Play sample chime</span>
        </button>
        <span className="settings-notif__test-hint">
          {prefs.sound
            ? 'Sound is on — toasts will play this chime.'
            : 'Sound is off — this preview plays at half volume so you can still pick a vibe.'}
        </span>
      </div>
    </section>
  );
}
