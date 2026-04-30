import { ChevronDown, Sun, Moon, Monitor } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../primitives';
import { useAppStore } from '../../store';
import type {
  AccentChoice,
  FontSizeChoice,
  ThemeChoice,
} from '../../store/slices/appearance';

const THEME_OPTIONS: { id: ThemeChoice; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'light', label: 'Light', Icon: Sun },
  { id: 'dark', label: 'Dark', Icon: Moon },
  { id: 'system', label: 'Match system', Icon: Monitor },
];

const FONT_OPTIONS: { id: FontSizeChoice; label: string }[] = [
  { id: 'small', label: 'Compact' },
  { id: 'medium', label: 'Comfortable' },
  { id: 'large', label: 'Spacious' },
];

const ACCENTS: { id: AccentChoice; label: string; color: string }[] = [
  { id: 'indigo', label: 'Indigo', color: '#6366f1' },
  { id: 'purple', label: 'Purple', color: '#8b5cf6' },
  { id: 'blue', label: 'Blue', color: '#3b82f6' },
  { id: 'green', label: 'Green', color: '#10b981' },
];

export default function AppearanceSettingsCard() {
  const theme = useAppStore((s) => s.theme);
  const fontSize = useAppStore((s) => s.fontSize);
  const accent = useAppStore((s) => s.accent);
  const setTheme = useAppStore((s) => s.setTheme);
  const setFontSize = useAppStore((s) => s.setFontSize);
  const setAccent = useAppStore((s) => s.setAccent);

  const fontLabel = FONT_OPTIONS.find((f) => f.id === fontSize)?.label ?? 'Comfortable';

  return (
    <section className="settings-card" aria-labelledby="settings-appearance-title">
      <h2 id="settings-appearance-title" className="settings-card__title">
        Appearance
      </h2>
      <p className="settings-appearance__lede">
        Theme and density are applied immediately across the dashboard.
      </p>

      {/* ── Theme — segmented control ───────────────────────────────── */}
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

      {/* ── Density — dropdown ─────────────────────────────────────── */}
      <div className="settings-appearance__row">
        <span className="settings-appearance__label">Density</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="ds-shared-select settings-appearance__select">
              <span>{fontLabel}</span>
              <ChevronDown size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {FONT_OPTIONS.map((f) => (
              <DropdownMenuItem key={f.id} onSelect={() => setFontSize(f.id)}>
                {f.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Accent — color swatches ──────────────────────────────── */}
      <div className="settings-appearance__row">
        <span className="settings-appearance__label">Accent</span>
        <div className="settings-appearance__accents">
          {ACCENTS.map((a) => {
            const selected = accent === a.id;
            return (
              <button
                key={a.id}
                type="button"
                aria-label={a.label}
                aria-pressed={selected}
                title={a.label}
                onClick={() => setAccent(a.id)}
                className={
                  'settings-appearance__swatch' +
                  (selected ? ' settings-appearance__swatch--active' : '')
                }
                style={{ background: a.color }}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
