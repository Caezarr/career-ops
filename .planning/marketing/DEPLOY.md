# Career OS — Deploy Guide

Steps to take the landing + Reels infra live, FR-first beta capture mode.

---

## 1. Domain — 10 minutes

`careeros.fr` ou `careeros.app`. **Mon vote : `careeros.app`** parce qu'on basculera US à M3 si traction.

```
1. Cloudflare → Domains → Register
2. Add `careeros.app` (~$10/yr)
3. DNS auto-managed → no config needed
```

Si `careeros.app` est pris : `careeros.fr`, `career-os.app`, `careeros.io`, `getcareeros.com`. Évite `tryX`, `useX`, `goX` — démodés et mauvaise SEO.

---

## 2. Loops setup — 15 minutes

Loops vs Resend pour la beta : **Loops gagne en solo** parce que le drip campaign + le double-opt-in + l'analytics sont natifs. Resend est mieux quand tu codes ton propre backend.

```
1. Sign up sur https://loops.so (free tier = 1000 contacts)
2. Créer un Form Block :
   Audience → Forms → Create new form
   Name: "Career OS Waitlist FR"
   Fields: email (required)
3. Récupérer l'URL du form (`https://app.loops.so/api/newsletter-form/<form-id>`)
4. Configurer le drip de bienvenue :
   Loops → Loops → New loop
   Trigger: form submission
   Email 1 (immediate) :
     Subject: "Bienvenue dans la beta Career OS"
     Body: "Salut, c'est Gabriel. Tu es #N dans la file. La beta s'ouvre par vagues — on t'envoie le DMG quand ton tour arrive (maximum 7 jours). En attendant, si tu veux avancer dans la file : partage ton lien {{referralLink}} (3 amis = accès anticipé)."
   Email 2 (24h delay) :
     Subject: "Une question avant qu'on t'envoie l'app"
     Body: 60s Loom face caméra où tu demandes ce qu'ils visent. Ce mail double le NPS plus tard.
   Email 3 (jour J du DMG) :
     Subject: "Ton DMG Career OS"
     Body: lien DMG + Loom de 90s "premier lancement, 3 trucs à faire en 5 min"
```

Setup time : ~30 min pour les 3 mails + drip.

---

## 3. Landing deploy — 10 minutes

```bash
# 1. Locally — verify the build
cd landing
pnpm install
pnpm build

# 2. Push the branch
git push origin chore/sec-marketing-landing
```

```
3. Cloudflare → Pages → Create a project → Connect to Git
4. Repository: career-ops
5. Production branch: main (we'll merge first) OR chore/sec-marketing-landing for preview deploy
6. Build settings:
   - Framework preset: None
   - Build command: cd landing && pnpm install && pnpm build
   - Output directory: landing/dist
   - Root: blank
7. Env vars (Production):
   - VITE_WAITLIST_ENDPOINT=https://app.loops.so/api/newsletter-form/<form-id>
   - VITE_WAITLIST_FORM=loops
8. Save → first deploy fires automatically
9. Custom domain: careeros.app → Cloudflare auto-issues SSL
```

Cloudflare auto-deploys on every push to the linked branch. Preview URLs spin up on every PR — useful for landing copy iterations.

---

## 4. Demo video — 30 minutes

Capture du dashboard pour le bloc Demo de la landing :

```bash
# 1. Lance l'app localement
cd /Users/gabriel/Desktop/Wonka/code/interview-copilot
pnpm tauri dev

# 2. Dans un terminal séparé, prépare un état "demo-ready"
#    - Au moins 6 jobs ingérés visibles
#    - 3-4 applications dans le pipeline
#    - 1 CV avec un score ATS calculé
#    - L'overlay Copilot ouvert mais en idle

# 3. Capture
#    Cmd+Shift+5 → "Record Selected Portion"
#    Sélectionne la fenêtre Career OS (1920×1200 idéal)
#    Joue un workflow : ouvrir un job → analyse match → drag-drop pipeline → ouvrir Copilot
#    12 secondes max
```

Encode pour le web :

```bash
ffmpeg -i raw.mov \
  -vf "scale=1080:-2" \
  -an \
  -movflags +faststart \
  -c:v libx264 -preset slow -crf 22 \
  landing/public/demo.mp4
```

Push, redéploiement auto Cloudflare, le placeholder devient une vraie démo.

---

## 5. Reels pipeline — première semaine

Une fois Loops + landing live :

```bash
cd remotion
pnpm install

# Étape 1 : Vendredi soir (30 min)
# Édite data/week-01.json — déjà rempli avec 14 hooks pour démarrer.
# Tu modifies les hooks à ton gusto, ou tu gardes tels quels pour la première semaine.

# Étape 2 : Samedi matin (15 min wall-clock, ~7 min CPU)
pnpm batch
# 14 MP4 dans out/

# Étape 3 : Submagic (30 min)
# Drag-drop les 14 MP4 dans https://submagic.co
# "Auto subtitles" en français → corrige les 2-3 mots mal détectés
# Export TT 9:16 → reformat IG Reels en un clic
# Download les 14 final.mp4

# Étape 4 : TikTok scheduler (15 min)
# TikTok Studio → Upload → schedule 21 slots × 7 jours
# 8h00, 12h30, 20h30 chaque jour
# Caption template :
#   [hook accroché en 4 mots]
#   [1 phrase context]
#   .
#   .
#   .
#   Beta Career OS · lien en bio
#   #CareerOS #McKinsey #HEC #ESCP #stage #M2 #emploi
#   (8-12 hashtags FR career, pas les 30 cramés US)

# Étape 5 : Instagram cross-post
# Settings → "Recommend Reels on Facebook" + "Share to Reels" auto
# OU manuel : Meta Business Suite → schedule mêmes 21 slots
```

Total samedi : ~1h30. Reste de la semaine : 0 minute sur le contenu, tu réponds aux DMs et tu codes.

---

## 6. Mesure — Notion dashboard

Crée un Notion table avec ces colonnes :

| Date | Reel id | Format | Vues | Likes | Saves | Bio clicks | Waitlist signups | Activated week-1 cumul |
|------|---------|--------|------|-------|-------|------------|------------------|------------------------|

Remplis chaque soir avant 22h30, **5 min max**.

**Décisions hebdo (dimanche soir, 15 min)** :
1. Top 2 formats par save rate → on en fait plus la semaine d'après
2. Top 2 hooks par bio clicks → on les recycle
3. Pillier qui converti en signup → +2 Reels la semaine d'après

---

## 7. Premier post — checklist J-Day

Avant de poster le premier Reel, vérifie :

- [ ] Domain pointe sur Cloudflare Pages (test : `curl -I https://careeros.app`)
- [ ] Form Loops accepte les submissions (test : soumets une vraie email, regarde dans Loops dashboard)
- [ ] Drip email #1 part bien dans les 60s (test : check ta boîte)
- [ ] Bio TT/IG pointe sur `https://careeros.app`
- [ ] Le Reel a un hook qui tient en 1.5s (preview en muet, le hook lit-il sans son ?)
- [ ] Caption < 150 caractères, finit par CTA
- [ ] Hashtags FR career : `#hec #escp #polytechnique #mines #m2 #stage #consulting #finance` (8-12 max)
- [ ] Schedule 8h00 ou 12h30 — 20h30 c'est le slot premium, garde-le pour le format qui a déjà marché

---

## 8. Quand pivoter — décision gates

Toutes les check-ins se font dimanche soir, basés sur le tableau Notion.

| À J7 | À J14 | À J30 | Action |
|------|-------|-------|--------|
| <500 vues moyennes | <500 | <500 | **Hook cassé.** Revenir à la banque, choisir 5 hooks NON testés, refaire le batch suivant avec ceux-là uniquement. |
| Vues OK, 0 bio click | <0.5% bio CTR | <1% | **CTA cassé** ou disconnect Reel ↔ landing. Revoir le pillier. |
| Bio clicks OK, <10 signups | <30 | <100 | **Landing cassée.** Vérifier mobile-friendly, vérifier le form Loops. |
| Signups OK, <3 activated | <8 | <30 | **DMG ou onboarding cassé.** Loom vidéo 90s à refaire ; demande un retour vidéo Loom à un beta user. |

**Ne pivot JAMAIS sur 2 axes en même temps.** Tu changes le hook OU la landing OU le DMG flow, jamais deux à la fois — sinon tu sauras pas quel changement a marché.

---

## 9. Quand scaler

Si à J14 tu as :
- ≥ 1 Reel à 50k+ vues
- ≥ 200 waitlist signups
- ≥ 5 DMs spontanés "comment je teste ?"

Alors tu es en product-content fit. Bascule en mode scale :
- 4 Reels/jour au lieu de 3 (édite `data/week-XX.json` à 28 entries)
- Réponds à chaque DM avec une invitation beta directe
- Tourne 1 Reel "user testimonial" / semaine — UGC d'un beta user qui partage sa story (avec permission)
- Évalue T2 paid creator (€500-3k pour un macro avec audience career FR ciblée HEC/ESCP/Poly)

---

## 10. Stack actuelle — récap

| Composant | Tech | Coût | Statut |
|---|---|---|---|
| Landing | Vite + React + TS | $0 | ✅ Built, 64.5kB gzip |
| Email capture | Loops free tier | $0 (≤1000 contacts) | À setup |
| Domain | Cloudflare Registrar | ~$10/an | À acheter |
| Hosting | Cloudflare Pages | $0 | À connecter |
| Reels generation | Remotion local | $0 | ✅ 3 templates ready |
| Sub-titles + reformat | Submagic | $20/mo | À s'inscrire avant le 1er post |
| Scheduler | TikTok Studio + Meta natif | $0 | OK |
| Analytics | TikTok native + Notion table | $0 | OK |

**Coût total mensuel : $20** (uniquement Submagic).

Pas un dollar d'ads avant J60 minimum.
