# Verification Checklist

This checklist helps verify that Vite, Remotion, Tauri, and Worker surfaces build, run, and test correctly before merging changes.

## Prerequisites

- macOS 13+
- Rust (stable) + Cargo
- Node 20+ and `pnpm@9.15.4`
- Xcode Command Line Tools
- For worker: Cloudflare Wrangler CLI (included in `worker/node_modules`)

## 1. Vite (Frontend)

**Location:** Root directory (`package.json`)

### Type Check

```bash
pnpm typecheck
```

**Pass criteria:** Exit code 0, no TypeScript errors.

### Build

```bash
pnpm build
```

**Pass criteria:** 
- Exit code 0
- `dist/` directory created with bundled assets
- No build warnings or errors

### Dev Server

```bash
pnpm dev
```

**Pass criteria:**
- Dev server starts on `http://localhost:5173` (or next available port)
- No console errors
- Hot reload works when editing `.tsx` files
- Stop with `Ctrl+C`

### Preview Build

```bash
pnpm preview
```

**Pass criteria:**
- Preview server starts successfully
- Application loads without errors
- Stop with `Ctrl+C`

---

## 2. Tauri (Desktop Shell)

**Location:** Root directory (`package.json`, `src-tauri/Cargo.toml`)

### Rust Tests

```bash
cd src-tauri && cargo test
```

**Pass criteria:**
- Exit code 0
- All tests pass
- No compilation errors

### Dev Mode

```bash
pnpm tauri dev
```

**Pass criteria:**
- Desktop app window opens
- Vite dev server starts alongside Tauri
- No Rust compilation errors
- App UI loads correctly
- Close app normally or stop with `Ctrl+C`

### Production Build

```bash
pnpm tauri build
```

**Pass criteria:**
- Exit code 0
- DMG artifact created in `src-tauri/target/release/bundle/dmg/`
- No build errors
- (Optional) DMG opens and app launches when installed

**Note:** First launch on a new Mac requires right-click → Open to bypass Gatekeeper (unsigned build).

---

## 3. Worker (Cloudflare)

**Location:** `worker/` directory

### Type Check

```bash
cd worker
pnpm typecheck
```

**Pass criteria:** Exit code 0, no TypeScript errors.

### Local Database Migration

```bash
cd worker
pnpm db:migrate:local
```

**Pass criteria:**
- Exit code 0
- Migrations applied successfully to local D1 database
- No SQL errors

### Dev Mode

Prerequisites: Create `.dev.vars` from `.dev.vars.example` and populate secrets.

```bash
cd worker
pnpm dev
```

**Pass criteria:**
- Wrangler dev server starts on `http://localhost:8787`
- No startup errors
- Health endpoint responds (if implemented)
- Stop with `Ctrl+C`

---

## 4. Remotion (Video Generation)

**Location:** `remotion/` directory

### Type Check

```bash
cd remotion
pnpm lint
```

**Pass criteria:** Exit code 0, no TypeScript errors.

### Studio (Dev Mode)

```bash
cd remotion
pnpm dev
```

**Pass criteria:**
- Remotion Studio opens in browser
- All compositions render in preview without errors
- Timeline controls work
- Stop with `Ctrl+C`

### Render Test

```bash
cd remotion
pnpm render:hot-take
```

**Pass criteria:**
- Render completes successfully
- Output video created in `out/hot-take.mp4`
- No rendering errors
- Video plays correctly

---

## 5. Integration Smoke Test

### Full Stack Local Run

1. **Start Worker** (Terminal 1):
   ```bash
   cd worker
   pnpm dev
   ```

2. **Start Tauri App** (Terminal 2):
   ```bash
   echo 'VITE_API_BASE_URL=http://localhost:8787' > .env.local
   pnpm tauri dev
   ```

**Pass criteria:**
- Both services start without errors
- App can communicate with local worker API
- Authentication flow works (if magic-link configured)
- Dashboard loads with seed data

---

## Quick Verification (CI-style)

For a fast check across all surfaces:

```bash
# Root
pnpm typecheck && pnpm build

# Tauri
cd src-tauri && cargo test && cd ..

# Worker
cd worker && pnpm typecheck && cd ..

# Remotion
cd remotion && pnpm lint && cd ..
```

**Pass criteria:** All commands exit with code 0.

---

## Common Issues

### Vite/Tauri

- **Ports in use:** If `5173` or `1420` are occupied, Vite/Tauri will pick next available port.
- **Rust compile errors:** Ensure Xcode Command Line Tools are installed: `xcode-select --install`

### Worker

- **Missing `.dev.vars`:** Copy from `.dev.vars.example` and populate required secrets.
- **D1 database errors:** Run `pnpm db:migrate:local` before first dev run.

### Remotion

- **Render failures:** Check that all asset paths in compositions are valid.
- **Memory issues:** Remotion renders can be memory-intensive; close other apps if needed.

---

## Pre-Merge Checklist

Before opening a PR, verify:

- [ ] All type checks pass (`pnpm typecheck` in root, worker, remotion)
- [ ] Rust tests pass (`cargo test` in `src-tauri/`)
- [ ] Production builds succeed (`pnpm build` and `pnpm tauri build`)
- [ ] No new console errors or warnings in dev mode
- [ ] Changes documented in `CHANGELOG.md` under `## Unreleased` (if user-visible)
- [ ] Conventional commit format used (`feat:`, `fix:`, `docs:`, `chore:`)

---

**Note:** This checklist covers happy-path verification. For comprehensive testing (unit, integration, E2E), refer to the test suite when it becomes available.
