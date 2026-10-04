# Smoke Test Checklist

Quick morning validation before diving into development or after pulling changes.

**Time budget:** ~2-3 minutes (excluding first-time Rust compilation)

---

## Prerequisites

- macOS 13+
- Rust (stable) + Cargo
- Node 20+ and `pnpm@9.15.4`
- Xcode Command Line Tools

---

## Checklist

### 1. Dependencies

```bash
pnpm install
```

**Pass:** Exit code 0, no errors

---

### 2. Type Check (Frontend)

```bash
pnpm typecheck
```

**Pass:** Exit code 0, no TypeScript errors

---

### 3. Unit Tests (Rust)

```bash
cd src-tauri && cargo test && cd ..
```

**Pass:** Exit code 0, all tests pass

---

### 4. Build (Frontend)

```bash
pnpm build
```

**Pass:** Exit code 0, `dist/` created with bundled assets

---

### 5. Tauri Dry Run Notes

**Not automated** — run manually when needed:

```bash
pnpm tauri dev
```

**Pass:**
- Desktop app window opens
- Vite dev server starts alongside Tauri
- No Rust compilation errors
- App UI loads correctly

**Stop:** Close app normally or `Ctrl+C`

---

## One-liner (CI-style)

Fast check across frontend + Rust:

```bash
pnpm install && pnpm typecheck && pnpm build && (cd src-tauri && cargo test)
```

**Pass:** All commands exit with code 0

---

## When This Fails

- **Rust compile errors:** Ensure Xcode Command Line Tools installed: `xcode-select --install`
- **Port conflicts:** Vite (5173) / Tauri (1420) will pick next available port
- **New dependencies added:** Re-run `pnpm install`

---

## Full Verification

For comprehensive testing (Worker, Remotion, integration checks), see **[VERIFY.md](../VERIFY.md)**.
