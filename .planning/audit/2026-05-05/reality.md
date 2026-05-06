# Career OS — UX Reality Check (2026-05-05)

**Default verdict: NEEDS WORK.** Many surfaces look polished but break on
first contact with real (zero-state or JT-ingested) data, and several
README claims about v1 are not backed by the code that ships today.

## Severity legend
- **BLOCKING** = breaks the surface or ships a falsifiable lie
- **MAJOR** = visibly broken UX
- **MINOR** = annoying
- **COSMETIC** = stale copy

## Top 7 BLOCKING items

1. **Strip seed data from first launch** (or gate behind opt-in). Today
   a fresh user sees a fictional Gabriel Rance with 5 fake notifications,
   4 fake CVs at "Today 9:41 AM", 3 fake applications, prep streak 12.
2. **Compute a real `match` for ingested jobs.** Hardcoded 0% in
   `normalize.rs:101`. JobListItem renders red 0% MatchPill on every
   real job — sorting "Best match" buries reality below seed mocks.
3. **Wire ApplyModal to carry JT enrichment fields** (`companyLogoUrl`,
   `companyStage`, `sector`, etc.) AND support "I applied externally,
   track it" for `source.sourceUrl` jobs.
4. **Reconcile README Keychain claim with localStorage reality.**
   `useAnthropicKey.ts:5` says "Future: migrate to Keychain", README
   says "API keys in Keychain. Never SQLite. Never bundled. Never logged."
5. **Fix stale "Copilot overlay Settings" refs** — `CVATSView.tsx:163`,
   `runAnalyzer.ts:48`. Real path is Settings → API Keys.
6. **Replace MockInterview theatre.** `MockInterview.tsx:3,30` imports
   `mockMockInterview` and saves its hard-coded 86% scores into
   `prepSession`. User thinks they did a mock; corrupts prep history.
7. **Either parse the AI search structured query or remove the bar.**
   `AISearchBar` button only fires `toast.info("Searching...")`.

## 1. Onboarding — no flow exists

`User.onboardingComplete` declared in `store/types.ts:35` but never read.
Dashboard dumped on user with mock data:

- **BLOCKING** Fake user identity (`store/slices/user.ts:6-17`)
- **BLOCKING** 5 fake notifications persisted (`notifications.ts:7-53`)
- **BLOCKING** 4 fake CV variants (`store/slices/cvs.ts`)
- **BLOCKING** Fake applications + pipeline (synthesised `appliedAt`)
- **BLOCKING** Fake prep streak 12 days (`prep.ts:117-118`)
- **MAJOR** Today's tasks pre-populated

`useTodaysFocus.ts:183` `pipeline-empty` path can't trigger.

## 2. Jobs page

- **BLOCKING** `match` hardcoded 0 for all ingested jobs
  (`normalize.rs:101`). JobsHeader subtitle "AI-powered job sourcing
  and matching" is a lie.
- **MAJOR** AI Search Bar is theatre. Button only toasts.
- **MAJOR** JobTeaser missing from `JobsHeader.tsx:18-44` PROVIDERS list
  even though it's in the `IngestProvider` union.
- **MAJOR** Pagination resets to page 0 on every keystroke
  (`JobList.tsx:160-162`).
- **VERIFIED** Bookmarks survive reload via `bookmarkedJobIds`. ✓

## 3. JobDetail panel

- **MAJOR** `aiSummary` / `whyYouMatch` / `rating` / `reviews` populated
  for ONE seed job only (`store/slices/jobs.ts:54-56`, `i === 0`).
  Real JT jobs render half-empty.
- **MINOR** "View posting" + "Apply now" both open `source.sourceUrl`.
  Two buttons, same destination.
- **COSMETIC** `formatSalary` returns `—` on min===0 with no tooltip
  explaining "no salary listed".

## 4. CompanyModal

- **VERIFIED FIX LANDED** Black-screen bug (`useMemo` + stable selector
  at `CompanyModal.tsx:50-67`). ✓
- **MAJOR** "Other open positions" empty for JT one-offs (typical scrape
  returns one job per company).
- **MAJOR** Non-curated companies show no sector/stage. Modal becomes
  one avatar + name + maybe location.

## 5. War Room (Workspace.tsx)

- **MAJOR** `MatchScoreCard` 0% red donut on every JT job until analyzer
  runs. With no Anthropic key, never updates. "0% — Stretch target"
  reads as real signal.
- **MAJOR** "Career Memory" stats hardcoded literals. `Key skills = 28`
  (`Workspace.tsx:811-841`). Comment admits "Heuristic numbers".
- **MAJOR** Interview Prep Hub mostly mock. `questionsByTab` static,
  90-second pitch body is hardcoded Stripe-invoicing paragraph for
  every job/user/CV. Progress numbers `12/25`, `2/5` literals.
- **MAJOR** Interview Readiness sub-scores fake. `Pitch quality: 30`,
  `Interview prep` flips between 35/55 based on `hasSession`.
- **MAJOR** "Live assistant" is placebo. User types question, navigates
  to Copilot with empty input (parent's `onAsk` discards `q`).
- **MINOR** `nextInterviewDays` always returns 5 (literal placeholder).

## 6. Applications

- **BLOCKING** `createApplication` drops every JT-enriched field.
  `ApplyModal.tsx:46-55` — no `companyLogoUrl`, no `companyStage`,
  no `sector`, no `companyBatch`, no `workMode`, no `salary`.
- **MAJOR** Synthetic job ids in seed apps don't match real job ids.
  `Pipeline.tsx:103` `jobs.find` returns `undefined` → cards render
  `role: "—"`, `company: "—"` alongside well-formed cards.
- **MINOR** `archiveApplication` doesn't bump `lastActivityAt`.
- **MINOR** Delete is permanent, no soft-delete / undo.

## 7. CV Manager

- **BLOCKING** Stale "Copilot overlay Settings" refs:
  - `cv/CVATSView.tsx:163-165`
  - `lib/runAnalyzer.ts:48`
- **MAJOR** Anthropic key surface in CVATSView is flat hint, no CTA.
  `EmbeddedCopilotPanel.tsx:81-86` does have one — inconsistent.
- **BLOCKING** API keys live in `localStorage` not Keychain. README
  pillar says otherwise. **Falsifiable claim.**

## 8. Prep

- **BLOCKING** `MockInterview.tsx` is theatre. Imports `mockMockInterview`
  verbatim. "Save" button stamps mock's hardcoded scores into
  `prepSession`. User thinks they did a mock; got 86%; did nothing.
- **MAJOR** `prepStreakDays: 12` persists from seed.
- **MINOR** `useAdaptivePrepTrack` override has no reset path.

## 9. Settings

- **MAJOR** Billing tab opens placeholder Stripe redirects to
  `https://career-os.app/billing`. No back-end. Plan cards claim
  enforced quotas that aren't enforced.
- **MAJOR** Notifications: 4/5 toggles "Coming soon".
- **MAJOR** Feedback tab is `mailto:`. Silent fail if no default mail.
- **MAJOR** Profile/Account stores PII in `localStorage` (WebKit storage
  path), not the README-promised app data dir.
- **MINOR** Audio Devices error never clears after granting permission.

## 10. Live Copilot

- **CONTRARY TO README — pipeline IS partially wired.** `session.rs:41`
  opens cpal devices, connects AssemblyAI v3 WS, streams audio.
  `start_session` Tauri command invoked by `useCopilotControls.start()`.
  README says Phase 6 ⚪ planned — out of date.
- **MAJOR** Audio init failure silent + generic. No link to Settings → Audio.
- **MAJOR** Session restart races. `useCopilotSession.ts:222`
  `endCopilotSession()` (slice mutation only) before `start_session`.
- **MAJOR** No offline / failover. `grep ollama src-tauri` returns nothing.
  README "triple-redundant pipeline" aspirational.
- **MAJOR** Fake `⌘⇧Space` keybinding hint. Only Cmd+K registered.
- **MINOR** Copilot minutes metering not implemented.

## 11. Error states

- DB hydration failures swallowed with `console.warn`, no UI hint
- 401 from Anthropic surfaces raw SDK error string
- JT 401: stamps `lastError` on IngestSource (reasonable)
- SQLite locked / migration failure: silently swallowed

## 12. Deeplinks / navigation

- **MAJOR** No real deeplinks. `navigation.tsx` is `useState<Page>`.
  Reload always lands on dashboard.
- **BLOCKING** JT (and any external) jobs cannot be applied-and-tracked.
  JobDetail Apply button short-circuits to `openExternal` if
  `source.sourceUrl` exists. No "I applied — track it" follow-up. The
  Jobs → Apply → tracked-in-Applications promise breaks for the only
  category of jobs the new ingestion fetches.
- Application → War Room: no "Open War Room" button from app detail.

## 13. Stale references / dead code

- `CVATSView.tsx:164`, `runAnalyzer.ts:48` — "Copilot overlay Settings"
- `data/cv.ts:16` — `lastEdited: 'Today at 9:41 AM'` literal
- `data/jobs.ts` — legacy seed jobs (Qonto, Doctolib, Stripe, Google)
- `EmbeddedCopilotPanel.tsx:104` — `⌘⇧Space` hint, no hotkey registered
- `Pipeline.tsx:265-269` — "Refresh" menu item just toasts

## 14. Black-screen bug — VERIFIED FIX LANDED

`CompanyModal.tsx:50-67` reads `s.jobs` via stable selector + `useMemo`.
Comment at lines 51-54 documents the prior bug. ✓

**Similar pattern to watch:** `JobDetail.tsx:37-40` inline selector
returning fresh `Job | null`. Probably fine (inner `find` returns same
ref) but worth memo wrapper for symmetry.

---

**Suggest a focused QA pass with `/expect` against the Jobs → Apply →
Applications chain on a clean profile to verify the BLOCKING items
reproduce.**
