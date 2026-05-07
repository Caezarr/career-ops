# Career OS — Infra / Build / Deployment Audit (2026-05-05)

**Scope:** CI/CD, build reproducibility, distribution, release process, repo
hygiene, telemetry, branches, deps, GitHub settings.
**Repo:** github.com/Caezarr/career-ops (just public).
**Verdict:** the app builds locally, but there is **zero shipping
infrastructure**. No CI, no signing, no release process, no telemetry, and
the README's "signed/notarised .dmg" claim is **false**. Several BLOCKING
items before tagging any v0.0.2.

## Severity legend
- **BLOCKING** — fix before any v0.0.2 / first public build
- **HIGH** — fix this milestone; reliability or security concern
- **MEDIUM** — fix soon; quality / maintainability tax
- **LOW** — nice to have; polish

---

## 1. CI/CD — BLOCKING

No `.github/workflows/`. **Zero CI.** No `cargo check`, `cargo test`,
`cargo clippy`, `cargo fmt --check`, `tsc --noEmit`, `pnpm build`. Recent
fix-on-fix iteration ("fix: TDZ on resume", "fix: aggressive autoscroll",
"fix: chunk IPC payload") would have been caught by basic typecheck +
cargo check.

**Minimal `ci.yml`:** macos-14 runner, two jobs (frontend tsc+build, rust
fmt+clippy+check+test). Plus tag-driven `release.yml` (see §3 + §4).

## 2. Build reproducibility — HIGH

| Item | State |
|---|---|
| Cargo.lock committed | yes |
| pnpm-lock.yaml committed | yes |
| Node version pinned | **no** — no `.nvmrc`, no `engines.node`, no `packageManager` |
| pnpm version pinned | **no** |
| Rust toolchain pinned | **no** — no `rust-toolchain.toml` |
| Tauri pinned | partial — `tauri = "2"` major-only, `@tauri-apps/cli ^2.10.1` caret |

Add `.nvmrc=20`, `packageManager: pnpm@9.x`, `rust-toolchain.toml` with
`channel=1.82.0`, tighten `tauri = "=2.1.1"`.

## 3. Distribution / signing / notarization — BLOCKING

`tauri.conf.json` declares `bundle.targets: "dmg"` but **no**
`bundle.macOS.signingIdentity`, **no** entitlements, **no** notarization,
**no** auto-update mechanism. Fresh user downloading any future release
will hit Gatekeeper "App is damaged".

Three honest options: (a) Apple Developer Program $99/yr → Developer ID +
notarization; (b) ship unsigned + document `xattr -cr` workaround; (c)
remove `pnpm tauri build` distribution claim entirely. Update README to
match.

## 4. Release process — HIGH

No `CHANGELOG.md`, no `RELEASE.md`. Three independent version sources:
`package.json`, `tauri.conf.json`, `src-tauri/Cargo.toml` — all 0.0.1.
Manual bump-three-files-and-build ritual undocumented.

Tag-driven `release.yml` using `tauri-apps/tauri-action@v0`. Add
`CHANGELOG.md` (Keep a Changelog format), 20-line `RELEASE.md`.

## 5. .gitignore — LOW (mostly clean)

In good shape. Verified `node_modules/`, `dist/`, `build/`, `coverage/`,
`src-tauri/target/`, `**/target/`, `.DS_Store`, `.env*`, `*.pem`, `*.key`,
`*.p12`, `.claude/`, `.aider*`, `*.tsbuildinfo`.

Add: `*.dmg`, `src-tauri/target/release/bundle/`, `.envrc`, `.zed/`,
`.cursor/`, `package-lock.json`, `yarn.lock` (fail loud on cross-tool lockfiles).

## 6. Repo hygiene — MEDIUM

`.planning/` ~150 KB tracked intentionally (CLAUDE.md says so) — fine for
solo personal project where planning is the artifact. Add disclaimer at
top of `PROJECT.md` / `REQUIREMENTS.md`. Plan to archive sprints older
than 2 milestones into `.planning/archive/`.

`.claude/` correctly ignored. README badges accurate. **Inaccurate:**
"signed/notarised .dmg" claim — fix in §3.

Missing: CI status badge, license badge, release version badge.

## 7. Telemetry / observability — MEDIUM (intentional gap)

Zero analytics, zero crash reporting. Consistent with privacy stance.
Recommendations: local-only crash logs via existing `tracing` dep
(rotating-file appender to `~/Library/Logs/com.caezarr.career-ops/`).
Don't add Posthog/Mixpanel. If remote telemetry ever added, gate behind
opt-in setting + route through `cloud::Client` (PRIV-01).

## 8. Release artifacts — HIGH

`pnpm tauri dev` works iff Node 20 + pnpm 9 + Rust stable + Xcode CLI +
Apple cert (none enforced). `pnpm tauri build` produces **unsigned** dmg
that macOS blocks on first launch — README claims otherwise (false).

Replace README line with truth (post §3): "Releases on GitHub are signed
+ notarized. Local `pnpm tauri build` produces an unsigned `.dmg` for
development." Add Build-from-source troubleshooting section. Pin Node 20
and pnpm 9 explicitly in Prerequisites.

## 9. Branch hygiene — MEDIUM

15 local branches: most merged feature branches that should be deleted.
Run after this audit:
```bash
git branch --merged main | grep -v '^\*\|main\|chore/audit-roast' | xargs -n1 git branch -d
git fetch --all --prune
```

`feat/dashboard-real` is local-only orphan. `feat/war-room-redesign` on
origin only. Decide and clean.

## 10. Dependency update strategy — MEDIUM

No Renovate, no Dependabot. Manual updates. For Tauri 2 / React 19 /
Vite 6 / rustls-reqwest stack at the bleeding edge, this compounds risk.

`.github/dependabot.yml` with weekly grouped updates (tauri, react),
monthly github-actions. **Critical ordering:** without §1 CI, Dependabot
PRs are useless — land §1 first.

## 11. GitHub repo settings — HIGH

For `main`: require status checks (after §1), branches up to date,
linear history, no force pushes, no deletions. Auto-delete head
branches after merge ON. Skip "require PR review" until collaborator
joins (friction theater for solo).

Repo overall: Issues ON, Wiki OFF, Dependabot alerts ON, CodeQL ON.
**License:** README says "no redistribution license granted" — add
explicit `LICENSE` file with "All rights reserved" or document
intentionally (currently no LICENSE = legal ambiguity for users).

---

## Priority queue (ship in this order)

1. §1 CI/CD — minimal `ci.yml`
2. §2 Reproducibility — `.nvmrc`, `packageManager`, `rust-toolchain.toml`, Tauri pin
3. §3 Distribution decision — pick (a)/(b)/(c), update README
4. §8 README correction — strike "signed/notarised" claim immediately
5. §4 Release process — `release.yml` + `RELEASE.md` + `CHANGELOG.md`
6. §11 Branch protection — require CI green on main, auto-delete heads
7. §10 Dependabot — only after §1
8. §9 Branch cleanup — one-time prune
9. §7 Local-only crash logs
10. §5/§6 polish

## NOT covered

- Live `gh repo view` settings (verify §11 manually)
- `pnpm audit` / `cargo audit`
- Bundle-size budget
- Tauri capabilities (security audit)
- Migration safety (DB audit)
