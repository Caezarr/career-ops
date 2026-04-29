import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../primitives';

type Theme = 'Light' | 'Dark' | 'System';
type FontSize = 'Small' | 'Medium' | 'Large';

interface Accent {
  id: string;
  label: string;
  color: string;
}

const ACCENTS: Accent[] = [
  { id: 'indigo', label: 'Indigo', color: 'var(--indigo)' },
  { id: 'purple', label: 'Purple', color: 'var(--purple)' },
  { id: 'blue', label: 'Blue', color: 'var(--blue)' },
  { id: 'green', label: 'Green', color: 'var(--green)' },
];

export default function AppearanceSettingsCard() {
  const [theme, setTheme] = useState<Theme>('System');
  const [fontSize, setFontSize] = useState<FontSize>('Medium');
  const [accent, setAccent] = useState<string>('indigo');

  return (
    <section className="settings-card" aria-labelledby="settings-appearance-title">
      <h2 id="settings-appearance-title" className="settings-card__title">
        Appearance
      </h2>
      <div style={{ display: 'grid', gap: 16, paddingTop: 4 }}>
        <div className="ds-shared-row">
          <span className="ds-shared-label">Theme</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="ds-shared-select">
                <span>{theme}</span>
                <ChevronDown size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {(['Light', 'Dark', 'System'] as Theme[]).map((t) => (
                <DropdownMenuItem key={t} onSelect={() => setTheme(t)}>
                  {t}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="ds-shared-row">
          <span className="ds-shared-label">Font size</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="ds-shared-select">
                <span>{fontSize}</span>
                <ChevronDown size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {(['Small', 'Medium', 'Large'] as FontSize[]).map((f) => (
                <DropdownMenuItem key={f} onSelect={() => setFontSize(f)}>
                  {f}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="ds-shared-row">
          <span className="ds-shared-label">Accent color</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {ACCENTS.map((a) => {
              const selected = accent === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  aria-label={a.label}
                  aria-pressed={selected}
                  onClick={() => setAccent(a.id)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: a.color,
                    border: selected
                      ? '2px solid var(--text-1)'
                      : '2px solid transparent',
                    boxShadow: selected ? '0 0 0 3px var(--bg)' : 'none',
                    cursor: 'pointer',
                  }}
                  title={a.label}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
