# Career OS — Reels (Remotion)

Programmatic TikTok / Instagram Reels generation. No camera, no microphone, no avatar — pure motion graphics in the Career OS brand. Same React + TypeScript stack as the landing page, same design tokens.

## Why programmatic

Tournage humain à 3 Reels/jour = 90+ tournages en 30 jours. C'est intenable en solo. Remotion :

- **0 minute de tournage** par Reel
- **~30 secondes par render** sur Mac Silicon (encode hardware H.264)
- **3 templates qui tournent en boucle** : Hot Take, Liste Rapide, Vérité Marché
- **JSON-driven** : tu écris 14 hooks dans `data/week-01.json` et tu lances `pnpm batch`. Output = 14 MP4 dans `out/` prêts pour Submagic.

## Setup

```bash
cd remotion
pnpm install
pnpm dev
```

Remotion Studio s'ouvre sur http://localhost:3000. Les 3 compositions sont visibles dans la sidebar — tu peux scrubber, éditer les `defaultProps` en live, exporter en un clic.

## Render

### Single composition

```bash
pnpm render HotTake out/test.mp4
pnpm render ListeRapide out/liste.mp4
pnpm render VeriteMarche out/verite.mp4
```

### Batch (le workflow recommandé)

1. Écris les 14 entries de la semaine dans `data/week-XX.json` (mime le format de `data/week-01.json`)
2. Lance le render :

```bash
pnpm batch                          # uses data/week-01.json
pnpm batch ./data/week-02.json      # custom path
```

Sortie : un MP4 par entry dans `out/<id>.mp4`. ~30s × 14 = ~7 min de render pour la semaine entière.

## Pipeline complet semaine type

```
Vendredi soir, 30 min
  └─ écrire data/week-XX.json (14 hooks dans la banque du PLAYBOOK)

Samedi matin, 15 min
  └─ pnpm batch
      → 14 MP4 dans out/

Samedi matin, 30 min
  └─ Submagic : import les 14 MP4
      → sous-titres FR auto + reformatting TT/IG/Reels en 1 clic

Samedi midi, 15 min
  └─ schedule TikTok + IG (3 publications/jour × 7 jours = 21 slots)
      → cross-post automatique sur les Reels IG

Lun-Dim
  └─ tu réponds aux DMs, tu codes Career OS, tu ne touches plus à TT
```

**Total : 1h30/semaine pour 14 Reels.**

## Les 3 templates

### `HotTake` — opinion-led, ~18s

3 cuts : hook (1.5s) → argument (10.5s) → chase (6s).

Quand l'utiliser :
- Tu contredis un conseil career générique
- Tu prends position sur une décision de produit
- Tu fais une déclaration courte et tranchante

### `ListeRapide` — save-magnet, ~22s

Hook (2s) → 3-7 items en cards animées (~3.5s chacun) → CTA "Save".

Quand l'utiliser :
- "5 mots à virer de ton CV"
- "3 erreurs CV McKinsey"
- "4 questions à poser à un partner"

C'est le format avec le meilleur **save rate** (le seul vrai signal ICP).

### `VeriteMarche` — data-driven, ~22s

Hook (2s) → grosse statistique avec label (5s) → explication (11s) → CTA (4s).

Quand l'utiliser :
- "J'ai analysé 500 questions McKinsey. 3 patterns émergent."
- "Les recruteurs MBB lisent ton CV en 6s — voici la heatmap"

C'est le format autorité — il chope les saves ET les follows.

## Étendre

Pour ajouter un nouveau template :

1. Crée `src/compositions/MonTemplate.tsx`. Mimique la structure d'un existant : un `zod` schema, un composant React, des cuts temporels avec `useCurrentFrame`.
2. Enregistre dans `src/Root.tsx` avec une `<Composition>` entrée.
3. Ajoute un type `composition` autorisé dans `scripts/batch.ts`.

Pas de build step entre — Remotion HMR pick up les changements en live dans Studio.

## Brand

Tokens dans `src/lib/theme.ts` mirror les tokens de `landing/src/styles/tokens.css` qui mirror ceux du dashboard. Si tu changes une couleur de marque dans le dashboard, mirror-la dans les deux.

Le `BrandTag` apparaît en bas-gauche de chaque composition (la seule corner que TT n'occupe pas avec sa propre UI).

## Ce que ces templates ne font PAS

- Pas de voix off. Si tu veux ajouter de la voix, drop un MP3 dans `public/`, utilise `<Audio src=...>` dans le composant. Recommandé pour les Vérité Marché — ElevenLabs FR ou ta propre voix enregistrée une fois pour usage long.
- Pas de captures d'écran de Career OS. Si tu veux les compositer, drop un PNG/MP4 dans `public/`, utilise `<Img>` ou `<Video>`. Le format Démo Produit est à construire en template #4 quand tu en auras besoin.
- Pas de musique de fond. Le contenu B2B-ish high-WTP performe mieux SANS musique sur TT en 2026 (la musique signale "creator" — l'absence signale "expertise"). Si tu testes, un track Suno discret peut marcher pour les Hot Take.

## Render qualité — checks

Sur un Mac Silicon : ~30s par Reel à 30fps × 18-22s. Si t'es lent :

```bash
pnpm exec remotion render HotTake out/test.mp4 --concurrency=4
```

Force le concurrency pour utiliser tous les cores. Default `null` laisse Remotion deviner — sur M1+ c'est rarement optimal.
