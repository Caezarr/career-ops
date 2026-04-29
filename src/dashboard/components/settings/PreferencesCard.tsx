import {
  Keyboard,
  Power,
  Mail,
  Activity,
  Sparkles,
} from 'lucide-react';
import PreferenceItem from './PreferenceItem';
import { mockPreferences, type PreferenceIcon } from '../../data/settings';
import { useAppStore } from '../../store';
import type { Preferences } from '../../store';

const ICONS: Record<PreferenceIcon, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  keyboard: Keyboard,
  power: Power,
  mail: Mail,
  activity: Activity,
  sparkles: Sparkles,
};

const ID_TO_KEY: Record<string, keyof Preferences> = {
  kbd: 'keyboardShortcuts',
  login: 'startOnLogin',
  email: 'emailNotifications',
  insights: 'weeklyInsights',
  ai: 'aiActivitySummaries',
};

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
        {mockPreferences.map((pref) => {
          const Icon = ICONS[pref.icon];
          const key = ID_TO_KEY[pref.id];
          const checked = key ? preferences[key] : pref.enabled;
          return (
            <PreferenceItem
              key={pref.id}
              icon={<Icon size={16} strokeWidth={2} />}
              title={pref.title}
              subtitle={pref.subtitle}
              checked={checked}
              onChange={(next) => {
                if (key) setPreference(key, next);
              }}
            />
          );
        })}
      </div>
    </section>
  );
}
