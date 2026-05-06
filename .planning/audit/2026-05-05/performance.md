# Career OS — Performance Audit (2026-05-05)

**Scope:** Cold start, interaction (typing/scrolling), memory growth.
**Build:** `pnpm build` → 788 KB raw / 231 KB gzip JS, 242 KB / 32 KB
gzip CSS, 2051 modules, single chunk (Vite warns >500 KB).
**Stack:** 16 Zustand slices under `persist`; ~5000 jobs in memory;
SQLite `ingested_job` table with JSON-blob `data` column.

## Priority summary

| #  | Finding | P  | Impact |
|----|---------|----|--------|
| 1  | Search re-walks 5000 jobs + re-tokenises every haystack on every keystroke | **P0** | Interaction |
| 2  | `JobDetail` selector returns a `find()` result → re-renders on every store mutation anywhere | **P0** | Interaction |
| 3  | `Workspace.tsx` reads 8 raw refs — entire War Room re-renders on any of them | **P0** | Interaction |
| 4  | `Pipeline.tsx` does `applications.find(...)` over 5000 jobs inside a `for` loop → O(N·M) | **P1** | Interaction |
| 5  | `db_load_ingested_jobs` returns ALL rows + double JSON decode, no LIMIT | **P1** | Cold start |
| 6  | `useSeedIngestSources` sequential awaits + 30 single-row IPC saves | **P1** | Cold start |
| 7  | Single 788 KB JS chunk — no code splitting | **P1** | Cold start |
| 8  | 116 distinct lucide icons across 85 files — fine today, monitor | P2 | Bundle |
| 9  | JT bridge `setInterval(navigation log, 500ms)` never cleared | P2 | JT WebView |
| 10 | JT bridge `fetch` + `XMLHttpRequest` global monkey-patch (XHR sniffer) | P2 | Memory |
| 11 | `CompanyAvatar` images: no `decoding="async"`, no preconnect | P2 | Scroll jank |
| 12 | Auto-sync fires from boot effect mid-paint of Jobs page | P2 | Cold start |
| 13 | 5000 jobs × ~12 KB jdText = ~40–75 MB resident | P2 | Memory |
| 14 | `questions.ts` 28 KB seed in main bundle | P2 | Bundle (forward) |
| 15 | 13 833 LOC of CSS across 19 files, all loaded on every route | P2 | Cold start |
| 16 | `Workspace.tsx` is 1537 LOC monolith, no memo boundaries | P2 | Interaction |

## P0 details

### 1. Search hot path
**File:** `JobList.tsx:85-155`
On each keystroke `jobs.filter(j => …)` walks 5000 jobs, builds a haystack
(7 fields joined → lowercase → split → filter), tokenises, then
prefix-checks. **~105k string ops + 5000 array allocations per keystroke**.
Estimate 30–80ms on M-class Mac.

**Fix:** at ingest time, derive `_searchTokens: string[]` once and cache
on the Job. Then `tokens.every(t => j._searchTokens.some(w => w.startsWith(t)))`.
Plus 120ms debounce on `AISearchBar.tsx:31`. **5–20× faster keystrokes.**

### 2. JobDetail selector
**File:** `JobDetail.tsx:37-40`
```ts
const selectedJob = useAppStore((s) => {
  const id = s.selectedJobId;
  return id ? s.jobs.find((j) => j.id === id) ?? null : null;
});
```
Scans 5000 jobs on every store update anywhere. `find()` returns a NEW
reference even when the underlying job didn't change → re-render cascade.
Mirrors the bug fixed in `CompanyModal.tsx`. No `useShallow` exists
anywhere in the codebase.

**Fix:** split selectorId out, or move to `Map<id, Job>` lookup.

### 3. Workspace 8-slice reads
**File:** `Workspace.tsx:119-131`
Reads 8 raw arrays (`jobs`, `applications`, `cvs`, …). After
`setIngestedJobs` the `jobs` reference changes → entire 1537-LOC War
Room re-renders even when `workspaceJobId` didn't change. Then
`jobs.find()` runs O(N).

**Fix:** derive in selector (small stable result) + bundle setters with
`useShallow`. Same pattern needed for `Pipeline.tsx:73-79`.

## P1 details

### 4. Pipeline O(N·M)
**File:** `Pipeline.tsx:101-103`
`for (const app of applications) { const job = jobs.find(j => j.id === app.jobId); }`
50 applications × 5000 jobs = 250k comparisons per render.

**Fix:** `useMemo(() => new Map(jobs.map(j => [j.id, j])), [jobs])`. ~250k → ~50.

### 5. SQLite load unbounded
**File:** `db/ingest.rs:88-102` + `lib/ingestDb.ts:61-64` + `useSeedIngestSources.ts:68-72`
Boot reads ALL ingested_job rows. 5000 × ~12KB JSON = ~60MB. Double JSON
decode (Rust → Value → IPC string → JS parse). 400–800ms blocking.

**Fix:** `LIMIT 500` + paged loading + drop double-decode (typed columns
or `Vec<JobRow>`) + chunked IPC (500-row batches).

### 6. Boot sequential awaits
**File:** `useSeedIngestSources.ts:42-100`
4 sequential awaits + a loop of 30 single-row `saveIngestSourceToDb`
IPC calls on first install.

**Fix:** `Promise.all` for the 3 reads + new `db_save_ingest_sources`
Rust command for the seed loop. ~150–300ms saved.

### 7. Single 788 KB JS chunk
**File:** `vite.config.ts:6-20`
No `manualChunks`, no `React.lazy`. All 7 dashboard pages + Copilot
bundled together.

**Fix:** `manualChunks` for vendor/dnd/cmdk/icons + `React.lazy` for
Workspace / Settings / Prep / CV / Copilot in `DashboardApp.tsx:39-56`.
Dashboard + Jobs is all that's needed for first paint. **First-paint
chunk: 788 KB → ~250 KB.**

## Quick-win priorities

If you only do 3:
1. **#1** Fix search hot path — biggest UX win
2. **#3** `useShallow` + `Map<id, Job>` in Workspace — eliminates dominant render source
3. **#5** Page the SQLite ingested-jobs load — biggest cold-start win

4th: **#2** fix JobDetail selector (pairs with #3).

## Pagination check — VERIFIED OK
`JobList.tsx:147-167` does `filter → sort → slice` in correct order.

## Methodology

- Bundle measured via `pnpm build` on current main HEAD
- No runtime profiling — latency numbers are static-analysis estimates
- Confidence HIGH for #1-5 (deterministic from code shape), MEDIUM for
  #6/#7/#11 (hardware/CDN dependent), LOW for #13 ceilings
