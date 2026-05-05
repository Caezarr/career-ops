# Sprint — Job Teaser SSO Ingestion

**Date opened:** 2026-05-04
**Branch:** `feat/job-teaser-sso`
**Estimated duration:** 4-5 focused days
**Goal:** A user with an HEC / ESSEC / ESCP / Sciences Po / EM Lyon (or any Job-Teaser-using school) account can sign in once and see their school's exclusive job feed merged into Career OS's main Jobs page — same UI, same filters, same Sync flow as the public ATS providers.

---

## Why this sprint matters

Job Teaser is the platform 90% of French Grandes Écoles use to host their *school-network* job feeds. These postings are usually *better than the public market*:
- Direct from alumni / partner companies
- Pre-vetted ("looking for HEC profiles specifically")
- Often unposted on LinkedIn / Welcome to the Jungle

No public aggregator surfaces them — they're behind SSO. Career OS that pulls them = the only Mac app that gives a French student their *full* job universe in one place.

This is the **vendor-grade differentiator** the user explicitly flagged.

---

## 1. Out of scope

- ❌ Stealing / mass-redistributing the data — strictly per-user, stored locally, never aggregated server-side (we don't have a server)
- ❌ Bypassing 2FA / MFA — if the school requires it, we honor it inside the WebView
- ❌ Auto-applying via the platform — read-only ingestion only
- ❌ Schools that DON'T use Job Teaser (LinkedIn campus pages, school-built portals) — separate sprint

---

## 2. Architecture

```
┌─ React (settings) ──────────────────────────────┐
│  Settings → Job Sources → "+ Add school"         │
│       │                                          │
│       └─► IPC: open WebView at <school>.jobteaser.com
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│  Tauri Window (transparent: false, decorated)    │
│  ─ Loads school SSO landing                       │
│  ─ User completes SSO (school's IdP)             │
│  ─ JS bridge polls document.cookie               │
│  ─ When session cookies present → emit auth_ok   │
│  ─ User clicks "Done" or auto-close              │
└────────────────┬────────────────────────────────┘
                 │ tauri::invoke
┌────────────────▼────────────────────────────────┐
│  Rust (src-tauri/src/ingest/jobteaser/)          │
│  ├ auth.rs    — cookie capture + Keychain store  │
│  ├ scrape.rs  — authenticated fetch + parse      │
│  └ schools.rs — known school subdomain list       │
│       │                                          │
│       └──► cloud::Client (single-egress)         │
└─────────────────────────────────────────────────┘
```

**Hard rules:**
- Cookies live in Keychain, NEVER in SQLite (PRIV-05)
- `cloud::Client` (PRIV-01) — every authenticated fetch routes through it
- The Tauri auth window is transient — opened on demand, never minimised, never persistent

---

## 3. Auth flow

1. User clicks "Add school" in Settings → picks school from dropdown (HEC / ESSEC / ...) → school's `subdomain` resolved
2. Career OS opens a Tauri window pointed at `https://<subdomain>.jobteaser.com/login` (or the school's redirect-to-IdP URL)
3. User completes whatever auth their school uses (Google SSO, Microsoft, Shibboleth, ...)
4. Once redirected back to Job Teaser, our injected JS bridge:
   - Reads `document.cookie` for the session token (`_jobteaser_session`, `csrf-token`, `XSRF-TOKEN`)
   - Reads the user profile via the page's embedded `__NEXT_DATA__` or by fetching `/api/me`
   - Posts back to Rust via `window.__TAURI__.invoke('jobteaser_auth_complete', { cookies, profile })`
5. Rust stores cookies in Keychain under key `career-os.jobteaser.<subdomain>.session`
6. Window closes. Settings → Job Sources now shows "HEC Career Center · Job Teaser · 142 jobs" with toggle + last-synced + remove.

**Token refresh:** Job Teaser sessions are typically 30-day. When a fetch returns 401, we mark the source as `lastError: "Re-authentication required"` — user clicks the row, the auth window reopens.

---

## 4. Scraping

After auth, we hit:
- `https://<subdomain>.jobteaser.com/api/v1/jobs` (or the actual paginated endpoint we discover during exploration)
- Pages 1..N until empty or page-cap (50 jobs/page typical)
- Each posting is mapped to `RawJob`:
  - `source_id` ← Job Teaser's job ID
  - `source_url` ← canonical apply URL
  - `role`, `company`, `location` ← straightforward
  - `description` ← HTML body, stripped via `normalize::strip_html` (already handles paragraph preservation)
  - `salary_*` ← if present (rare on Job Teaser, but possible)
  - `posted_at` ← ISO-formatted

**Provider value in the existing `IngestProvider` enum:** `JobTeaser` (Rust) / `"jobteaser"` (TS).

---

## 5. Data model additions

```rust
// src-tauri/src/ingest/traits.rs
pub enum IngestProvider {
    Greenhouse,
    Lever,
    Ashby,
    YCombinator,
    JobTeaser,   // ← new
}
```

```ts
// store/types.ts
export type IngestProvider =
  | "greenhouse" | "lever" | "ashby" | "ycombinator" | "jobteaser";

export interface IngestSource {
  // existing fields...
  /** For jobteaser only: school subdomain (e.g. "hec", "essec"). */
  subdomain?: string;
  /** For jobteaser only: display name from the user's profile. */
  schoolDisplayName?: string;
}
```

---

## 6. Schools to ship at v1

Curated list — the ones with the strongest French Grandes Écoles networks:

| School | Subdomain | Auth method (TBD during exploration) |
|---|---|---|
| HEC Paris | `hec` | Google Workspace SSO |
| ESSEC | `essec` | Microsoft 365 SSO |
| ESCP Business School | `escp` | ? |
| Sciences Po | `sciencespo` | Shibboleth |
| EM Lyon | `emlyon` | Microsoft 365 SSO |
| EDHEC | `edhec` | ? |
| Polytechnique | `polytechnique` | Shibboleth (nucleus) |
| ENSAE | `ensae` | ? |
| INSEAD | `insead` | ? (may not use Job Teaser, verify) |
| Centrale Supélec | `centralesupelec` | ? |

**Day-1 stretch:** if more than 6 of these resolve cleanly during exploration, ship all 10. Otherwise ship the verified ones and add a "School not listed?" form that asks the user for the subdomain.

---

## 7. Micro-sprints (atomic tickets)

> Each micro-sprint = 2-4 h, ships as one PR with title `[JT-NN] <title>`.
> The day-by-day breakdown below groups them into a calendar view.

### JT-01 · Manual exploration: HEC + ESSEC + ESCP endpoint shapes
**Est:** 4h · **Deps:** — · **PR-able:** ❌ (recon only)
**Goal:** Lock the spec by verifying real cookie names + endpoint URLs against ≥3 schools.
**Tasks:**
- Open Safari DevTools, log into HEC's Job Teaser as Gabriel
- Capture .har → save at `.planning/research/jobteaser-har/hec.har` (gitignored, local only)
- Document in §3 of this doc: real session cookie names, the `/api/...` endpoint that lists jobs, pagination pattern
- Repeat for ESSEC + ESCP (or 2 schools accessible via friends)
**Acceptance:** §3 + §4 of this doc updated with concrete URLs + cookie names; ≥1 working .har capture per tested school exists locally
**Output:** spec updates only, no code commit.

### JT-02 · Add `IngestProvider::JobTeaser` enum variant + frontend type
**Est:** 1h · **Deps:** JT-01 · **PR-able:** ✅
**Goal:** Extend the existing `IngestProvider` taxonomy without breaking other providers.
**Tasks:**
- `src-tauri/src/ingest/traits.rs`: add `JobTeaser` to enum + `as_str` / `from_str` arms
- `src/dashboard/store/types.ts`: extend the `IngestProvider` union
- Update `mod.rs::run_source` match — for now return `Err(NotImplemented)` for the new variant
- `cargo check` + `pnpm exec tsc -b` clean
**Acceptance:** TS + Rust compile; `IngestProvider::JobTeaser` recognised everywhere it appears.
**Output:** 1 commit, ~30 lines diff.

### JT-03 · `IngestSource.subdomain` + `schoolDisplayName` fields
**Est:** 1h · **Deps:** JT-02 · **PR-able:** ✅
**Goal:** Make `IngestSource` carry the JT-specific fields without breaking the existing curated providers.
**Tasks:**
- `types.ts`: add optional `subdomain?: string` and `schoolDisplayName?: string`
- Document in the type comment: only set when `provider === 'jobteaser'`
- `addIngestSource` action accepts the new fields
- Update SQLite migration `0002_job_ingestion.sql` schema OR add `0003` migration adding the columns to `ingest_source`
**Acceptance:** Existing sources still work; new fields nullable; migration runs clean on a fresh DB.
**Output:** 1 commit, frontend + Rust + migration.

### JT-04 · Tauri command to open auth WebViewWindow
**Est:** 3h · **Deps:** JT-03 · **PR-able:** ✅
**Goal:** Open a transient WebView pointing at the school's SSO landing.
**Tasks:**
- `tauri.conf.json`: declare a `jobteaser-auth` window, hidden by default, decorations on (user needs OS chrome to navigate IdP UIs)
- `src-tauri/src/ingest/jobteaser/mod.rs` (new module) + `auth.rs` stub
- New Tauri command `jobteaser_auth_open(subdomain: String)` — shows the window, navigates to `https://<sub>.jobteaser.com/login`
- Register in `invoke_handler!`
**Acceptance:** Calling `invoke('jobteaser_auth_open', { subdomain: 'hec' })` from the frontend pops the SSO page in a new window.
**Output:** 1 commit; window opens but does not yet capture cookies.

### JT-05 · JS bridge: poll `document.cookie` + emit `auth-cookies-found`
**Est:** 3h · **Deps:** JT-04 · **PR-able:** ✅
**Goal:** Detect when the user has finished SSO + extract the session token.
**Tasks:**
- Use the window's `initialization_script` to inject a small JS poller (every 500ms) that checks for the JT-01-confirmed cookie name(s)
- When found, call `window.__TAURI__.event.emit('auth-cookies-found', { cookies, profile })` — also fetch `/api/me` from inside the page to grab the user's display name
- Add a tiny "Detecting…" overlay at the top of the auth window so the user knows the app is watching
**Acceptance:** Manual test: log into HEC → within 1s after redirect, the event fires in the Rust listener with the right cookie + profile.
**Output:** 1 commit; cookies surfaced, not yet stored.

### JT-06 · Rust handler: store cookies in Keychain via `keyring`
**Est:** 2h · **Deps:** JT-05 · **PR-able:** ✅
**Goal:** Persist session cookies securely + insert the source row.
**Tasks:**
- Listen for `auth-cookies-found` in the Rust runtime
- Serialize the cookie set as JSON, store under Keychain key `career-os.jobteaser.<sub>.session`
- Call `addIngestSource` with provider=jobteaser, subdomain, schoolDisplayName from profile
- Save to SQLite via the existing `db_upsert_ingest_source`
- Close the auth window via `WebviewWindow::close()`
**Acceptance:** After SSO completes, source row appears in Settings → Job Sources; `security find-generic-password -s "career-os.jobteaser.hec.session"` shows the saved cookie.
**Output:** 1 commit; full auth roundtrip works for ≥1 school.

### JT-07 · `scrape.rs::fetch(subdomain)` — paginated authenticated GET
**Est:** 4h · **Deps:** JT-06 · **PR-able:** ✅
**Goal:** Pull the actual job feed using the stored cookies.
**Tasks:**
- Read cookies from Keychain at fetch time
- Build the `reqwest::Client` with a cookie store seeded from the saved session
- Walk the paginated endpoint until empty (cap 50 pages = 2500 jobs max)
- Map each posting → `RawJob` (reuse the existing struct from `traits.rs`)
- 401/403 → return a structured `IngestError::Unauthorised` so the caller can trigger re-auth
- Use `cloud::Client` if PRIV-01 has shipped, else match the existing pattern (TODO in code)
**Acceptance:** `cargo test --ignored jobteaser_fetch_one_page` runs against a real session, returns ≥1 RawJob.
**Output:** 1 commit; tests gated behind `--ignored` (need real auth).

### JT-08 · Wire `IngestProvider::JobTeaser` branch in `mod.rs::run_source`
**Est:** 2h · **Deps:** JT-07 · **PR-able:** ✅
**Goal:** Make Job Teaser pulls participate in the unified ingest pipeline.
**Tasks:**
- `mod.rs::run_source` JobTeaser arm calls `jobteaser::scrape::fetch(identifier)` (identifier = subdomain)
- Backfill `company` field on RawJob: companies on Job Teaser are heterogeneous, so use the actual company per-posting (not the school name)
- "Sync all jobs" auto-includes any enabled JT sources; per-source error handling already covers JT failures
**Acceptance:** Click Sync All on Jobs page → JT jobs flow in alongside Greenhouse/Lever/Ashby/YC; bookmarks survive re-sync via existing dedup.
**Output:** 1 commit; first end-to-end flow.

### JT-09 · Settings → "+ Add school" picker (10 schools curated)
**Est:** 3h · **Deps:** JT-04 · **PR-able:** ✅
**Goal:** UI for picking a school + opening the auth flow.
**Tasks:**
- New section in `JobSourcesCard.tsx`: above the existing "Add a custom slug" row, show a "+ Add school" button with school picker
- Picker = dropdown of 10 (HEC, ESSEC, ESCP, Sciences Po, EM Lyon, EDHEC, Polytechnique, ENSAE, INSEAD, CentraleSupélec) + "Other"
- Click → calls `jobteaser_auth_open` with the subdomain
- Toast: "Sign in to <School> in the new window"
**Acceptance:** Visual: button + picker rendered, clicking opens auth window; users can identify which school they're adding.
**Output:** 1 commit; UI-only diff.

### JT-10 · Per-source re-auth flow (401 → reopen WebView)
**Est:** 2h · **Deps:** JT-08 + JT-09 · **PR-able:** ✅
**Goal:** When a session expires, surface a clear path back to working state.
**Tasks:**
- When `scrape::fetch` returns `IngestError::Unauthorised`, set `lastError: "Re-authentication required"` on the source row
- `JobSourcesCard` source row: if `lastError` matches that string, render a "🔄 Re-authenticate" button instead of just the error
- Clicking re-runs `jobteaser_auth_open(subdomain)` → JT-05/06 do their thing again, refreshing the cookies in place
**Acceptance:** Manually delete the JT cookie via Keychain Access → Sync → row turns red with the button → click → SSO opens, completes, row goes green.
**Output:** 1 commit.

### JT-11 · "School not listed?" custom subdomain input
**Est:** 1h · **Deps:** JT-09 · **PR-able:** ✅
**Goal:** Cover the long tail of Job-Teaser-using schools.
**Tasks:**
- "Other" choice in the school picker reveals a free-text subdomain input + "Validate" button
- "Validate" → opens auth window for `https://<input>.jobteaser.com/login`. If the page 404s, show a clear error.
- A successful auth → uses the input as the subdomain and "User-supplied" as the school display name (Profile-fetch on success will overwrite)
**Acceptance:** A Job-Teaser-using school not in the curated 10 can still be added.
**Output:** 1 commit.

### JT-12 · Smoke test + README + sprint exit
**Est:** 3h · **Deps:** all above · **PR-able:** ✅
**Goal:** Sprint exit gate.
**Tasks:**
- `cargo test --ignored jobteaser_smoke` — uses a `JT_SESSION_COOKIE` env var to validate parser against a real response
- README → "Job Teaser" section explaining auth flow + privacy posture
- Commit `.planning/research/PITFALLS.md` update with anything learned during JT-01 (cookie names, school redirects, etc.)
- Final manual run-through of all acceptance criteria (§9 above)
**Acceptance:** All criteria in §9 met. PR #X opened with the demo recording attached.
**Output:** Sprint closed.

---

## 8. Day-by-day breakdown

### Day 1 — Exploration + spec lock

- [ ] **T1.1** — Manually log into 2-3 schools (the user's HEC + 1-2 friends if accessible) to identify:
  - Real subdomains (some schools use `<school>-careers.jobteaser.com` instead of `<school>.jobteaser.com`)
  - The actual session cookie names
  - The job listing API endpoint shape (paginated? SSR-rendered? GraphQL?)
- [ ] **T1.2** — Document findings in this file (update §3 §4 with concrete endpoints / cookie names)
- [ ] **T1.3** — Draft the IngestProvider enum extension + RawJob mapping for Job Teaser

**Done = `auth.rs` and `scrape.rs` have stub implementations with the verified endpoints; we know exactly what we're building.**

### Day 2 — Auth window + cookie capture

- [ ] **T2.1** — Add a `jobteaser_auth_window` Tauri command that opens a `WebviewWindow` pointed at `https://<sub>.jobteaser.com/login`
- [ ] **T2.2** — Inject a JS bridge via `initialization_script` that polls `document.cookie` every 500ms and emits `auth-cookies-found` once the session token is present
- [ ] **T2.3** — Rust handler stores cookies in Keychain via the existing `keyring` crate
- [ ] **T2.4** — On success: close the auth window + insert an `IngestSource` (provider=jobteaser, identifier=`<subdomain>`, label="<School> · Job Teaser") into the store

**Done = user clicks "Add HEC", auth window opens, user logs in, window auto-closes, Settings shows HEC as a configured source.**

### Day 3 — Authenticated fetch + ingest pipeline

- [ ] **T3.1** — `scrape.rs::fetch(subdomain)` — reads cookies from Keychain, hits the discovered job endpoint (paginated), maps to `RawJob`
- [ ] **T3.2** — Wire the `IngestProvider::JobTeaser` branch in `mod.rs::run_source`
- [ ] **T3.3** — Update `BUILTIN_SOURCES` to NOT include Job Teaser (it's user-driven, not curated)
- [ ] **T3.4** — Update `Settings → Job Sources` UI to show the "+ Add school" CTA separately from the curated source list, and disable the slug input when provider=jobteaser (subdomain comes from the auth flow)

**Done = click Sync All, HEC jobs appear in the Jobs list with the "JT" badge.**

### Day 4 — UX polish + re-auth flow + custom school input

- [ ] **T4.1** — Source row UI: when `lastError === "Re-authentication required"`, show a "Re-authenticate" button that reopens the auth window
- [ ] **T4.2** — School picker UI: dropdown of curated 10 + "School not listed?" → free input for subdomain
- [ ] **T4.3** — Source label: derive from the user's profile fetched after auth (`"Gabriel Ranucci · HEC Paris"` instead of just `"hec"`)
- [ ] **T4.4** — Privacy notice in the auth window banner: "Career OS captures your Job Teaser session locally to fetch your school's job feed. Cookies stay in macOS Keychain — never sent to any server."

**Done = polished, indistinguishable from the curated providers in the UI.**

### Day 5 — Reliability + buffer

- [ ] **T5.1** — Cookie expiry detection: if a fetch returns 401/403, surface the re-auth flow automatically
- [ ] **T5.2** — Logging: tracing spans on every Job Teaser fetch with subdomain + status code (PII-stripped — no cookies in logs)
- [ ] **T5.3** — Smoke test: `cargo test --ignored jobteaser_smoke` that requires a `JT_SESSION_COOKIE` env var and validates the parser against a real response. Documented in CONTRIBUTING.md.
- [ ] **T5.4** — README → "Job Teaser" section explaining the auth flow + privacy model
- [ ] **T5.5** — Buffer / debug

**Done = a full HEC sync runs end-to-end, persists to SQLite, surfaces in the Jobs page mixed with the public ATS jobs.**

---

## 9. Risks + mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **Job Teaser ToS prohibits scraping** | 🔴 High | We're not scraping the public site — we authenticate AS the user, with their explicit consent, in a transient WebView. The cookies + data stay on-device. Document this clearly in the privacy notice and README. If the ToS is explicit-prohibition-of-automation, surface a one-time confirmation dialog. |
| **Endpoint format changes** | 🟡 Med | The smoke test catches it on next release. Per-source error handling in the run loop ensures one broken school doesn't break the others. |
| **2FA / MFA flows confuse the WebView** | 🟡 Med | Use a real Tauri WebviewWindow (not headless) — anything a user can do in Safari, the WebView can do, including 2FA push approvals. |
| **Schools using non-Job-Teaser portals** | 🟡 Med | Out of scope this sprint — separate per-school adapters later. The "School not listed?" form gives the user a path. |
| **Cookie storage in Keychain leaks under macOS user permissions** | 🟢 Low | The `keyring` crate uses the macOS Keychain Services API — same security boundary as Safari's saved cookies. |
| **User uses a shared / school-owned Mac** | 🟢 Low | Cookies are per-user-account in Keychain. A different macOS user account = no access. We can't protect against the user explicitly handing over their Mac. |

---

## 10. Acceptance criteria

- [ ] In Settings → Job Sources, click "+ Add school" → pick HEC → SSO window opens
- [ ] Complete SSO in the window → window auto-closes within 1s of cookie capture
- [ ] Settings now shows "HEC Paris · Job Teaser · X jobs" with green check
- [ ] Click "Sync all jobs" on the Jobs page → HEC jobs appear in the list with "JT" badge
- [ ] Bookmark a HEC job → quit → relaunch → bookmark persisted, job still in the list (from SQLite cache)
- [ ] Manually delete the cookie via Keychain Access → Sync → source row turns red with "Re-authentication required" + button to reopen auth
- [ ] Click "Re-authenticate" → SSO window reopens → re-auth → source goes back to green
- [ ] Cookies confirmed to be in Keychain (`security find-generic-password -s "career-os.jobteaser.hec.session"`) and NOT in `~/Library/Application Support/com.caezarr.career-os/career-os.db`

---

## 11. Privacy posture

- ✅ Cookies in Keychain only — never in SQLite, never bundled, never logged
- ✅ Session-stored locally per user-Mac-account — no cloud sync
- ✅ Single-egress: every auth-bound HTTP call goes through `cloud::Client` (depends on PRIV-01 sprint completing first — if it hasn't, we add a TODO and match the existing ad-hoc pattern)
- ✅ No telemetry on which schools the user uses — the school list is a static curated array, no usage events
- ✅ Privacy notice on the auth window banner explaining what we capture and where it goes

---

## 12. Workflow

- **Branch:** `feat/job-teaser-sso`, off latest main
- **Commits:** one per task T*, atomic
- **PR:** opened in draft on Day 1
- **Tests:** smoke test on Day 5 (`cargo test --ignored jobteaser_smoke`)
- **Review:** ask for live test on Day 5 with the user's real HEC account before marking sprint complete
