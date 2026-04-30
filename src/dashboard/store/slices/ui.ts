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

export type PrepInterviewTrack =
  | "Behavioral + Technical"
  | "Behavioral only"
  | "Technical only"
  | "Case study"
  | "Culture fit";

export interface UiSlice {
  // Prep page — search query + interview track
  prepSearchQuery: string;
  setPrepSearchQuery: (q: string) => void;
  prepInterviewTrack: PrepInterviewTrack;
  setPrepInterviewTrack: (t: PrepInterviewTrack) => void;

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

  // ATS Analyzer (CV page) — persisted JD textarea so leaving the tab and
  // coming back keeps the input. Also reused as the JD for the Tailoring
  // workspace's Analyze match so the cache hit lands and we don't burn
  // credits on duplicate analyses.
  atsAnalyzerJd: string;
  setAtsAnalyzerJd: (jd: string) => void;
  clearAtsAnalyzerJd: () => void;

  /** CV right preview panel width in pixels. Persisted so the user's last
   *  drag stays put across sessions. Hard-clamped to [380, 900] — narrower
   *  becomes unreadable, wider hides the main column. */
  cvPreviewPanelWidth: number;
  setCvPreviewPanelWidth: (w: number) => void;
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

  prepSearchQuery: "",
  setPrepSearchQuery: (prepSearchQuery) => set({ prepSearchQuery }),
  prepInterviewTrack: "Behavioral + Technical",
  setPrepInterviewTrack: (prepInterviewTrack) => set({ prepInterviewTrack }),

  atsAnalyzerJd: "",
  setAtsAnalyzerJd: (atsAnalyzerJd) => set({ atsAnalyzerJd }),
  clearAtsAnalyzerJd: () => set({ atsAnalyzerJd: "" }),

  cvPreviewPanelWidth: 580,
  setCvPreviewPanelWidth: (w) =>
    set({ cvPreviewPanelWidth: Math.max(380, Math.min(900, Math.round(w))) }),
});
