// Frontend wrapper around the Phase 6 `db_*` Tauri commands for
// job-ingestion persistence. Pairs with `lib/ingest.ts` (which calls
// the live providers) — together they form the read/write seam
// between the Zustand store and SQLite.

import { invoke } from "@tauri-apps/api/core";
import type { IngestSource, Job } from "../store/types";

interface IngestSourceRowDto {
  id: string;
  provider: IngestSource["provider"];
  identifier: string;
  label: string;
  enabled: boolean;
  addedAt: number;
  lastSyncedAt?: number | null;
  lastError?: string | null;
}

interface IngestedJobRowDto {
  id: string;
  data: Job;
}

// ─── Sources ──────────────────────────────────────────────────────

export async function loadIngestSourcesFromDb(): Promise<IngestSource[]> {
  const rows = await invoke<IngestSourceRowDto[]>("db_load_ingest_sources");
  return rows.map((r) => ({
    id: r.id,
    provider: r.provider,
    identifier: r.identifier,
    label: r.label,
    enabled: r.enabled,
    addedAt: r.addedAt,
    lastSyncedAt: r.lastSyncedAt ?? undefined,
    lastError: r.lastError ?? undefined,
  }));
}

export async function saveIngestSourceToDb(source: IngestSource): Promise<void> {
  const dto: IngestSourceRowDto = {
    id: source.id,
    provider: source.provider,
    identifier: source.identifier,
    label: source.label,
    enabled: source.enabled,
    addedAt: source.addedAt,
    lastSyncedAt: source.lastSyncedAt ?? null,
    lastError: source.lastError ?? null,
  };
  await invoke<void>("db_upsert_ingest_source", { source: dto });
}

export async function deleteIngestSourceFromDb(id: string): Promise<void> {
  await invoke<void>("db_delete_ingest_source", { id });
}

// ─── Jobs ──────────────────────────────────────────────────────────

export async function loadIngestedJobsFromDb(): Promise<Job[]> {
  const rows = await invoke<IngestedJobRowDto[]>("db_load_ingested_jobs");
  return rows.map((r) => r.data);
}

/** Bulk upsert. Each Job's `source` triple becomes the dedup key in
 *  SQLite. Bookmarked status survives because the bookmarks table is
 *  separate from `ingested_job`. */
export async function saveIngestedJobsToDb(jobs: Job[]): Promise<number> {
  const dtos: IngestedJobRowDto[] = jobs.map((j) => ({ id: j.id, data: j }));
  return invoke<number>("db_save_ingested_jobs", { jobs: dtos });
}

// ─── Bookmarks ────────────────────────────────────────────────────

export async function loadBookmarksFromDb(): Promise<string[]> {
  return invoke<string[]>("db_load_bookmarks");
}

export async function setBookmarkInDb(
  jobId: string,
  bookmarked: boolean,
): Promise<void> {
  await invoke<void>("db_set_bookmark", { jobId, bookmarked });
}
