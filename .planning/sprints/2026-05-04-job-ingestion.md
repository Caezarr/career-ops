# Sprint — Job Ingestion (YC + Greenhouse + Lever + Ashby)

**Date opened:** 2026-05-04
**Branch:** `feat/job-ingestion`
**Estimated duration:** 5–6 focused days
**Goal:** the Jobs page no longer shows mock seed data — it shows real, fresh listings the user has chosen to pull, deduped, with their source visible and a "Sync now" button.
**Out of scope (next sprint):** Job Teaser SSO ingestion.

---

## 1. Sources

| Provider | Endpoint | Auth | Difficulty | Identifier user provides |
|---|---|---|---|---|
| **Greenhouse** | `https://boards-api.greenhouse.io/v1/boards/<board>/jobs?content=true` | none | 🟢 easy | board slug (`anthropic`, `stripe`, `figma`) |
| **Lever** | `https://api.lever.co/v0/postings/<company>?mode=json` | none | 🟢 easy | company slug (`anthropic`, `replit`) |
| **Ashby** | `https://api.ashbyhq.com/posting-api/job-board/<org>?includeCompensation=true` | none | 🟡 medium | org slug (`Notion`, `Linear`) |
| **Y Combinator / WaaS** | `https://www.workatastartup.com/jobs` (Next.js `__NEXT_DATA__`) — fallback to GraphQL `/graphql` | none | 🟡 medium | none — flat feed, optional batch filter |

**Sanity check before each provider:** run a live `curl` to verify the endpoint shape hasn't changed.

---

## 2. Architecture

```
┌─ React (frontend) ──────────────────────┐
│  Settings/JobSources                     │   add/remove/toggle
│  Jobs page (existing)                    │   "Sync now" + source badges
│       │                                  │
│       └──► useIngestStore (Zustand)      │
└────────────────┬────────────────────────┘
                 │ tauri::invoke
┌────────────────▼────────────────────────┐
│  Rust (src-tauri/src/ingest/)            │
│  ├ traits.rs    — IngestSource trait     │
│  ├ greenhouse.rs                         │
│  ├ lever.rs                              │
│  ├ ashby.rs                              │
│  ├ ycombinator.rs                        │
│  ├ normalize.rs — RawJob → Job           │
│  └ store.rs    — SQLite persistence      │
│       │                                  │
│       └──► cloud::Client (single-egress) │
└─────────────────────────────────────────┘
```

**Hard rule:** every outbound call goes through `cloud::Client`. No `reqwest::Client::new()` direct in `ingest/*`.

---

## 3. Data model — additions

```ts
// store/types.ts
export type IngestProvider = "greenhouse" | "lever" | "ashby" | "ycombinator";

export interface IngestSource {
  id: string;
  provider: IngestProvider;
  identifier: string;        // board/company slug — empty for YC
  label: string;             // user-facing
  enabled: boolean;
  addedAt: number;
  lastSyncedAt?: number;
  lastError?: string;
}

export interface IngestRun {
  id: string;
  startedAt: number;
  finishedAt?: number;
  source?: IngestProvider;   // empty for "all"
  fetchedCount: number;
  newCount: number;
  errors: { provider: IngestProvider; identifier?: string; message: string }[];
}

export interface Job {
  // existing fields...
  source?: {
    provider: IngestProvider;
    identifier?: string;
    sourceId: string;
    sourceUrl: string;
    fetchedAt: number;
  };
}
```

**Dedup key:** `${provider}:${identifier}:${sourceId}` — same job re-pulled keeps its local ID and overwrites mutable fields. Never overwrites `bookmarked`.

---

## 4. Execution order (validate-then-continue)

> Per user instruction: ship the easy ones first end-to-end, validate live with real data, then move to the harder ones.

1. **Foundation** — types, slice, Rust skeleton (no UI yet)
2. **Greenhouse** end-to-end → **validation gate**
3. **Lever** end-to-end → **validation gate**
4. **Ashby** end-to-end → **validation gate**
5. **YC** end-to-end → **validation gate**
6. **Settings UI** — full add/remove/toggle source manager
7. **Persistence** — SQLite for sources + jobs, auto-sync on launch, dedup, per-source error UI
8. **Polish** — curated boards autocomplete, rate limit, smoke tests, README section

Each step ends with a commit and a manual live test on a known good board.

---

## 5. Risks + mitigations

| Risk | Mitigation |
|---|---|
| YC endpoint format changes | `cargo test --ignored ingest_yc_smoke` runnable at each release |
| Ashby format changes | Same smoke test pattern |
| Greenhouse boards without `?content=true` | Fallback without flag, then per-job detail fetch (cap 10) |
| Long descriptions break UI | `normalize.rs` truncates at 2000 chars + flags |
| User enters bad slug | `ingest_health_check(provider, identifier)` validates BEFORE saving in Settings |
| Multiple sources, one fails | Per-source try/catch — never break the whole sync |

---

## 6. Acceptance criteria — sprint exit

- [ ] Add Greenhouse=`anthropic`, Lever=`replit`, Ashby=`notion`, YC=`enabled` from Settings
- [ ] Click "Sync now" → ≥80 fresh jobs in <5s
- [ ] Each JobCard shows its source badge
- [ ] Bookmark a job → quit → relaunch → bookmark persisted
- [ ] Wifi off → "Sync" → clean error UI, no crash
- [ ] Atomic commits per task on `feat/job-ingestion`, draft PR opened Day 1

---

## 7. Decisions

- **Branched from:** `chore/rebrand-career-os` (so all code uses career-ops naming from commit 1)
- **YC scrape approach:** start Plan B (HTML `__NEXT_DATA__`); fall back to Plan A (GraphQL) if format unstable
- **Persistence:** SQLite via existing `db` module, new tables `ingest_sources` + extended `jobs`
- **Spec lives at:** this file. Updated as decisions land.
