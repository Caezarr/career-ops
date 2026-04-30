import { Keyboard, Power, Mail, Activity, Sparkles } from 'lucide-react';
import PreferenceItem from './PreferenceItem';
import { useAppStore } from '../../store';
import type { Preferences } from '../../store';

/** Each row maps to a key on the `preferences` slice. The `comingSoon`
 *  flag tells the user we haven't built the back-end yet — keyboard
 *  shortcuts and start-on-login are wired for real, the rest will land
 *  once we have a notification service. */
interface PrefRow {
  id: keyof Preferences;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  title: string;
  subtitle: string;
  comingSoon?: boolean;
}

const ROWS: PrefRow[] = [
  {
    id: 'keyboardShortcuts',
    Icon: Keyboard,
    title: 'Keyboard shortcuts',
    subtitle: 'Enable global shortcuts like ⌘K to open the command palette.',
  },
  {
    id: 'startOnLogin',
    Icon: Power,
    title: 'Start on login',
    subtitle: 'Open Career OS automatically when you log in to macOS.',
  },
  {
    id: 'emailNotifications',
    Icon: Mail,
    title: 'Email notifications',
    subtitle: 'Receive important updates by email — needs a notification service.',
    comingSoon: true,
  },
  {
    id: 'weeklyInsights',
    Icon: Activity,
    title: 'Weekly insights',
    subtitle: 'Summary of your prep activity and pipeline movement once a week.',
    comingSoon: true,
  },
  {
    id: 'aiActivitySummaries',
    Icon: Sparkles,
    title: 'AI activity summaries',
    subtitle: 'Periodic recap of how Career OS used your AI credits.',
    comingSoon: true,
  },
];

export default function PreferencesCard() {
  const preferences = useAppStore((s) => s.preferences);
  const setPreference = useAppStore((s) => s.setPreference);

  return (
    <section
      className="settings-card settings-preferences"
      aria-labelledby="settings-preferences-title"
    >
      <h2 id="settings-preferences-title" className="settings-card__title">
        Preferences
      </h2>

      <div className="settings-preferences__list">
        {ROWS.map((row) => {
          const { id, Icon, title, subtitle, comingSoon } = row;
          return (
            <PreferenceItem
              key={id}
              icon={<Icon size={16} strokeWidth={2} />}
              title={title}
              subtitle={subtitle}
              checked={preferences[id]}
              comingSoon={comingSoon}
              onChange={(next) => setPreference(id, next)}
            />
          );
        })}
      </div>
    </section>
  );
}
