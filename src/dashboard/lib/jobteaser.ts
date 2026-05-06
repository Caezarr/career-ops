// Frontend wrapper around the JT auth Tauri commands.
//
// Flow:
//   1. UI calls `openJobTeaserAuth()` — pops a Tauri WebViewWindow at
//      `https://www.jobteaser.com/fr/users/sign_in`.
//   2. Inside the window, the bridge script (`auth_bridge.js` in
//      `src-tauri/src/ingest/jobteaser/`) polls cookies + fetches the
//      user's profile.
//   3. When both are captured, the bridge invokes the Tauri command
//      `jobteaser_auth_complete` directly. Rust persists to Keychain
//      and closes the window.
//   4. Back in the dashboard window we listen for the
//      `jobteaser-auth-complete` Tauri event to know when to refresh
//      the Settings UI + insert the IngestSource row.

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useAppStore } from "../store";
import type { Job } from "../store/types";
import { addIngestSourceWithPersist } from "./ingest";
import { saveIngestedJobsToDb } from "./ingestDb";

interface JobTeaserAuthProfile {
  careerCenterSlug: string;
  careerCenterName?: string | null;
  userFullName?: string | null;
}

/** Open the auth window. Returns when the window has been spawned —
 *  not when the user has finished authing (that's an event). */
export async function openJobTeaserAuth(): Promise<void> {
  await invoke<void>("jobteaser_auth_open");
}

/** Subscribe once for the lifetime of the dashboard window so that
 *  any successful JT auth (regardless of which UI triggered it) will
 *  insert the source row + persist. Called from a top-level applier
 *  hook, not from individual components. */
export async function subscribeJobTeaserAuth(): Promise<() => void> {
  const unlistenAuth = await listen<{ profile: JobTeaserAuthProfile }>(
    "jobteaser-auth-complete",
    async (evt) => {
      const profile = evt.payload.profile;
      if (!profile?.careerCenterSlug) return;

      // Don't add a duplicate if we already have an IngestSource for
      // this (provider, slug) — re-auth refreshes cookies in place.
      const existing = useAppStore
        .getState()
        .ingestSources.find(
          (s) =>
            s.provider === "jobteaser" &&
            s.identifier === profile.careerCenterSlug,
        );
      if (existing) {
        useAppStore
          .getState()
          .setIngestSourceState(existing.id, { lastError: undefined });
        return;
      }

      await addIngestSourceWithPersist({
        provider: "jobteaser",
        identifier: profile.careerCenterSlug,
        label: profile.careerCenterName
          ? `${profile.careerCenterName} · Job Teaser`
          : `${profile.careerCenterSlug} · Job Teaser`,
        schoolDisplayName: profile.careerCenterName ?? undefined,
      });
    },
  );

  // The bridge scrapes /fr/job-offers right after auth and forwards
  // a pre-mapped batch via this event. Merge into the jobs slice
  // (existing dedup logic preserves bookmarks) and persist.
  const unlistenJobs = await listen<{ slug: string; jobs: Job[] }>(
    "jobteaser-jobs-received",
    async (evt) => {
      const { slug, jobs } = evt.payload;
      if (!Array.isArray(jobs) || jobs.length === 0) return;

      const result = useAppStore.getState().setIngestedJobs(jobs);
      console.info(
        `[jobteaser] received ${jobs.length} jobs for slug=${slug} → ${result.newCount} new`,
      );

      try {
        const enriched = useAppStore.getState().jobs.filter(
          (j) =>
            j.source?.provider === "jobteaser" &&
            j.source?.identifier === slug,
        );
        await saveIngestedJobsToDb(enriched);
      } catch (e) {
        console.warn("[jobteaser] failed to persist scraped jobs to SQLite:", e);
      }

      // Stamp last_synced_at on the matching IngestSource.
      const src = useAppStore
        .getState()
        .ingestSources.find(
          (s) => s.provider === "jobteaser" && s.identifier === slug,
        );
      if (src) {
        useAppStore.getState().setIngestSourceState(src.id, {
          lastSyncedAt: Date.now(),
          lastError: undefined,
        });
      }
    },
  );

  return () => {
    unlistenAuth();
    unlistenJobs();
  };
}

/** Cheap check used by the Settings UI to decide whether to render
 *  "Re-authenticate" instead of "Sign in" when an existing JT source
 *  has flagged a 401. */
export async function jobTeaserHasSession(slug: string): Promise<boolean> {
  return invoke<boolean>("jobteaser_has_session", {
    careerCenterSlug: slug,
  });
}
