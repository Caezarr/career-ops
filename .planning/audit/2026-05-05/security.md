# Career OS — Security Audit (2026-05-05)

**Verdict:** 3 CRITICAL · 6 HIGH · 6 MEDIUM · 5 LOW.

## Summary

| Severity | Count | Themes |
|---|---:|---|
| CRITICAL | 3 | Tauri ACL gap (custom cmds ungated), JT cookie dead-write to Keychain, dep audit not run |
| HIGH | 6 | PRIV-01 drift (**9 egress sites, not 5+**), JT XHR sniffer + IPC reachable from 3rd-party JS, plaintext keys over IPC, mixed TLS, error-body key leaks, pdf-extract DoS |
| MEDIUM | 6 | wildcard remote URL, no consent gate on AI calls, format!-built SQL, broad core:default, default-debug logger, no CSP on JT window |
| LOW | 5 | null CSP, brittle header parse, console.log volume, dist/+tsbuildinfo committed, fake UA |

## Top 3 to fix this week (highest risk × lowest effort)

1. **Stop persisting `rawCookie`** in `auth.rs` — 3-line change, kills CRITICAL #2.
2. **Window-label check** on every Tauri command callable from JT capability.
3. **`cargo audit` + `pnpm audit`** in CI, gate-fail on HIGH/CRITICAL.

## Top architectural fix (this quarter)

**Land PRIV-01** (`PR1-01..05` in BACKLOG). The single-egress refactor
closes 6 of the HIGH/MEDIUM findings: one place to scrub error bodies,
log audit rows, enforce consent, swap TLS, keep deps current, inject
the PII-stripped logger.

---

## CRITICAL #1 — Tauri custom commands exposed to remote `*.jobteaser.com`

**Files:**
- `capabilities/jobteaser.json:6-14` (windows + remote.urls binding)
- `lib.rs:1140-1255` (`tauri::generate_handler!` registry, 62 commands)

**Risk:** Custom commands registered via `generate_handler!` are NOT
gated by the ACL — only built-in/plugin commands need explicit
permissions. Any code in a window covered by ANY capability can
invoke ANY custom command. JT pages load **Google Tag Manager +
RudderStack** (confirmed in code). Those run in the same window
principal as the bridge → can call
`window.__TAURI_INTERNALS__.invoke('<any_command>', …)`.

Reachable: `db_delete_application`, `db_delete_cv`, `db_delete_job`,
`db_delete_ingest_source`, `db_create_cv` (with attacker PDF blob),
`db_update_user`, `start_session` (taking `anthropic_key` +
`assemblyai_key` plain), `analyze_cv_ats`. An XSS-equivalent in any JT
subdomain can wipe the local DB or exfiltrate API keys.

**Fix:**
1. Tighten `remote.urls` from `https://*.jobteaser.com/*` to specific paths.
2. Server-side, validate `tauri::Window::label() == "jobteaser-auth"`
   in each JT-callable command; reject otherwise.
3. Run JT in `incognito: true` and a separate `data_directory`.

## CRITICAL #2 — JT bridge ships `document.cookie` over IPC, persists forever, never replays it

**Files:**
- `auth_bridge.js:239-248` (`rawCookie: document.cookie || ''`)
- `auth.rs:62-88` (`store_cookies_in_keychain`)
- `scrape.rs:101-117` (`fetch()` is a no-op — never reads cookies)

**Risk:** Bridge claims "cookies stay in WebKit data store" but assigns
`rawCookie: document.cookie` and ships it to Rust, persisted forever
under `career-os.jobteaser.<slug>.session`. Two issues:
1. `document.cookie` excludes HttpOnly cookies, so the captured value
   can't replay JT auth — it's **dead weight**.
2. `scrape.rs::fetch()` never reads it — only checks "keychain entry
   present" as a sentinel.
3. Persisting analytics IDs / Cloudflare bot tokens / A/B-test buckets
   forever is a privacy violation regardless.

**Fix:** stop persisting `rawCookie`. Either drop `AuthCookies.raw_cookie`
or store empty string. Update doc comments.

## CRITICAL #3 — `cargo audit` / `pnpm audit` not run in CI

**Files:**
- `Cargo.toml:35` — `tokio-tungstenite = "0.21"` (early 2024, frame DoS line)
- `Cargo.lock` — `openssl 0.10.78` in tree despite rustls features
- `Cargo.toml:30` — `pdf-extract = "0.7"` (panic-on-malformed line)

**Fix:**
1. Run `cargo audit` and `pnpm audit` in CI on every PR.
2. Bump tungstenite to 0.23+ + `rustls-tls-webpki-roots`.
3. Investigate `openssl` in tree (`cargo tree -e features -i openssl`).
4. Pin pdf-extract; fuzz-test `extract_text_from_base64`.

---

## HIGH #1 — PRIV-01: 9 distinct egress sites (not 5+)

`lib.rs:70`, `llm.rs:111`, `stt.rs:11`, `ai/anthropic.rs:48,126`,
`ingest/{greenhouse,lever,ashby,ycombinator}.rs`, plus
`session.rs:122` `tokio_tungstenite::connect_async` direct.

User docstring at `ingest/mod.rs:18` undercount.

**Fix:** ship the standalone backlog task `PR1-01..05`. Recording
**measured count = 9** so sprint estimates reflect reality.

## HIGH #2 — JT WebView injection overrides `fetch` + `XMLHttpRequest`

`auth_bridge.js:1156-1208`. Third-party JS at JT origin (GTM,
RudderStack) runs in same principal — can read `window.fetch.toString()`
to fingerprint Career OS desktop, and (via CRITICAL #1) can call
`window.__TAURI_INTERNALS__.invoke()` directly.

URLs with embedded user identifiers reach macOS Console.app via 30+
`console.log` breadcrumbs.

**Fix:**
1. Strip XHR sniffer in production builds — `#[cfg(debug_assertions)]`
   on the `include_str!` site.
2. Wrap `__TAURI_INTERNALS__.invoke` calls behind a one-shot capability
   token freshly generated in Rust, passed via `initialization_script`.
3. Reduce `console.log` to `console.debug`, silence URL bodies.

## HIGH #3 — Plaintext API keys over IPC + JS state

`lib.rs:27-54` `CaptureConfig` carries 3 keys as plain `String`.
Frontend `src/copilot/CopilotApp.tsx:10-30` keeps raw keys in
component state. Every AI invoke ships raw key over IPC.

`CaptureConfig` derives `Debug` — adding `debug!("config={:?}")` later
would silently leak everything. Combined with CRITICAL #1: JT-origin
3rd-party script can call any AI command with arbitrary payload and
observe responses.

**Fix:**
1. Move all 3 keys to keyring (`career-os.{anthropic,openai,assemblyai}.key`).
2. Drop `*_key` fields from `CaptureConfig` and AI commands. Read
   from Keychain server-side.
3. Drop `Debug` derive from `CaptureConfig`.

## HIGH #4 — Inconsistent TLS (rustls for HTTP, native-tls for WS)

`Cargo.toml:22` reqwest = rustls; `Cargo.toml:35` tungstenite =
native-tls. Two TLS stacks ship in binary.

**Fix:** tungstenite → `rustls-tls-webpki-roots`. Bump to 0.23+.

## HIGH #5 — API keys may leak in error messages

`ai/anthropic.rs:62-67`, `llm.rs:124-128`, `stt.rs:34-37` propagate raw
response bodies. Anthropic occasionally echoes parts of the request in
errors.

**Fix:** scrub error bodies. Truncate to 256 chars; redact
`sk-(ant|proj)-[A-Za-z0-9_-]+`, `aai_[A-Za-z0-9]+`, `Bearer\s+\S+`.

## HIGH #6 — `pdf-extract` invoked on attacker bytes; no resource limits

`lib.rs:128-134` (`parse_cv_pdf`), `pdf.rs`. `spawn_blocking` (good)
but no memory/CPU/timeout ceiling. Malicious PDF can panic, OOM, stall.

**Fix:** cap input ≤25MB, wrap in `tokio::time::timeout(15s)`, add
fuzz test.

---

## MEDIUM (6 findings)

- **#1** Wildcard `https://*.jobteaser.com/*` — scope to specific paths
- **#2** `analyze_cv_ats` sends CV to Anthropic without consent gate /
  audit log — add SQLite audit row per outbound AI call
- **#3** `format!`-built SQL WHERE in `db/job.rs:50-87`,
  `db/application.rs:74-89` — fragile; use `QueryBuilder`
- **#4** `core:default` granted to JT capability — only needs
  `core:event:default` + `core:window:allow-close`
- **#5** `tracing` defaults `info,career_ops_lib=debug` in release
  (`lib.rs:1133-1138`) — gate behind `cfg!(debug_assertions)`
- **#6** JT auth window: no CSP, no `incognito`, no isolated
  `data_directory` — JT WebKit profile persists forever

## LOW (5 findings)

- **#1** Global `app.security.csp = null` (`tauri.conf.json:53`)
- **#2** Brittle `assemblyai_key` header parse (`session.rs:116-120`) —
  trim before `from_str`
- **#3** Production console.log inventory in frontend `lib/*` and
  `hooks/*` — route through single `log()` wrapper
- **#4** `tsconfig.tsbuildinfo` + `dist/` shipped to public repo —
  `git rm --cached`
- **#5** YC scraper sends fake Chrome UA (`ycombinator.rs:94`) — switch
  to `career-ops/0.0.1`
