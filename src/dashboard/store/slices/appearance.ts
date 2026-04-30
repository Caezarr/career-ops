import type { StateCreator } from 'zustand';

export type ThemeChoice = 'light' | 'dark' | 'system';
export type FontSizeChoice = 'small' | 'medium' | 'large';
export type AccentChoice = 'indigo' | 'purple' | 'blue' | 'green';

/** User-controlled visual preferences. Applied to the document root by
 *  useApplyAppearance() so they affect the entire dashboard subtree
 *  without prop drilling. */
export interface AppearanceSlice {
  theme: ThemeChoice;
  fontSize: FontSizeChoice;
  accent: AccentChoice;
  setTheme: (t: ThemeChoice) => void;
  setFontSize: (s: FontSizeChoice) => void;
  setAccent: (a: AccentChoice) => void;
}

export const createAppearanceSlice: StateCreator<AppearanceSlice> = (set) => ({
  theme: 'system',
  fontSize: 'medium',
  accent: 'indigo',
  setTheme: (theme) => set({ theme }),
  setFontSize: (fontSize) => set({ fontSize }),
  setAccent: (accent) => set({ accent }),
});
