import type { StateCreator } from 'zustand';

export type ThemeChoice = 'light' | 'dark' | 'system';

/** User-controlled visual preferences. Applied to the document root by
 *  useApplyAppearance() so they affect the entire dashboard subtree
 *  without prop drilling.
 *
 *  Density and accent were tried and dropped — they didn't move the
 *  needle visually for the current design system. We kept theme because
 *  Light/Dark/System is genuinely useful at the OS level. */
export interface AppearanceSlice {
  theme: ThemeChoice;
  setTheme: (t: ThemeChoice) => void;
}

export const createAppearanceSlice: StateCreator<AppearanceSlice> = (set) => ({
  theme: 'system',
  setTheme: (theme) => set({ theme }),
});
