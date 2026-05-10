# Career OS — Beta Ship Checklist

État au 10 mai 2026.

Deux paths possibles :
- **🪙 Beta Zero-Budget** (recommandé pour valider le produit) — 0€ + crédit Anthropic au prorata
- **💳 Beta Production-Grade** (after Zero-Budget validation) — ~150€ initial puis 0,3€/an

Le **Zero-Budget** sacrifie : signature Apple, domaine custom, paiement réel. Tout le reste fonctionne identiquement. Tu peux shipper aux 10-20 premiers beta users dans cette config, puis upgrader vers Production-Grade quand tu as validé que les utilisateurs en redemandent.

---

## 🪙 Path A — Beta Zero-Budget (recommandé maintenant)

### A.1. Cloudflare Worker sans domaine custom

```bash
cd worker
# Secrets prod (les 4 obligatoires)
openssl rand -base64 48 | npx wrangler secret put JWT_SECRET
npx wrangler secret put ANTHROPIC_API_KEY        # ta clé sk-ant-...
npx wrangler secret put LOOPS_API_KEY            # depuis Loops Settings (free tier OK)
npx wrangler secret put LOOPS_TRANSACTIONAL_ID

# Migrations prod (déjà fait : 0001 + 0002 — sinon :
pnpm db:migrate:prod   # idempotent

# Deploy → Cloudflare te donne une URL gratuite :
#   https://career-os-api.<ton-account>.workers.dev
pnpm deploy
```

**Important** : note ton URL `https://career-os-api.<account>.workers.dev`. Tu vas l'utiliser :
1. Dans `wrangler.toml::[vars] WEB_BASE_URL` → remplace `https://api.careeros.app` par ta vraie URL workers.dev
2. Dans le frontend `.env.local` → `VITE_API_BASE_URL=https://career-os-api.<account>.workers.dev`
3. Re-deploy : `pnpm deploy`

```bash
curl https://career-os-api.<account>.workers.dev/health   # → {"ok":true}
```

- [ ] Worker déployé sur `*.workers.dev`
- [ ] Tous les `wrangler secret put` ✓
- [ ] `WEB_BASE_URL` dans wrangler.toml pointe sur l'URL workers.dev
- [ ] `/health` répond `{"ok":true}`

### A.2. Loops sur leur sous-domaine par défaut

Loops free tier permet d'envoyer depuis leur domaine `*.loops.so` sans valider ton propre domaine. Les emails arrivent parfois en spam, mais ça suffit pour 10-20 beta-users à qui tu auras prévenu.

- [ ] Compte Loops créé (gratuit, jusqu'à 1000 emails/mois)
- [ ] Template Transactional créé avec variables `magicLink` + `email`
- [ ] From email : laisse leur `noreply@loops.so` par défaut, ou configure un alias gratuit type `careeros@send.loops.so` selon leur UI
- [ ] LOOPS_API_KEY + LOOPS_TRANSACTIONAL_ID set comme secrets Worker

### A.3. App non-signée distribuée via GitHub Releases

Sans Apple Developer Program, l'app n'est pas signée. macOS Gatekeeper la bloquera au premier lancement. **Workaround utilisateur** : right-click sur l'app → "Open" → confirmer.

```bash
# Build local — produit le DMG dans src-tauri/target/release/bundle/dmg/
pnpm tauri build

# Pousse sur GitHub Releases (compte GitHub gratuit)
gh release create v0.0.1 \
  "src-tauri/target/release/bundle/dmg/Career OS_0.0.1_aarch64.dmg" \
  --notes "First beta release. Sign in via magic link, generate CVs, prep interviews."

# Le worker /v1/updates le détecte automatiquement (cf. routes/updates.ts)
```

- [ ] DMG buildé localement avec `pnpm tauri build`
- [ ] Premier release `v0.0.1` poussé sur GitHub avec `gh release create`
- [ ] README + landing page documentent le workaround Gatekeeper (right-click → Open)
- [ ] **Note** : pas de keypair updater pour la beta zero-budget — les updates fonctionneront mais sans vérification de signature (Tauri émet juste un warning). On active la signature quand on passe Production-Grade.

### A.4. Pas de Stripe — beta gratuite

Pour la beta zero-budget, pas de paiement. **Toutes les fonctionnalités IA sont accessibles** aux signed-in users — c'est ton crédit Anthropic qui paye. Les rate-limits applicatifs (`5/30/30/10/jour`) gardent le coût borné.

**Coût pour toi** : à 50 beta-users actifs avec usage réaliste (~5€/jour total Anthropic), ça fait ~150€/mois. Si ça décolle, tu bumps vers Production-Grade.

- [ ] Settings → Billing dans l'app : afficher "Beta — accès complet sans abonnement" en remplaçant le bouton "S'abonner"
- [ ] Surveiller le dashboard Anthropic Usage daily

### A.5. Landing page + download

Cloudflare Pages = gratuit, illimité.

```bash
cd landing
pnpm build
# Cloudflare Pages : connecte le repo → branch `main` → output `landing/dist`
```

URL gratuite : `https://career-os.pages.dev` (ou similaire). Lien download → GitHub Releases page directement (`https://github.com/Caezarr/career-ops/releases/latest`).

- [ ] Cloudflare Pages connecté → auto-deploy on push
- [ ] Hero CTA → lien GitHub Releases
- [ ] Footer → liens `/privacy.md` + `/terms.md`
- [ ] Page d'aide "Premier lancement" expliquant le right-click → Open

### A.6. Coûts attendus

| Poste | Free tier | Coût réel |
|-------|-----------|-----------|
| Cloudflare Worker | 100k req/jour gratuit | 0€ |
| Cloudflare D1 | 5GB gratuit | 0€ |
| Cloudflare Pages | Illimité | 0€ |
| Loops | 1000 emails/mois gratuit | 0€ |
| GitHub Releases | Illimité public | 0€ |
| Anthropic | Pay-per-call | **~3-5€/utilisateur actif/mois** |

**Total beta 50 users actifs : ~150€/mois.** Tu peux ajuster les rate-limits dans `worker/src/lib/rateLimit.ts::RATE_LIMITS` si le coût explose.

---

## 💳 Path B — Production-Grade (après validation Zero-Budget)

À déclencher quand : 10+ users actifs te demandent l'app, ou tu veux passer payant.

### B.1. Apple Developer Program ($99/an)
- https://developer.apple.com/programs/enroll/
- Validation 24-48h
- Permet : signature DMG (plus de Gatekeeper warning) + notarization + auto-update vérifié

### B.2. Domaine `careeros.app` (~10€/an)
- Cloudflare Registrar
- Custom domain `api.careeros.app` → Worker
- Custom domain `careeros.app` → Cloudflare Pages

### B.3. Loops sending domain
- `mail.careeros.app` validé (SPF/DKIM/DMARC dans Cloudflare DNS)
- Emails partent depuis ton propre domaine = beaucoup moins de spam

### B.4. Stripe live + price 150€/an
- Toggle "Test mode" → off
- Product "Career OS Annual" → Price 150€/an recurring
- Webhook prod → `https://api.careeros.app/v1/billing/webhook` (signing secret en `wrangler secret put STRIPE_WEBHOOK_SECRET`)
- Coller le `price_xxx` côté frontend (`VITE_STRIPE_PRICE_ID`)

### B.5. Keypair updater + signing identity
```bash
pnpm tauri signer generate -- -w ~/.tauri/career-os.key
# Note la PUBKEY → coller dans tauri.conf.json::plugins.updater.pubkey
# Configure tauri.conf.json::bundle.macOS.signingIdentity = ton certif Developer ID
# Test : pnpm tauri build → DMG passe Gatekeeper sur autre machine
```

### B.6. Mise à jour des coûts
| Poste | Coût |
|-------|------|
| Apple Developer | 99 $/an = ~92€/an |
| Domaine careeros.app | ~10€/an |
| Reste (CF + Loops + GitHub) | gratuit |
| **Total** | **~102€/an** + crédit Anthropic au prorata des paying users |

---

## 🟡 IMPORTANT — UX dégradée si manquant

### Auto-update pipeline

- [ ] GitHub Release process documenté dans le repo
- [ ] (Optionnel) GitHub Action qui auto-release sur tag `v*` :
  - build signed DMG
  - sign avec la `.tauri/career-os.key`
  - `gh release create` avec le DMG + .sig
- [ ] Vérifier qu'après bump `tauri.conf.json::version`, le worker remonte bien le manifest

### Landing page hébergée

```bash
cd landing
pnpm build
# Cloudflare Pages : connect repo → auto-deploy on push
```

- [ ] Cloudflare Pages branche le repo, auto-deploy sur push `main`
- [ ] Custom domain `careeros.app` → DNS A/CNAME → Pages
- [ ] Demo video uploadée (`landing/public/demo.mp4`)
- [ ] Lien download DMG pointant sur le DMG signé hébergé (S3 ? Cloudflare R2 ? GitHub Releases ?)
- [ ] Liens vers `/privacy.md` + `/terms.md`

### Privacy / ToS

- [x] `landing/public/privacy.md` — Politique de confidentialité FR
- [x] `landing/public/terms.md` — Conditions Générales d'Utilisation FR
- [ ] **Mettre à jour le SIRET** dans `privacy.md` après immatriculation (placeholder actuel)
- [ ] Lien dans le footer de la landing
- [ ] Lien dans Settings → Account de l'app

### Rate-limit Cloudflare edge

- [ ] Cloudflare Dashboard → Workers & Pages → career-os-api → Settings → Rate Limit
- [ ] Règle 1 : `/auth/request` → 10 req/min/IP
- [ ] Règle 2 : `/v1/ai/*` → 60 req/min/IP (en complément du rate-limit applicatif user-scoped)

---

## 🟢 NICE-TO-HAVE — peut suivre après v1 beta

- [ ] Sentry frontend + worker (errors → dashboard)
- [ ] Magic-link cleanup cron (sweep `consumed_at < now-24h`)
- [ ] Auto-updater hook frontend (`useAutoUpdate` — en attente de la pubkey + 1ère release)
- [ ] Compte deletion endpoint (manuel via wrangler d1 execute pour l'instant)
- [ ] Backup D1 régulier (Cloudflare D1 backup auto en plan paid)
- [ ] App icon polished (les icônes actuelles sont les placeholders Tauri)
- [ ] Phase 2 cloud sync (snapshots push/pull pour multi-device — table `snapshots` déjà en place)
- [ ] "Rename Anthropic key card → Sign in" UX polish dans AnalyzeMatchModal (KeyMissingPrompt utilise le mauvais wording maintenant)

---

## ⏰ Timing recommandé

| Jour | Tâches |
|------|--------|
| **Lundi** | Lance Apple Developer (24-48h validation) + achète domaine + setup Cloudflare DNS |
| **Mardi** | Loops domain + template + secrets worker prod + `pnpm deploy` + custom domain `api.careeros.app` |
| **Mercredi** | Quand Apple valide → keypair updater + signing identity + premier `pnpm tauri build` notarisé |
| **Jeudi** | Stripe live + webhook + test paiement E2E |
| **Vendredi** | Landing deploy + soft-launch sur 5-10 beta-users de confiance + monitor logs |

---

## Test E2E avant ship

Procédure complète sur une **autre machine** (ou un compte macOS différent) pour valider que tout fonctionne hors environnement dev :

1. Télécharger le DMG depuis `careeros.app/download` (lien public)
2. Drag-drop dans Applications → premier launch
3. Onboarding 6 étapes → écris narrative + upload CV
4. À l'étape Polish profile → loader 3-5s → markdown généré ✅
5. Settings → Account → "Recevoir le lien" → email arrive dans la boîte
6. Click le lien dans le mail (sur la même machine) → app revient au premier plan signed-in
7. Settings → Billing → "S'abonner" → checkout Stripe → return URL OK → status flip à "active"
8. CV page → "Optimize" → fetch worker → compile LaTeX local → PDF généré
9. Applications page → Add → "Generate next steps" → 3-5 actions affichées
10. Quitte l'app, modifie `tauri.conf.json::version` 0.0.1 → 0.0.2, build, release `v0.0.2` sur GitHub
11. Re-ouvre l'app v0.0.1 → check auto-updater détecte v0.0.2

Si un de ces 11 points échoue, **NE PAS SHIPPER** et fix d'abord.
