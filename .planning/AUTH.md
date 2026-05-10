# Career OS — Auth setup runbook

Phase 1 = magic-link auth via Cloudflare Worker + D1 + Loops Transactional. No OAuth providers (Apple / Google / Microsoft) yet — the magic link IS the anti-bot mechanism (a bot would need a real inbox to complete the flow).

This runbook is one-time setup for Gabriel as the maintainer. Each step is self-contained; you can resume mid-flow.

---

## 1. Cloudflare Worker (~10 min)

Prereq: Cloudflare account (free tier is enough).

```bash
cd worker
pnpm install
npx wrangler login
```

### Create the D1 database

```bash
npx wrangler d1 create career_os
```

Copy the `database_id` it prints. Paste it into `worker/wrangler.toml` under `[[d1_databases]] database_id = "..."`.

### Apply the migrations

```bash
pnpm db:migrate:prod
```

### Set the secrets

```bash
# 32+ random bytes, base64. Don't reuse across environments.
openssl rand -base64 48 | npx wrangler secret put JWT_SECRET

# From Loops → Settings → API. Use the *transactional* key.
npx wrangler secret put LOOPS_API_KEY

# Paste the Loops template id (created in step 2 below).
npx wrangler secret put LOOPS_TRANSACTIONAL_ID
```

### Deploy

```bash
pnpm deploy
```

Output ends with `https://career-os-api.<subdomain>.workers.dev`. Test it:

```bash
curl https://career-os-api.<subdomain>.workers.dev/health
# {"ok":true}
```

### Custom domain (optional, recommended)

In Cloudflare dashboard → Workers & Pages → career-os-api → Settings → Triggers → Custom Domains → Add Custom Domain → `api.careeros.app`. Cloudflare auto-issues the TLS cert.

Then uncomment the `routes` block in `wrangler.toml` and re-deploy.

---

## 2. Loops Transactional template (~5 min)

In [Loops](https://app.loops.so):

1. **Settings → API** → copy the transactional API key. (Use this in step 1's `LOOPS_API_KEY`.)
2. **Transactional** → New transactional → name it "Magic link · Career OS".
3. Required data variables (Loops will reject the API call if these aren't declared):
   - `magicLink`
   - `email`
4. Email body — minimal example (FR):

   ```
   Subject:  Ton lien de connexion Career OS

   Salut,

   Clique pour te connecter à Career OS :
   {{magicLink}}

   Le lien expire dans 15 minutes. Si tu n'es pas à l'origine de
   cette demande, ignore ce mail — personne d'autre ne peut s'en
   servir.

   — Career OS
   ```

5. Save → copy the **transactional id** (the one in the URL or the integration tab). Paste into step 1's `LOOPS_TRANSACTIONAL_ID`.

---

## 3. Tauri custom URL scheme (~5 min, code change)

The desktop app already declares `careeros://` as a deep-link target (see `src-tauri/tauri.conf.json` + `tauri-plugin-deep-link` registration in `lib.rs`). On macOS, the OS routes any link of the form `careeros://...` to Career OS via the URL scheme registered at install time.

After the worker is live, update `WEB_BASE_URL` in `wrangler.toml` to your custom domain (`https://api.careeros.app`) and re-deploy. The frontend reads `VITE_API_BASE_URL` to know where to POST `/auth/request`.

Add to `landing/.env.local` and the Tauri app's build env (whichever way you wire env vars in):

```
VITE_API_BASE_URL=https://api.careeros.app
```

---

## 4. Local dev (the loop you'll use most)

In one terminal:

```bash
cd worker
cp .dev.vars.example .dev.vars
# Edit .dev.vars with real Loops keys + a dev JWT_SECRET
pnpm db:migrate:local
pnpm dev   # Worker on http://localhost:8787
```

In another terminal:

```bash
cd /Users/gabriel/Desktop/Wonka/code/interview-copilot
VITE_API_BASE_URL=http://localhost:8787 pnpm tauri dev
```

The desktop app POSTs `http://localhost:8787/auth/request`. Loops sends a real email (don't worry — Loops's transactional flow doesn't bill in dev). Click the link → it hits `http://localhost:8787/auth/verify?token=…` → redirects to `careeros://auth/callback#jwt=…` → Tauri picks it up → JWT goes to Keychain.

For testing without Loops, replace the `sendMagicLinkEmail` call temporarily with `console.log(magicLink)` and copy/paste the URL from the Worker logs.

---

## 5. Operational

### Sign-out

The frontend's "Sign out" deletes the JWT from the Keychain. The token continues to be valid on the server until natural expiry (30 days). For revocation, we'd add a `denylist` table — not implemented in Phase 1, since the worst-case attack window is one device losing the JWT and Career OS data being stolen via `/me`. The `/me` endpoint reveals only `email + license_status + period_end`, which an attacker who can already exfiltrate the Keychain has by other means.

### Account deletion

Not yet shipped. Manual via:

```bash
npx wrangler d1 execute career_os --remote --command "DELETE FROM users WHERE email_lower = 'foo@bar.com'"
```

### Magic-link cleanup

Magic links accumulate in the DB. A nightly cron worker (separate Worker, separate task) will sweep `WHERE expires_at < now() - 24h`. Not in Phase 1 — table size is irrelevant at <1k users.

### Rate-limiting

Configure in Cloudflare dashboard → Workers & Pages → career-os-api → Settings → Triggers → "Rate Limit". Recommended: 10 requests / IP / minute on `/auth/request`.

---

## 6. Phase 2 hooks (sync) — coming next

Phase 2 adds:

- `POST /sync/push` — body: full snapshot JSON, gated by `requireAuth`
- `GET /sync/pull` — returns latest snapshot
- Frontend sync engine in `src/dashboard/lib/sync.ts` — debounce 5s on store mutations
- Settings → Account toggle "Sync data to cloud"

The `snapshots` table is already in `0001_init.sql` so no DB migration needed when Phase 2 lands.
