import type { StateCreator } from "zustand";
import type { Preferences } from "../types";
import { mockPreferences as legacyPrefs } from "../../data/settings";

function lookup(id: string): boolean {
  const found = legacyPrefs.find((p) => p.id === id);
  return found?.enabled ?? false;
}

const seedPreferences: Preferences = {
  keyboardShortcuts: lookup("kbd"),
  startOnLogin: lookup("login"),
  emailNotifications: lookup("email"),
  weeklyInsights: lookup("insights"),
  aiActivitySummaries: lookup("ai"),
};

export interface PreferencesSlice {
  preferences: Preferences;
  togglePreference: (key: keyof Preferences) => void;
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
}

export const createPreferencesSlice: StateCreator<PreferencesSlice> = (set) => ({
  preferences: seedPreferences,
  togglePreference: (key) =>
    set((state) => ({
      preferences: { ...state.preferences, [key]: !state.preferences[key] },
    })),
  setPreference: (key, value) =>
    set((state) => ({
      preferences: { ...state.preferences, [key]: value },
    })),
});
