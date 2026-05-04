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

## 7. Day-by-day breakdown

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

## 8. Risks + mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **Job Teaser ToS prohibits scraping** | 🔴 High | We're not scraping the public site — we authenticate AS the user, with their explicit consent, in a transient WebView. The cookies + data stay on-device. Document this clearly in the privacy notice and README. If the ToS is explicit-prohibition-of-automation, surface a one-time confirmation dialog. |
| **Endpoint format changes** | 🟡 Med | The smoke test catches it on next release. Per-source error handling in the run loop ensures one broken school doesn't break the others. |
| **2FA / MFA flows confuse the WebView** | 🟡 Med | Use a real Tauri WebviewWindow (not headless) — anything a user can do in Safari, the WebView can do, including 2FA push approvals. |
| **Schools using non-Job-Teaser portals** | 🟡 Med | Out of scope this sprint — separate per-school adapters later. The "School not listed?" form gives the user a path. |
| **Cookie storage in Keychain leaks under macOS user permissions** | 🟢 Low | The `keyring` crate uses the macOS Keychain Services API — same security boundary as Safari's saved cookies. |
| **User uses a shared / school-owned Mac** | 🟢 Low | Cookies are per-user-account in Keychain. A different macOS user account = no access. We can't protect against the user explicitly handing over their Mac. |

---

## 9. Acceptance criteria

- [ ] In Settings → Job Sources, click "+ Add school" → pick HEC → SSO window opens
- [ ] Complete SSO in the window → window auto-closes within 1s of cookie capture
- [ ] Settings now shows "HEC Paris · Job Teaser · X jobs" with green check
- [ ] Click "Sync all jobs" on the Jobs page → HEC jobs appear in the list with "JT" badge
- [ ] Bookmark a HEC job → quit → relaunch → bookmark persisted, job still in the list (from SQLite cache)
- [ ] Manually delete the cookie via Keychain Access → Sync → source row turns red with "Re-authentication required" + button to reopen auth
- [ ] Click "Re-authenticate" → SSO window reopens → re-auth → source goes back to green
- [ ] Cookies confirmed to be in Keychain (`security find-generic-password -s "career-os.jobteaser.hec.session"`) and NOT in `~/Library/Application Support/com.caezarr.career-os/career-os.db`

---

## 10. Privacy posture

- ✅ Cookies in Keychain only — never in SQLite, never bundled, never logged
- ✅ Session-stored locally per user-Mac-account — no cloud sync
- ✅ Single-egress: every auth-bound HTTP call goes through `cloud::Client` (depends on PRIV-01 sprint completing first — if it hasn't, we add a TODO and match the existing ad-hoc pattern)
- ✅ No telemetry on which schools the user uses — the school list is a static curated array, no usage events
- ✅ Privacy notice on the auth window banner explaining what we capture and where it goes

---

## 11. Workflow

- **Branch:** `feat/job-teaser-sso`, off latest main
- **Commits:** one per task T*, atomic
- **PR:** opened in draft on Day 1
- **Tests:** smoke test on Day 5 (`cargo test --ignored jobteaser_smoke`)
- **Review:** ask for live test on Day 5 with the user's real HEC account before marking sprint complete
