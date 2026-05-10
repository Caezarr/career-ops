# Career OS — Marketing Landing

FR-first beta capture landing for [Career OS](https://github.com/Caezarr/career-ops). Vite + React 19 + TypeScript, single static bundle, hand-rolled CSS matching the dashboard design tokens.

## Quick start

```bash
cd landing
pnpm install
pnpm dev
```

Open http://localhost:5173.

## Build

```bash
pnpm build      # outputs to dist/
pnpm preview    # serves dist/ locally to sanity-check the prod bundle
```

## Wiring the waitlist

The form posts to a configurable endpoint via env var. Three paths:

### 1. Dev stub (default)
Leave `VITE_WAITLIST_ENDPOINT` empty. Submissions log to the console with a 600ms simulated latency so you can visually test the loading / success / error states.

### 2. Loops (recommended for solo launch)
Create a [Newsletter Form in Loops](https://loops.so/), grab its form id, and set:

```
VITE_WAITLIST_ENDPOINT=https://app.loops.so/api/newsletter-form/<form-id>
VITE_WAITLIST_FORM=loops
```

The form submits as `application/x-www-form-urlencoded` with `email=...`. Loops handles dedup, double opt-in, and the autoresponder.

### 3. Custom backend (Cloudflare Worker / Resend)
For the version that ICP-scores incoming emails:

```
VITE_WAITLIST_ENDPOINT=https://api.careeros.app/waitlist
VITE_WAITLIST_FORM=json
```

Body goes as `application/json` with `{ email, source }`. Implement the Worker to forward to Loops/Resend + sink to Postgres for the referral mechanic.

## Demo video

Drop a 12-second loop at `public/demo.mp4` (or set `VITE_DEMO_VIDEO_URL` to an absolute URL). Recommended encode:

```bash
# Capture with Cmd+Shift+5 (Selected Portion). Aim for ~1920×1200.
ffmpeg -i input.mov \
  -vf "scale=1080:-2" \
  -an \
  -movflags +faststart \
  -c:v libx264 -preset slow -crf 22 \
  public/demo.mp4
```

Until the file lands, the Demo block renders a placeholder window frame so visitors can see the slot is intentional.

## Deploy — Cloudflare Pages

1. Push the branch to GitHub.
2. In Cloudflare Pages, **Create a project → Connect to Git → select repo**.
3. Build settings:
   - Framework preset: `None`
   - Build command: `cd landing && pnpm install && pnpm build`
   - Build output directory: `landing/dist`
   - Root directory: leave blank
4. Add env vars (Production):
   - `VITE_WAITLIST_ENDPOINT` (your Loops form URL)
   - `VITE_WAITLIST_FORM=loops`
   - `VITE_DEMO_VIDEO_URL` (after you upload a real demo)
5. Add the custom domain (`careeros.app` / `careeros.fr` / etc).

Cloudflare auto-deploys on every push to the linked branch.

## Brand consistency

Design tokens in `src/styles/tokens.css` mirror the dashboard's tokens (`src/dashboard/styles/tokens.css` in the parent repo). Accent stays `#6366f1` so a visitor who installs the app feels visual continuity. Keep this in lockstep — if you tweak a token in the dashboard, mirror it here.

## What this landing deliberately does NOT do

- No tracking pixel. The product positioning is privacy-first; the marketing must hold the same line.
- No client-side analytics. Add server-side via Cloudflare Web Analytics if needed.
- No modal popups, no exit-intent, no chatbot. Top-school ICP is sophisticated and recoils from these.
- No paid ads landing variants yet. Validate organic conversion first.
