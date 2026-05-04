// Frontend wrapper around the Rust `ingest_*` Tauri commands.
//
// Each `runIngest*` function:
//   1. starts an IngestRun in the Zustand store (for UI history)
//   2. invokes the Rust command and unpacks the response
//   3. merges the resulting jobs into the jobs slice via `setIngestedJobs`
//      (which preserves bookmarks)
//   4. finishes the run, recording counts + errors
//
// Errors are caught and recorded on the run (never thrown to the caller's
// UI) so a flaky single source can't break the whole sync.

import { invoke } from "@tauri-apps/api/core";
import type { IngestProvider, Job } from "../store/types";
import { useAppStore } from "../store";

interface IngestRunResultDto {
  provider: IngestProvider;
  identifier?: string;
  jobs: Job[];
  elapsedMs: number;
}

export interface IngestRunSummary {
  provider: IngestProvider;
  identifier?: string;
  fetched: number;
  newCount: number;
  elapsedMs: number;
  error?: string;
}

/** Run a single source ingestion end-to-end. */
export async function runIngestSource(
  provider: IngestProvider,
  identifier: string,
): Promise<IngestRunSummary> {
  const store = useAppStore.getState();
  store.setIngestSyncing(true);
  const run = store.startIngestRun(provider);

  try {
    const result = await invoke<IngestRunResultDto>("ingest_run_source", {
      provider,
      identifier,
    });

    const { newCount } = useAppStore.getState().setIngestedJobs(result.jobs);

    useAppStore.getState().finishIngestRun(run.id, {
      fetchedCount: result.jobs.length,
      newCount,
      errors: [],
    });

    return {
      provider,
      identifier: result.identifier,
      fetched: result.jobs.length,
      newCount,
      elapsedMs: result.elapsedMs,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    useAppStore.getState().finishIngestRun(run.id, {
      fetchedCount: 0,
      newCount: 0,
      errors: [{ provider, identifier, message }],
    });
    return {
      provider,
      identifier,
      fetched: 0,
      newCount: 0,
      elapsedMs: 0,
      error: message,
    };
  } finally {
    useAppStore.getState().setIngestSyncing(false);
  }
}

/** Cheap pre-save validation: returns the count of jobs the provider
 *  would return for `identifier`. Throws on bad slug / network error
 *  so Settings can show a per-field validation error. */
export async function ingestHealthCheck(
  provider: IngestProvider,
  identifier: string,
): Promise<number> {
  const count = await invoke<number>("ingest_health_check", {
    provider,
    identifier,
  });
  return count;
}
