import type { StateCreator } from "zustand";
import type {
  IngestProvider,
  IngestRun,
  IngestRunError,
  IngestSource,
} from "../types";
import { uid } from "../utils";

// Default user-friendly label when the user doesn't provide one.
function defaultLabel(provider: IngestProvider, identifier: string): string {
  if (provider === "ycombinator") return "Y Combinator · Work at a Startup";
  const cap = identifier.charAt(0).toUpperCase() + identifier.slice(1);
  const providerLabel = {
    greenhouse: "Greenhouse",
    lever: "Lever",
    ashby: "Ashby",
    ycombinator: "Y Combinator",
  }[provider];
  return `${cap} · ${providerLabel}`;
}

export interface IngestSlice {
  ingestSources: IngestSource[];
  ingestRuns: IngestRun[];
  /** True while a sync is running anywhere in the app. */
  ingestSyncing: boolean;
  /** Last successful sync wall-clock (epoch ms). */
  ingestLastSyncedAt: number | null;

  addIngestSource: (input: {
    provider: IngestProvider;
    identifier: string;
    label?: string;
  }) => IngestSource;
  removeIngestSource: (id: string) => void;
  toggleIngestSource: (id: string) => void;
  setIngestSourceState: (
    id: string,
    patch: Partial<Pick<IngestSource, "lastSyncedAt" | "lastError">>,
  ) => void;

  startIngestRun: (source?: IngestProvider) => IngestRun;
  finishIngestRun: (
    runId: string,
    patch: { fetchedCount: number; newCount: number; errors: IngestRunError[] },
  ) => void;
  setIngestSyncing: (syncing: boolean) => void;
}

export const createIngestSlice: StateCreator<IngestSlice> = (set) => ({
  ingestSources: [],
  ingestRuns: [],
  ingestSyncing: false,
  ingestLastSyncedAt: null,

  addIngestSource: ({ provider, identifier, label }) => {
    const source: IngestSource = {
      id: uid("src"),
      provider,
      identifier: provider === "ycombinator" ? "" : identifier.trim(),
      label: label?.trim() || defaultLabel(provider, identifier.trim()),
      enabled: true,
      addedAt: Date.now(),
    };
    set((state) => ({ ingestSources: [...state.ingestSources, source] }));
    return source;
  },

  removeIngestSource: (id) =>
    set((state) => ({
      ingestSources: state.ingestSources.filter((s) => s.id !== id),
    })),

  toggleIngestSource: (id) =>
    set((state) => ({
      ingestSources: state.ingestSources.map((s) =>
        s.id === id ? { ...s, enabled: !s.enabled } : s,
      ),
    })),

  setIngestSourceState: (id, patch) =>
    set((state) => ({
      ingestSources: state.ingestSources.map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      ),
    })),

  startIngestRun: (source) => {
    const run: IngestRun = {
      id: uid("run"),
      startedAt: Date.now(),
      source,
      fetchedCount: 0,
      newCount: 0,
      errors: [],
    };
    set((state) => ({ ingestRuns: [run, ...state.ingestRuns].slice(0, 50) }));
    return run;
  },

  finishIngestRun: (runId, patch) =>
    set((state) => ({
      ingestRuns: state.ingestRuns.map((r) =>
        r.id === runId
          ? {
              ...r,
              finishedAt: Date.now(),
              fetchedCount: patch.fetchedCount,
              newCount: patch.newCount,
              errors: patch.errors,
            }
          : r,
      ),
      ingestLastSyncedAt:
        patch.errors.length === 0 ? Date.now() : state.ingestLastSyncedAt,
    })),

  setIngestSyncing: (syncing) => set({ ingestSyncing: syncing }),
});
