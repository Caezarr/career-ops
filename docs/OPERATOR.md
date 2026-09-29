# Operator Checklist

> **For:** New interns, operators, and developers running career-ops locally for the first time.  
> **Goal:** Get the app and worker running locally, verify core functionality with a smoke path.

This document complements the developer instructions in the main [README](../README.md). For installation from DMG or high-level architecture, see the README first.

---

## Prerequisites

Before starting, ensure you have:

- **macOS 13+** (macOS 15+ recommended for full screen-share masking features)
- **Xcode Command Line Tools**  
  ```bash
  xcode-select --install
  ```
- **Rust** (stable) and **Cargo**  
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```
- **Node 20+**  
  ```bash
  node --version  # should print v20.x.x or higher
  ```
- **pnpm**  
  ```bash
  npm install -g pnpm@latest
  ```
- **Git**  
  ```bash
  git --version
  ```

---

## Environment Setup

Career OS consists of two services that run locally:

1. **Worker** (Cloudflare Worker backend via `wrangler dev`)
2. **App** (Tauri desktop app via `pnpm tauri dev`)

### 1. Clone the Repository

```bash
git clone https://github.com/Caezarr/career-ops.git
cd career-ops
pnpm install
```

### 2. Worker Environment Variables

The worker requires API keys and secrets. Copy the example file and fill in your values:

```bash
cd worker
cp .dev.vars.example .dev.vars
```

Edit `worker/.dev.vars` and set the following:

| Variable | Description | Example / How to Get |
|----------|-------------|----------------------|
| `JWT_SECRET` | Random secret for JWT signing (32+ bytes, base64) | Run: `openssl rand -base64 48` |
| `LOOPS_API_KEY` | Loops transactional email API key | Get from [Loops Settings → API](https://loops.so/settings). Use `"dev-noop"` for local dev without email (magic link will be logged to console). |
| `LOOPS_TRANSACTIONAL_ID` | Template ID for magic-link emails | Created in Loops dashboard. Must accept `magicLink` and `email` variables. Leave empty if using `dev-noop`. |
| `ANTHROPIC_API_KEY` | Anthropic API key for server-managed AI endpoints | Get from [Anthropic Console](https://console.anthropic.com/settings/keys). Required for profile polishing during onboarding. |

**Dev tip:** If you don't have a Loops account yet, set `LOOPS_API_KEY="dev-noop"` (with quotes). The worker will skip the email send and log the magic link URL to the console. Copy/paste that URL into your browser to complete auth. **Only safe in dev.**

### 3. Worker Database Setup

Initialize the local D1 database:

```bash
cd worker
pnpm install
pnpm db:migrate:local
```

This creates the local SQLite database and runs all migrations.

### 4. App Environment Variables

Point the app to your local worker:

```bash
cd ..  # back to project root
echo 'VITE_API_BASE_URL=http://localhost:8787' > .env.local
```

This tells Vite to route API calls to the local worker instead of production.

---

## Start Commands

You'll need **two terminal sessions** running simultaneously:

### Terminal 1: Start the Worker

```bash
cd worker
pnpm dev
```

Expected output:
```
⛅️ wrangler 4.x.x
-------------------
[wrangler:inf] Ready on http://localhost:8787
```

Leave this running. The worker serves the auth and AI endpoints.

### Terminal 2: Start the App

```bash
cd ..  # back to project root if you're still in worker/
pnpm tauri dev
```

Expected output:
```
   Compiling career-ops v0.0.6 (/path/to/career-ops/src-tauri)
    Finished dev [unoptimized + debuginfo] target(s) in X.XXs
```

The app window should open. On first launch, macOS will prompt for:

- **Microphone** access (for Live Copilot)
- **Screen Recording** access (for system audio capture)
- **Accessibility** access (for global hotkeys)

Grant all permissions when prompted. The app will guide you through this on first run.

---

## Post-Start Smoke Checks

Once both services are running, verify core functionality:

### ✅ 1. Worker Health

In your browser, visit:

```
http://localhost:8787/health
```

Expected response:
```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

If you see this, the worker is up and responding.

### ✅ 2. App Launches

- The Career OS window should open automatically after `pnpm tauri dev` compiles.
- You should see the **Dashboard** or **Welcome/Onboarding** screen.
- No console errors about missing API endpoints (check the terminal running `pnpm tauri dev`).

### ✅ 3. Auth Flow (Magic Link)

1. In the app, click **Settings → Account** (or the onboarding prompt).
2. Enter your email and click **Send Magic Link**.
3. **If using `LOOPS_API_KEY="dev-noop"`:**
   - Check the **worker terminal** (Terminal 1) for a logged URL like:  
     ```
     [dev-noop] Magic link: careeros://auth/callback#jwt=eyJ...
     ```
   - Copy that full URL and paste it into your browser's address bar.
   - The browser will prompt to open Career OS. Click **Open**.
4. **If using a real Loops key:**
   - Check your email inbox for the magic link.
   - Click the link in the email.
5. The app should authenticate and show your email in **Settings → Account**.

### ✅ 4. Dashboard Loads

- After auth, the **Dashboard** should display:
  - Today's greeting
  - Activity sparkline (may be empty if no data yet)
  - Priority CTAs or placeholder state

If you see the dashboard with no errors, the core UI and data flow are working.

### ✅ 5. Worker Database (Optional)

If you want to inspect the local database:

```bash
cd worker
pnpm db:console "SELECT * FROM users;"
```

You should see the user record created during your auth flow.

---

## Troubleshooting

### Worker won't start

- **Error: `JWT_SECRET is not set`**  
  → Edit `worker/.dev.vars` and add a JWT_SECRET. Generate one with `openssl rand -base64 48`.

- **Error: `Database not found`**  
  → Run `pnpm db:migrate:local` in the `worker/` directory.

### App won't compile

- **Error: `cargo: command not found`**  
  → Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

- **Error: `xcode-select: error: tool 'xcodebuild' requires Xcode`**  
  → Install Xcode Command Line Tools: `xcode-select --install`

- **Tauri build fails with Objective-C errors**  
  → Some features (Core Audio Tap) require the full Xcode toolchain. If you only need basic functionality, the app will fall back gracefully. See `src-tauri/Cargo.toml` comments for details.

### App can't reach worker

- **Error in app console: `Failed to fetch http://localhost:8787/...`**  
  → Check that:
    1. The worker is running in Terminal 1 (`pnpm dev` in `worker/`).
    2. `.env.local` in the project root contains `VITE_API_BASE_URL=http://localhost:8787`.
    3. Restart `pnpm tauri dev` after changing `.env.local`.

### Permissions not granted

- If you accidentally denied Microphone/Screen Recording/Accessibility:
  1. Open **System Settings → Privacy & Security**.
  2. Find **Career OS** in the relevant section and enable it.
  3. Restart the app.

---

## Next Steps

Once your smoke checks pass:

- **Add a CV:** Go to **CV Manager** and upload a PDF. The app will parse it via Docling.
- **Create a Job:** Go to **Jobs** → **Add Job** to start tracking an application.
- **Explore War Room:** Select a job to open its dedicated workspace.
- **Try Prep:** Go to **Prep** to see the adaptive question bank.

For deeper architecture, planning artifacts, and roadmap, see:

- [`.planning/ROADMAP.md`](../.planning/ROADMAP.md) — 7-phase v1 plan
- [`CLAUDE.md`](../CLAUDE.md) — project orientation for AI and humans
- [README](../README.md) — user-facing overview

---

## Out of Scope

This document does **not** cover:

- Live Copilot test fixtures (see [issue #70](https://github.com/Caezarr/career-ops/issues/70))
- Production deployment (Cloudflare Workers publish, DMG signing)
- Dependabot major version upgrades
- Advanced stealth overlay configuration

For production operations and deployment, see the internal runbooks (not yet published).

---

**Questions or issues?** Open a [GitHub issue](https://github.com/Caezarr/career-ops/issues) or see [SUPPORT.md](../SUPPORT.md).
