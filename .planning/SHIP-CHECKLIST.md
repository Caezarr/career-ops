# Career OS — Beta Ship Checklist

État au 10 mai 2026. Coche au fur et à mesure. Ne pas shipper aux beta-users tant que la section "BLOQUANTS" n'est pas 100% verte.

---

## 🔴 BLOQUANTS — sans ça l'app ne fonctionne pas pour les utilisateurs

### Infrastructure externe

- [ ] **Apple Developer Program** ($99/an)
  - https://developer.apple.com/programs/enroll/
  - Validation manuelle Apple : 24-48h → **lance en premier**
  - Sans ça, le DMG est bloqué par Gatekeeper sur la machine des beta-users

- [ ] **Domaine `careeros.app`** (~10€/an)
  - Cloudflare Registrar : https://dash.cloudflare.com/?to=/:account/registrar
  - DNS auto-géré, rien à configurer côté NS

- [ ] **Loops sending domain**
  - app.loops.so → Settings → Sending Domain → `mail.careeros.app`
  - Ajouter les 3 records SPF/DKIM/DMARC dans Cloudflare DNS
  - Verify (~5 min)

- [ ] **Loops Transactional template**
  - Dashboard → Transactional → New → "Magic link · Career OS"
  - Variables : `magicLink`, `email` (cf. `.planning/AUTH.md` §2)
  - Subject : "Ton lien de connexion Career OS"
  - Récupère l'API key + le transactional ID

### Worker Cloudflare prod

```bash
cd worker
# Secrets prod (les 4 obligatoires)
openssl rand -base64 48 | npx wrangler secret put JWT_SECRET
npx wrangler secret put ANTHROPIC_API_KEY        # ta clé sk-ant-...
npx wrangler secret put LOOPS_API_KEY            # depuis Loops Settings
npx wrangler secret put LOOPS_TRANSACTIONAL_ID   # ID du template

# Migrations prod (déjà fait : 0001 + 0002)
pnpm db:migrate:prod   # idempotent

# Custom domain — Cloudflare Dashboard → Workers → career-os-api →
# Settings → Triggers → Add Custom Domain → "api.careeros.app"
# Décommente `routes` dans wrangler.toml après config DNS

# Deploy
pnpm deploy
curl https://api.careeros.app/health   # → {"ok":true}
```

- [ ] Tous les `wrangler secret put` ✓
- [ ] `pnpm deploy` réussit
- [ ] `/health` répond `{"ok":true}` sur le domaine custom

### App signée + notarisée Apple

```bash
# 1. Génère la keypair updater (à faire UNE fois)
pnpm tauri signer generate -- -w ~/.tauri/career-os.key
# → Note la PUBKEY affichée

# 2. Colle la pubkey dans tauri.conf.json
# Remplace REPLACE_WITH_TAURI_SIGNER_GENERATE_PUBKEY par la chaîne base64

# 3. Configure les secrets de signing Apple
# (après validation Apple Developer)
# - Apple Team ID : trouvable sur developer.apple.com/account
# - App password : appleid.apple.com → "Mots de passe spécifiques aux apps"
# Documenter ces secrets dans 1Password / un .env.signing local
```

- [ ] Keypair updater générée + pubkey collée dans `tauri.conf.json::plugins.updater.pubkey`
- [ ] Apple Team ID + App password configurés
- [ ] `tauri.conf.json::bundle.macOS.signingIdentity` = ton certificat Developer ID
- [ ] Build signé + notarisé : `pnpm tauri build` → DMG passe Gatekeeper sur une autre machine
- [ ] Test : `xcrun stapler validate "src-tauri/target/release/bundle/dmg/Career OS_*.dmg"` → "The validate action worked!"

### Stripe en mode Live

- [ ] Toggle "Test mode" → off dans dashboard Stripe
- [ ] Note les **Live API keys** (`sk_live_...`, `pk_live_...`, `whsec_...`)
- [ ] Crée un **Product "Career OS Annual"** → Price 150€/an recurring
- [ ] Note le `price_xxx` (sera utilisé côté frontend dans `BillingTab.tsx`)
- [ ] Webhook prod → `https://api.careeros.app/v1/billing/webhook` (signing secret en `wrangler secret put STRIPE_WEBHOOK_SECRET`)
- [ ] Test paiement E2E avec une vraie carte (puis refund)

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
