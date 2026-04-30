import { Sun, Moon, Monitor } from 'lucide-react';
import { useAppStore } from '../../store';
import type { ThemeChoice } from '../../store/slices/appearance';

const THEME_OPTIONS: { id: ThemeChoice; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'light', label: 'Light', Icon: Sun },
  { id: 'dark', label: 'Dark', Icon: Moon },
  { id: 'system', label: 'Match system', Icon: Monitor },
];

export default function AppearanceSettingsCard() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  return (
    <section className="settings-card" aria-labelledby="settings-appearance-title">
      <h2 id="settings-appearance-title" className="settings-card__title">
        Appearance
      </h2>
      <p className="settings-appearance__lede">
        Theme is applied immediately across the dashboard.
      </p>

      <div className="settings-appearance__row">
        <span className="settings-appearance__label">Theme</span>
        <div className="settings-appearance__seg" role="radiogroup" aria-label="Theme">
          {THEME_OPTIONS.map(({ id, label, Icon }) => {
            const selected = theme === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={
                  'settings-appearance__seg-btn' +
                  (selected ? ' settings-appearance__seg-btn--active' : '')
                }
                onClick={() => setTheme(id)}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
