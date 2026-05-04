import { useEffect, useRef } from "react";
import { useAppStore } from "../store";
import { getBuiltinSources, runIngestAll } from "../lib/ingest";
import {
  loadBookmarksFromDb,
  loadIngestSourcesFromDb,
  loadIngestedJobsFromDb,
  saveIngestSourceToDb,
} from "../lib/ingestDb";

/** Auto-sync if the most-recent successful sync is older than this. */
const STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

/**
 * Boot-time hydration for the job-ingestion subsystem.
 *
 *   1. Try to load sources, cached jobs, and bookmarks from SQLite.
 *   2. If the sources table is empty (fresh install), fetch the
 *      curated `BUILTIN_SOURCES` list from Rust, write each row to
 *      DB, then hydrate the store with them.
 *   3. Always restore cached jobs + bookmarks if any exist — so a
 *      reload doesn't drop the user back to an empty Jobs page.
 *
 * Mounted once per dashboard window (see DashboardApp).
 */
export function useSeedIngestSources(): void {
  const ingestSources = useAppStore((s) => s.ingestSources);
  const seedIngestSources = useAppStore((s) => s.seedIngestSources);
  const hydrateIngestSources = useAppStore((s) => s.hydrateIngestSources);
  const setIngestedJobs = useAppStore((s) => s.setIngestedJobs);
  const hydrateBookmarks = useAppStore((s) => s.hydrateBookmarks);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ingestSources.length > 0) return;
    if (ranRef.current) return;
    ranRef.current = true;

    let cancelled = false;
    (async () => {
      try {
        // 1. Hydrate sources from DB if they exist.
        const dbSources = await loadIngestSourcesFromDb();
        if (cancelled) return;

        if (dbSources.length > 0) {
          hydrateIngestSources(dbSources);
        } else {
          // Fresh install — fetch the curated list, write each row to
          // DB, then hydrate the store.
          const builtin = await getBuiltinSources();
          if (cancelled) return;

          // Use seedIngestSources to mint ids + labels — then read the
          // resulting array to persist each. seedIngestSources is
          // idempotent so we don't double-seed.
          seedIngestSources(builtin);

          // Read back the freshly-seeded sources from the store and
          // mirror them to DB. Sequential writes are fine for ~30 rows.
          const justSeeded = useAppStore.getState().ingestSources;
          for (const s of justSeeded) {
            await saveIngestSourceToDb(s);
          }
        }

        // 2. Hydrate cached jobs (best-effort — empty on fresh install).
        const cachedJobs = await loadIngestedJobsFromDb();
        if (cancelled) return;
        if (cachedJobs.length > 0) {
          setIngestedJobs(cachedJobs);
        }

        // 3. Hydrate bookmarks LAST so they override the freshly-set
        // bookmarked=false on every cached job from setIngestedJobs.
        const bookmarkIds = await loadBookmarksFromDb();
        if (cancelled) return;
        if (bookmarkIds.length > 0) {
          hydrateBookmarks(bookmarkIds);
        }

        // 4. Auto-sync if the freshest source.lastSyncedAt is older
        // than STALE_THRESHOLD_MS — silent, fire-and-forget, runs in
        // the background while the user is already looking at the
        // hydrated cache. Skipped on the very first install (no
        // sources have been synced yet) so the user gets a fast
        // first paint with seed data + curated sources visible, then
        // chooses when to sync.
        const sources = useAppStore.getState().ingestSources;
        const freshestSync = sources
          .map((s) => s.lastSyncedAt ?? 0)
          .reduce((acc, t) => Math.max(acc, t), 0);
        const isStale =
          freshestSync > 0 && Date.now() - freshestSync > STALE_THRESHOLD_MS;
        if (isStale && !useAppStore.getState().ingestSyncing) {
          // Don't await — let it complete in the background.
          void runIngestAll().catch((err) => {
            console.warn("Auto-sync on launch failed:", err);
          });
        }
      } catch (e) {
        // Non-fatal — store stays empty, the user can still click
        // Sync to repopulate. Most likely cause: DB not yet
        // initialised (tauri::setup ordering hiccup) or a migration
        // failure that already surfaced elsewhere.
        console.warn("Failed to hydrate ingest state from SQLite:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
    // We intentionally depend only on `ingestSources.length` — once
    // hydrated we never re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingestSources.length]);
}
