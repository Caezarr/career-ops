import {
  Keyboard,
  Power,
  Mail,
  Activity,
  Sparkles,
} from 'lucide-react';
import PreferenceItem from './PreferenceItem';
import { mockPreferences, type PreferenceIcon } from '../../data/settings';

const ICONS: Record<PreferenceIcon, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  keyboard: Keyboard,
  power: Power,
  mail: Mail,
  activity: Activity,
  sparkles: Sparkles,
};

export default function PreferencesCard() {
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
          return (
            <PreferenceItem
              key={pref.id}
              icon={<Icon size={16} strokeWidth={2} />}
              title={pref.title}
              subtitle={pref.subtitle}
              defaultEnabled={pref.enabled}
            />
          );
        })}
      </div>
    </section>
  );
}
