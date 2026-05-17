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
import {
  deleteIngestSourceFromDb,
  saveIngestSourceToDb,
  setBookmarkInDb,
} from "./ingestDb";

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

  // JobTeaser has its own path: the cookies are HttpOnly so we can't
  // hit JT's API from a Rust HTTP client. Instead, we open an
  // invisible WebView at /fr/job-offers — the persistent WebKit
  // cookie store handles auth automatically, the bridge scrapes,
  // results land via the `jobteaser-jobs-received` event listener
  // wired in `lib/jobteaser.ts::subscribeJobTeaserAuth`. We return
  // an optimistic summary here; the store gets updated async.
  if (provider === "jobteaser") {
    try {
      await invoke<void>("jobteaser_sync_open");
      // Mark the run as launched — actual count materialises when
      // the events fire. We don't await the scrape (1-3s) here
      // because runIngestAll loops sequentially and we'd block the
      // other providers behind a WebView render.
      useAppStore.getState().finishIngestRun(run.id, {
        fetchedCount: 0,
        newCount: 0,
        errors: [],
      });
      return {
        provider,
        identifier,
        fetched: 0,
        newCount: 0,
        elapsedMs: 0,
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

interface IngestRunAllResultDto {
  jobs: Job[];
  successfulSources: number;
  failedSources: number;
  errors: { provider: IngestProvider; identifier?: string; message: string }[];
  elapsedMs: number;
}

export interface IngestRunAllSummary {
  fetched: number;
  newCount: number;
  successfulSources: number;
  failedSources: number;
  elapsedMs: number;
  keyword?: string;
  errors: IngestRunAllResultDto["errors"];
}

interface SourceSpecDto {
  provider: IngestProvider;
  identifier: string;
}

/** Get the curated source list shipped with the app — used to seed
 *  Settings → Job Sources on first launch. */
export async function getBuiltinSources(): Promise<SourceSpecDto[]> {
  return invoke<SourceSpecDto[]>("ingest_get_builtin_sources");
}

/** Run every enabled source in parallel — Greenhouse + Lever + Ashby
 *  + Y Combinator across the user's configured list. Single-click
 *  "Sync all jobs" path.
 *
 *  Reads enabled sources from the Zustand `ingestSources` slice;
 *  when that's empty the Rust side falls back to the curated builtin.
 *
 *  Optional `keyword`: free text. When provided, only jobs whose
 *  role / company / location have every token as a word-prefix
 *  survive the server-side narrow. */
export async function runIngestAll(
  keyword?: string,
): Promise<IngestRunAllSummary> {
  const store = useAppStore.getState();
  store.setIngestSyncing(true);
  // We model run-all as a single run with no `source` (= "all").
  const run = store.startIngestRun();

  const trimmedKeyword = keyword?.trim() || undefined;

  // Read user-enabled sources from the store. Each `IngestSource`
  // has an `enabled` flag the user toggles via Settings → Job Sources;
  // disabled ones are filtered out here so the user's preferences
  // actually take effect.
  const sources: SourceSpecDto[] = store.ingestSources
    .filter((s) => s.enabled)
    .map((s) => ({ provider: s.provider, identifier: s.identifier }));

  try {
    const result = await invoke<IngestRunAllResultDto>("ingest_run_all", {
      sources,
      keyword: trimmedKeyword,
    });
    const { newCount } = useAppStore.getState().setIngestedJobs(result.jobs);

    useAppStore.getState().finishIngestRun(run.id, {
      fetchedCount: result.jobs.length,
      newCount,
      errors: result.errors,
    });

    // Persist (best-effort) — failures here don't break the sync;
    // worst case the user has to re-sync after a reload.
    try {
      // Read the enriched, deduped jobs back from the store so we
      // save the avatar/seniority/sector/stage fields populated by
      // setIngestedJobs.
      const finalJobs = useAppStore.getState().jobs.filter((j) => !!j.source);
      const { saveIngestedJobsToDb, saveIngestSourceToDb } = await import(
        "./ingestDb"
      );
      await saveIngestedJobsToDb(finalJobs);

      // Stamp last_synced_at on each touched source — track which
      // ones returned errors and store those messages too.
      const errorBySource = new Map<string, string>();
      for (const e of result.errors) {
        const key = `${e.provider}:${e.identifier ?? ""}`;
        errorBySource.set(key, e.message);
      }
      const now = Date.now();
      const updatedSources = useAppStore
        .getState()
        .ingestSources.map((s) => {
          if (!s.enabled) return s;
          const key = `${s.provider}:${s.identifier ?? ""}`;
          const err = errorBySource.get(key);
          return err
            ? { ...s, lastSyncedAt: now, lastError: err }
            : { ...s, lastSyncedAt: now, lastError: undefined };
        });
      useAppStore.getState().hydrateIngestSources(updatedSources);
      for (const s of updatedSources) {
        await saveIngestSourceToDb(s);
      }
    } catch (persistErr) {
      console.warn("Failed to persist sync results to SQLite:", persistErr);
    }

    return {
      fetched: result.jobs.length,
      newCount,
      successfulSources: result.successfulSources,
      failedSources: result.failedSources,
      elapsedMs: result.elapsedMs,
      keyword: trimmedKeyword,
      errors: result.errors,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    useAppStore.getState().finishIngestRun(run.id, {
      fetchedCount: 0,
      newCount: 0,
      errors: [{ provider: "greenhouse", message }],
    });
    throw e;
  } finally {
    useAppStore.getState().setIngestSyncing(false);
  }
}

// ─── Persisting wrappers (Phase 6) ─────────────────────────────────
//
// The Settings UI and bookmark buttons call these instead of the raw
// Zustand actions so every change to durable state mirrors to SQLite.
// Failures are swallowed with a warn — store stays consistent in
// memory; worst case the user has to rebookmark / re-add after a crash.

export async function addIngestSourceWithPersist(input: {
  provider: IngestProvider;
  identifier: string;
  label?: string;
  /** Job Teaser only — passed through to IngestSource. */
  schoolDisplayName?: string;
}) {
  const source = useAppStore.getState().addIngestSource(input);
  try {
    await saveIngestSourceToDb(source);
  } catch (e) {
    console.warn("Failed to persist new ingest source to DB:", e);
  }
  return source;
}

export async function removeIngestSourceWithPersist(id: string): Promise<void> {
  useAppStore.getState().removeIngestSource(id);
  try {
    await deleteIngestSourceFromDb(id);
  } catch (e) {
    console.warn("Failed to delete ingest source from DB:", e);
  }
}

export async function toggleIngestSourceWithPersist(id: string): Promise<void> {
  useAppStore.getState().toggleIngestSource(id);
  const updated = useAppStore.getState().ingestSources.find((s) => s.id === id);
  if (!updated) return;
  try {
    await saveIngestSourceToDb(updated);
  } catch (e) {
    console.warn("Failed to persist source toggle to DB:", e);
  }
}

/** Toggle bookmark + mirror to DB. The Zustand action handles the
 *  in-memory side; this wrapper persists. */
export async function toggleBookmarkWithPersist(jobId: string): Promise<void> {
  const wasBookmarked = useAppStore.getState().bookmarkedJobIds.includes(jobId);
  useAppStore.getState().toggleBookmark(jobId);
  try {
    await setBookmarkInDb(jobId, !wasBookmarked);
  } catch (e) {
    console.warn("Failed to persist bookmark to DB:", e);
  }
}
