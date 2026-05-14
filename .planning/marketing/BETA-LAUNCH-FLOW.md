# Beta launch flow — Career OS

Walkthrough complet pour passer de "code prêt" à "10 premiers users qui paient" en 1-2 semaines. Toutes les étapes sont chronologiques, dépendances claires.

---

## Phase A — Loops templates (60 min)

4 templates à uploader dans https://app.loops.so. **Tout le contenu HTML vit
dans le repo** sous `.planning/marketing/emails/<template>/index.mjml`.
Loops accepte des ZIP MJML — c'est le canal officiel pour les custom emails
([Loops docs](https://loops.so/docs/creating-emails/uploading-custom-email)).

> **Workflow** :
> ```bash
> # Build des 4 ZIPs prêts à uploader
> ./.planning/marketing/emails/build.sh
>
> # → .planning/marketing/emails/build/welcome-lifetime.zip
> # → .planning/marketing/emails/build/welcome-lifetime-pro.zip
> # → .planning/marketing/emails/build/refund-requested.zip
> # → .planning/marketing/emails/build/beta-accepted.zip
> ```
>
> Spec complète + cheat sheet branding + variables :
> [`.planning/marketing/emails/README.md`](./emails/README.md).

> **Deux changements d'architecture** vs la première version de cette doc :
> 1. **2 templates Welcome séparés** (Lifetime + Lifetime Pro) au lieu d'un
>    avec un `{{#if}}` — Loops MJML n'accepte pas les Handlebars conditionnels.
>    Le Worker choisit le template selon `plan`.
> 2. **Syntaxe variables Loops** : `{DATA_VARIABLE:userEmail}` (single-brace,
>    avec préfixe), pas `{{userEmail}}` Handlebars.

### 1. `WelcomeLifetime` — confirmation post-paiement (sans garantie)

**Trigger** : Stripe webhook `checkout.session.completed` quand `plan === "lifetime"`.

**Source MJML** : `.planning/marketing/emails/welcome-lifetime/index.mjml`

**Data variables** :
- `userEmail` — string

**Subject** suggéré (à régler dans le template Loops) : `Bienvenue dans Career OS 🎉`

Build → upload :
```bash
./.planning/marketing/emails/build.sh welcome-lifetime
```
Loops → **Templates** → "WelcomeLifetime" (nouveau template Transactional) → **Code** → drag-drop `build/welcome-lifetime.zip` → **Upload**.

Copie le **Transactional ID** (`cm…`).

### 2. `WelcomeLifetimePro` — confirmation post-paiement (avec garantie)

**Trigger** : Stripe webhook `checkout.session.completed` quand `plan === "lifetime_pro"`.

**Source MJML** : `.planning/marketing/emails/welcome-lifetime-pro/index.mjml`

**Data variables** :
- `userEmail` — string
- `refundDeadline` — date FR (`"13 novembre 2026"`)

**Subject** : `Bienvenue dans Career OS Pro 🎉`

Build → upload :
```bash
./.planning/marketing/emails/build.sh welcome-lifetime-pro
```
Loops → **Templates** → "WelcomeLifetimePro" (nouveau template Transactional) → **Code** → drag-drop `build/welcome-lifetime-pro.zip` → **Upload**.

Copie le **Transactional ID**.

### 3. `RefundRequested` — accusé réception remboursement

**Trigger** : `POST /v1/billing/refund` fire automatiquement.

**Source MJML** : `.planning/marketing/emails/refund-requested/index.mjml`

**Data variables** :
- `userEmail` — string
- `daysSincePurchase` — number
- `deadlineAt` — date FR

**Subject** : `Demande de remboursement reçue — sous 5 jours ouvrés`

Build → upload :
```bash
./.planning/marketing/emails/build.sh refund-requested
```
Loops → **Templates** → "RefundRequested" → **Code** → drag-drop `build/refund-requested.zip` → **Upload**.

Copie le **Transactional ID**.

### 4. `BetaAccepted` — invitation à installer (campagne manuelle)

**Pas de trigger Worker** — tu l'envoies depuis Loops Audiences quand tu acceptes un candidat.

**Source MJML** : `.planning/marketing/emails/beta-accepted/index.mjml`

**Contact properties** (pas data variables — c'est une campagne) :
- `firstName`
- `downloadUrl`
- `betaCode`
- `earlyBirdPrice`

**Subject** : `Tu es accepté dans la beta Career OS`

Build → upload :
```bash
./.planning/marketing/emails/build.sh beta-accepted
```
Loops → **Templates** → "BetaAccepted" (template Campaign cette fois, pas Transactional) → **Code** → drag-drop `build/beta-accepted.zip` → **Upload**.

**Pas besoin de copier l'ID** — envoi via Audiences → Send Campaign.

---

## Phase B — Configurer Worker (5 min)

Une fois les 3 Transactional IDs copiés (les 2 Welcome + Refund), set-les comme secrets Wrangler :

```bash
cd /Users/gabriel/Desktop/Wonka/code/interview-copilot/worker

pnpm dlx wrangler secret put LOOPS_TEMPLATE_WELCOME_LIFETIME
# paste l'ID du template WelcomeLifetime

pnpm dlx wrangler secret put LOOPS_TEMPLATE_WELCOME_PRO
# paste l'ID du template WelcomeLifetimePro

pnpm dlx wrangler secret put LOOPS_TEMPLATE_REFUND_REQUESTED
# paste l'ID du template RefundRequested

pnpm run deploy
```

Test :
```bash
# Re-trigger un Stripe Checkout en Test mode pour valider
# le webhook → Welcome email. Une fois en plan="lifetime",
# une fois en plan="lifetime_pro" pour valider les 2 templates.
# Voir .planning/STRIPE-SETUP.md §6 pour la procédure.
```

---

## Phase C — Liste d'attente + acceptance manuelle (10 min)

### Lister les candidatures bêta en attente

La landing capture les emails dans Loops (Audience "Career OS waitlist").
Pour les voir :

1. https://app.loops.so → **Audiences** → "Career OS waitlist" (ou le nom de ton audience)
2. Filtre par date d'inscription
3. Tu vois les `firstName`, `email`, `target` (consulting / IB / tech / etc.) capturés à l'inscription

### Accepter X candidats / semaine

**Pas d'automation** au démarrage — process manuel zéro-budget :

1. Sélectionne 10-20 candidats dans l'audience Loops
2. **Send Campaign** → choisis le template `BetaAccepted`
3. Loops envoie en batch avec les bonnes variables (`firstName` issu de l'inscription)
4. Une fois envoyé, **tag** les candidats acceptés (Loops Audience tags) pour pas les renvoyer

**Critères de sélection ICP** (à appliquer à l'œil sur les 20 premiers) :
- École : HEC / ESCP / ESSEC / Polytechnique / Sciences Po / X / Mines / Centrale (priorité)
- Target : Conseil (MBB / T2), IB / PE / VC, Tech (FAANG / AI labs)
- Email pro / école (pas yahoo.com / gmail random)

20 premiers accepts → focus sur ICP pur. 50+ → on élargit.

---

## Phase D — Onboarding QA (30 min)

Avant d'inviter, fais le parcours toi-même comme un nouveau user :

1. Supprime le compte test précédent :
   ```bash
   cd worker && pnpm dlx wrangler d1 execute career_os --remote --command \
     "DELETE FROM users WHERE email_lower='gabranpro@gmail.com';"
   ```

2. Réinstalle Career OS depuis la DMG la plus récente sur un Mac vierge (ou
   `rm -rf ~/Library/Application Support/com.caezarr.career-ops` pour reset le state local)

3. Lance l'app → magic link auth → onboarding wizard 6 steps :
   - StepIdentity (prénom + école)
   - StepTargets (cibles métier)
   - StepBackground (séniorité + géo)
   - StepFirstCV (upload PDF — vérifie OCR Docling)
   - StepNarrative (story personnelle)
   - StepFirstSource (JT login OU skip)

4. Vérifie qu'il atterrit sur Dashboard avec stats vides + état "encourage à ajouter une source"

5. Test rapide du flow conversion Free → Pro :
   - Settings → Billing → "Acheter · 99€" → Stripe Test card 4242 4242 4242 4242
   - Retour app deep-link → toast "Bienvenue dans Career OS Pro 🎉"
   - Mail Welcome Pro reçu sous 30s
   - Settings → Billing : plan = "Lifetime", boutons upgrade cachés

Si quoi que ce soit pète → corrige avant d'inviter les 10 users.

---

## Phase E — LinkedIn launch post (jour J)

### Draft (à publier sur ton compte perso + page Career OS s'il y en a une)

> 🚀 J'ouvre Career OS en bêta privée.
>
> Pendant 4 mois j'ai postulé à 80 boîtes (McKinsey, Goldman, Anthropic, des startups Series B).
>
> 12 onglets en permanence. 10h par semaine perdues à coordonner Notion + Excel + Calendar + ChatGPT.
>
> J'ai construit l'OS de carrière qui m'aurait fait gagner 250h.
>
> Career OS = une seule app Mac pour :
> • Sourcer les bonnes annonces (filtres fins MBB / IB / FAANG / AI labs)
> • Adapter ton CV en 2 min avec score ATS > 90
> • Briefer chaque entretien (12 questions probables, réponses STAR)
> • Live Copilot pendant l'entretien (transcription + suggestions ancrées dans TON CV)
> • Plan d'actions quotidien + relances automatiques
>
> Bêta privée : 20 places / semaine. Réponse sous 7 jours.
>
> Lifetime : 99€ paiement unique (pas d'abonnement).
> Lifetime + Garantie : 149€ — 0 entretien après 180j = remboursé intégralement.
>
> Candidate ici → https://careeros.fr
>
> Pourquoi ça t'intéresse :
> - Tu vises McKinsey, BCG, Bain, Goldman, JPMorgan, Anthropic, OpenAI ou une Series B
> - Tu envoies 5+ candidatures par semaine
> - Tu veux un système, pas un autre tracker Notion
>
> Drop a 🎯 in the comments si tu candidates — je regarde manuellement.

### Visuels à attacher

1 carrousel 5 slides + 1 visuel hero :
- **Slide 1** : screenshot Pipeline app (charge demo seed avant — 40 cards)
- **Slide 2** : screenshot Live Copilot (session active Bain + transcript)
- **Slide 3** : screenshot CV Optimizer (score ATS 94 + suggestions)
- **Slide 4** : Avant / Après (le visuel du landing BeforeAfter)
- **Slide 5** : CTA "Candidate sur careeros.fr"

Le visuel hero = la cap Hero de la landing (300h gradient).

### Quand poster

- **Mardi ou jeudi**, 8h-9h ou 17h-19h heure FR
- **Pas** lundi matin (overload Linkedin), pas vendredi après-midi (déjà mentalement WE)

### Après le post

- Réponds à TOUS les commentaires dans la première heure (LinkedIn boost les posts qui génèrent de l'engagement précoce)
- DM les contacts pertinents qui likent (HEC, ESCP, ESSEC, X) pour leur dire "je vois que tu likes — tu vises quoi ?"
- 24h plus tard : commente toi-même avec un update ("Déjà 50 candidatures, 12 acceptés ce matin — il reste 8 places cette semaine")

---

## Phase F — Mesurer (chaque semaine)

À regarder dans Cloudflare Web Analytics + Loops + Stripe Dashboard :

| Métrique | Cible semaine 1 | Cible semaine 4 |
|---|---|---|
| Visiteurs `careeros.fr` | 200 | 1000 |
| Candidatures bêta | 30 | 150 |
| Acceptés invités | 20 | 80 |
| Installs DMG | 15 | 60 |
| Onboarding terminé | 12 | 50 |
| Conversions Pro (Lifetime / Lifetime+Garantie) | 1-2 | 8-15 |
| Demandes de remboursement | 0 | 0-1 |

Si conversion Pro < 5% des onboardés → le pricing / value-stack a un problème. Si remboursement > 5% → le produit ne tient pas la promesse, on creuse.

---

## Phase G — Quand passer à Stripe Live

Une fois validé en Test mode (au moins 3 paiements complets + 1 webhook réussi + 1 mail Welcome Pro reçu) :

1. Stripe Dashboard → switch Live mode
2. Compléter business profile (SIRET + IBAN + ID)
3. Recréer les 2 Products (99€ + 149€) en Live
4. Récupérer les Live Price IDs + Live API keys + Live webhook secret
5. Update wrangler secrets :
   ```bash
   cd worker
   pnpm dlx wrangler secret put STRIPE_SECRET_KEY      # sk_live_…
   pnpm dlx wrangler secret put STRIPE_WEBHOOK_SECRET  # nouveau whsec_…
   ```
6. Update `wrangler.toml` avec les Live Price IDs
7. `pnpm run deploy`

Test final en Live avec ta propre carte (que tu te rembourseras manuellement).

Bienvenue en prod.
