import type { StateCreator } from "zustand";

export type PipelineSort = "date" | "match";

export type SettingsTab =
  | "account"
  | "apiKeys"
  | "audio"
  | "appearance"
  | "notifications"
  | "billing";

export type CopilotMode = "qa" | "pitch";

export interface UiSlice {
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;

  // Pipeline (Dashboard) UI state
  pipelineRoleFilter: string;
  setPipelineRoleFilter: (role: string) => void;
  pipelineSort: PipelineSort;
  setPipelineSort: (sort: PipelineSort) => void;

  // Jobs page — monitor matches toggle
  monitorMatches: boolean;
  setMonitorMatches: (on: boolean) => void;

  // Applications page — page size
  applicationsPageSize: number;
  setApplicationsPageSize: (size: number) => void;

  // Settings page sub-tab.
  settingsTab: SettingsTab;
  setSettingsTab: (tab: SettingsTab) => void;

  // Copilot dashboard panel visibility / state.
  copilotPanelVisible: boolean;
  copilotPanelMinimized: boolean;
  setCopilotPanelVisible: (visible: boolean) => void;
  setCopilotPanelMinimized: (minimized: boolean) => void;

  // Copilot mode tabs (Q&A vs Pitch).
  copilotMode: CopilotMode;
  setCopilotMode: (mode: CopilotMode) => void;
}

export const createUiSlice: StateCreator<UiSlice> = (set) => ({
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () =>
    set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),

  pipelineRoleFilter: "All roles",
  setPipelineRoleFilter: (role) => set({ pipelineRoleFilter: role }),
  pipelineSort: "date",
  setPipelineSort: (sort) => set({ pipelineSort: sort }),

  monitorMatches: true,
  setMonitorMatches: (on) => set({ monitorMatches: on }),

  applicationsPageSize: 7,
  setApplicationsPageSize: (size) => set({ applicationsPageSize: size }),

  settingsTab: "account",
  setSettingsTab: (settingsTab) => set({ settingsTab }),

  copilotPanelVisible: true,
  copilotPanelMinimized: false,
  setCopilotPanelVisible: (copilotPanelVisible) => set({ copilotPanelVisible }),
  setCopilotPanelMinimized: (copilotPanelMinimized) => set({ copilotPanelMinimized }),

  copilotMode: "qa",
  setCopilotMode: (copilotMode) => set({ copilotMode }),
});
