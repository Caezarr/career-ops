import type { StateCreator } from "zustand";

/** Per-CV run state for the multi-variant analyzer. */
export type AnalyzerCvStatus =
  | "queued"
  | "running"
  | "done"
  | "error"
  | "skipped-cached";

export interface AnalyzerCvState {
  status: AnalyzerCvStatus;
  error?: string;
}

export interface AnalyzerSlice {
  /** True while a background run is iterating CVs. Survives navigation
   *  because it lives in the global store, not in a component. */
  analyzerRunning: boolean;
  /** Per-CV state for the active or last run. */
  analyzerProgress: Record<string, AnalyzerCvState>;
  /** Snapshot of the JD context the active run is comparing against. */
  analyzerJdSnippet: string;
  /** Wall-clock timestamp the run started (ms). */
  analyzerStartedAt?: number;

  setAnalyzerRunning: (b: boolean) => void;
  setAnalyzerProgress: (p: Record<string, AnalyzerCvState>) => void;
  setAnalyzerProgressFor: (cvId: string, state: AnalyzerCvState) => void;
  setAnalyzerJdSnippet: (s: string) => void;
  setAnalyzerStartedAt: (ts: number | undefined) => void;
  resetAnalyzer: () => void;
}

export const createAnalyzerSlice: StateCreator<AnalyzerSlice> = (set) => ({
  analyzerRunning: false,
  analyzerProgress: {},
  analyzerJdSnippet: "",
  analyzerStartedAt: undefined,

  setAnalyzerRunning: (analyzerRunning) => set({ analyzerRunning }),
  setAnalyzerProgress: (analyzerProgress) => set({ analyzerProgress }),
  setAnalyzerProgressFor: (cvId, state) =>
    set((s) => ({
      analyzerProgress: { ...s.analyzerProgress, [cvId]: state },
    })),
  setAnalyzerJdSnippet: (analyzerJdSnippet) => set({ analyzerJdSnippet }),
  setAnalyzerStartedAt: (analyzerStartedAt) => set({ analyzerStartedAt }),
  resetAnalyzer: () =>
    set({
      analyzerRunning: false,
      analyzerProgress: {},
      analyzerJdSnippet: "",
      analyzerStartedAt: undefined,
    }),
});
