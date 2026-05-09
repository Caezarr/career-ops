# Career OS — Demo Video · Brief de production

> Document destiné au studio de motion design. Self-contained. Lecture
> attendue : 15 min, exécution : ~5 jours ouvrés. Toutes les
> spécifications sont fermes — questions = avant le kickoff, pas après.

---

## 0. TL;DR pour le producteur

| | |
|---|---|
| **Durée** | 13-14 secondes |
| **Format** | 16:10 · 1920×1200 source · MP4 H.264 · 60 fps natif puis export 30 fps |
| **Style** | Tech-product hero loop. Linear, Cursor, Raycast, Stripe. PAS de stock-illustration, PAS de talking head, PAS de voix off, PAS d'avatar humain |
| **Loop** | Seamless. Dernière frame = première frame, ou whip-out qui ramène à l'ouverture |
| **Son** | Aucun. Le fichier livré est muet. Le rythme implique des "ka-cha" silencieux |
| **Live action** | Zéro. 100% capture d'écran + motion graphics over |
| **Délais** | 5 jours ouvrés du kickoff à la livraison finale |
| **Budget de référence** | €2-4k pour un studio FR compétent (cf. §10) |

**Le shot money** = la révélation Live Copilot à T+9s. C'est LÀ que la
vidéo doit faire mal au cœur du viewer. Tout ce qui précède est un
tunnel vers ce moment.

---

## 1. Contexte produit

**Career OS** = l'OS de carrière pour les candidats qui visent les top
firms (McKinsey, Bain, BCG, Goldman, Stripe, Anthropic, etc.). App Mac
native (Tauri 2), 100% local. Quatre surfaces principales :

1. **Dashboard** — vue d'ensemble : candidatures actives, prochaines
   échéances, stats
2. **Applications** — pipeline kanban drag-and-drop des candidatures
3. **CV Manager** — analyse ATS de chaque CV contre une JD donnée
4. **Live Copilot** — fenêtre légère qui apparaît pendant un entretien
   visio et propose des réponses ancrées dans le CV en temps réel

La vidéo vit comme **hero block** sur careeros.app/, autoplay-muet en
boucle. Audience cible : étudiants 22-30 d'écoles top (HEC, ESCP,
Polytechnique, Stanford, Wharton). Sophistiquée, allergique au slop.

---

## 2. Références visuelles

**À étudier 30 minutes avant de commencer** :

| Référence | À regarder |
|---|---|
| linear.app (hero loop) | Pacing, transitions whip, cursor abstrait |
| cursor.sh (hero) | La révélation de feature à mi-vidéo |
| raycast.com (hero) | Polish des micro-interactions, motion blur |
| stripe.com (anciennes) | Densité d'info / seconde |
| superhuman.com (older) | Kinetic typography pour les hotkeys |
| notion.com hero | Comment scroll-pan entre surfaces |

**À éviter à tout prix** :
- Animated isometric illustrations
- Generic stock cursor / mouse with default OS arrow
- Bouncy "fun" easings (Framer-default cubic-out is too generic)
- Stock photos de gens en costume
- Particles génériques type "tech background loops"
- "AI-magic-sparkle" partout

---

## 3. Brand system

### Couleurs

```
Background base    #0A0B0F  (très sombre, jamais pur noir)
Background card    #16181F
Borders            #21232C
Texte primaire     #F4F5F8
Texte secondaire   #B8BAC4
Accent indigo      #6366f1
Accent indigo glow rgba(99, 102, 241, 0.32)
Gradient accent    linear-gradient(135deg, #818cf8, #c7d2fe)
```

Toutes les couleurs sont déjà en variables CSS dans le repo
(`landing/src/styles/tokens.css`). Studio peut récupérer si besoin.

### Typographie

- **Inter** (corps) — déjà chargée via Google Fonts
- **JetBrains Mono** (kinetic typography pour les hotkeys + chiffres)
- Letter-spacing tight (-0.02em à -0.04em) sur les gros titres
- Texte UI réel = Inter, weights 500 / 600 / 700 / 800

### Motion principles

| Principe | Application |
|---|---|
| **Pas de bounce gratuit** | Easing par défaut = `cubic-bezier(0.16, 1, 0.3, 1)` (entries) ou `cubic-bezier(0.4, 0, 0.2, 1)` (exits) |
| **Mass + drag** | Toute interaction utilisateur (drag, click, scroll) a un tiny lag puis snap. Jamais d'instantané |
| **Whip transitions** | Entre les shots, motion blur + pan rapide (4-8 frames) plutôt qu'un cut sec |
| **Accent glow follow-the-eye** | Une trace lumineuse 1-2px subtile suit l'élément qui doit être lu |
| **Numbers tick up** | Tout chiffre apparaît via counter animation (0 → valeur cible), jamais en static reveal |
| **Cursor abstrait** | Pas le curseur OS. Un dot indigo de 8-10px avec un trail léger. Pre-animé, pas tracké réel |
| **Motion blur** | 180° shutter sur tous les pans rapides. Subtil sur les drags |

---

## 4. Shot list — le script complet

> Total : 13-14s. Source 60fps, export 30fps avec motion blur baked-in.

### SHOT 1 — "The OS opens" (0:00 → 0:02.5)

**Surface :** Career OS Dashboard, état "user activé semaine 3"
**Camera :** medium-wide, fenêtre Career OS centrée, ~85% de la frame
**Background :** macOS subtle wallpaper, fenêtre Career OS au centre

**Action chronologique :**
- Frame 0 (0:00) : Career OS dashboard apparaît, scale-up de 0.96 → 1.0 sur 8 frames
- 0:00.3 : les 4 stats du haut tickent up en counter : "47 candidatures actives", "12 entretiens cette semaine", "3 offres en cours", "82 % score moyen ATS"
- 0:01.0 : la sidebar gauche s'illumine, item par item, avec un accent glow qui descend (suggestion qu'on va explorer)
- 0:02.0 : le cursor (dot indigo 8px avec trail) apparaît hors-champ haut-droite et glisse vers l'item "Applications" dans la sidebar
- 0:02.4 : click — un anneau d'accent se propage 0 → 16px (puis disparaît) au point de click

**Énergie :** confiance silencieuse. C'est l'OS qui s'ouvre. Pas de
fanfare.

**Transition out :** au moment du click, whip-pan vers la droite +
motion blur + scale-up 1.0 → 1.05. 6-8 frames. La page Applications
arrive en place.

---

### SHOT 2 — "The pipeline move" (0:02.5 → 0:05.0)

**Surface :** Career OS Applications page, vue Kanban
**Camera :** medium shot, focus sur 3 colonnes : "Applied", "Phone screen", "Interview"

**Action :**
- 0:02.5 : la page apparaît, déjà peuplée. 8-12 cards visibles réparties dans les colonnes. Logos des entreprises lisibles (Stripe, Bain, Anthropic, Goldman, Mistral)
- 0:02.8 : le cursor descend vers une card "Bain & Company · Strategy Associate" dans la colonne "Phone screen"
- 0:03.1 : pickup — la card lift de 0 → 8px en Z, scale 1.0 → 1.04, rotation -2°. L'ombre s'étend en dessous (`0 24px 64px rgba(99,102,241,0.32)`)
- 0:03.5 : drag horizontal vers la colonne "Interview". Trail lumineux indigo derrière la card pendant le déplacement (subtle, 30% opacity, fade-out 200ms)
- 0:04.3 : drop dans la colonne "Interview". Settle bounce léger (overshoot puis settle)
- 0:04.5 : les 2 colonnes "Phone screen" et "Interview" tickent leurs compteurs au même moment : "8 → 7" et "5 → 6"
- 0:04.7 : un toast subtil apparaît bottom-right "Stage updated · Bain & Company" puis fade

**Énergie :** satisfaisant, kinaesthetic. C'est le shot qui dit "c'est
fluide". Le viewer doit avoir envie de drag-and-dropper aussi.

**Transition out :** zoom-in sur la card moved dans la colonne
"Interview". Scale 1.0 → 1.4 sur 6 frames, motion blur. La card
remplit la frame, fond out vers le shot 3.

---

### SHOT 3 — "The ATS reveal" (0:05.0 → 0:09.0)

**Surface :** CV Manager · vue Tailoring Workspace (CV à gauche, panel d'analyse à droite)
**Camera :** medium close-up sur le panel d'analyse droit

**Action :**
- 0:05.0 : la vue se compose. À gauche : un CV PDF rendu lisiblement (Inter, sections claires). À droite : un panel "Analyse contre la JD"
- 0:05.2 : un input "JD" en haut affiche un texte qui se type-écrit lui-même : "Senior Strategy Associate · Bain & Company · Paris" sur 12 frames
- 0:05.8 : le bouton "Analyser le match" pulse une fois (scale 1.0 → 1.04 → 1.0)
- 0:06.0 : le cursor click sur le bouton. Anneau de propagation 0 → 16px
- 0:06.1 : une progress bar horizontale fine sous le bouton commence à se remplir, indigo glow follow-the-eye le long du tracé. Vitesse : 1.4s linéaire pour atteindre 100%
- 0:06.5 : pendant que la progress bar avance, des chips qui correspondent à des keywords détectés "stamp" en bas du panel, un par un, avec un léger pop : "M&A modeling ✓", "Strategy frameworks ✓", "Python ✓", "Due diligence —", "Manager-level XP ✓"
- 0:07.4 : la progress bar atteint 100%. Elle disparaît en fade.
- 0:07.5 : le donut score apparaît au centre du panel droit. **C'est le moment clé du shot.**
  - Donut size : 200px diamètre
  - Stroke 16px, accent indigo `#6366f1`
  - Le donut se draw lui-même de 0% → 82% en 1.0s avec un cubic ease-out
  - Au centre du donut, le chiffre tick : "0 → 82" en JetBrains Mono Bold 64px, blanc, avec un subtle glow accent
  - Au-dessus du donut, label "ATS Match Score" en uppercase 12px tracking 0.16em
- 0:08.5 : un flash d'accent glow `0 → 0.6 → 0` opacity sur tout le panel (220ms) — célébration subtile
- 0:08.8 : 2 chips de recommendation apparaissent en bas du donut, stagger 60ms : "Tu domines la dimension technique" + "Renforce le narratif strategy/leadership"

**Énergie :** le climax informationnel. Le viewer comprend "wow, ça
fait l'analyse vraiment". Le donut qui tick à 82% doit être le frame
qu'on screenshot pour Twitter.

**Transition out :** pull-back zoom du panel d'analyse vers une vue
plus large (Career OS dans son ensemble), puis fade-to-black 8 frames.

---

### SHOT 4 — "The hotkey + Live Copilot reveal" (0:09.0 → 0:12.0)

> Le shot money. Si UN seul shot doit slap, c'est celui-là.

**Surface :** Une fake fenêtre de Google Meet ouverte avec un visage
flouté (volontairement, on ne voit pas qui). Career OS Live Copilot va
apparaître par-dessus.

**Camera :** wide shot, la fenêtre Meet remplit ~70% de la frame, le
reste = wallpaper macOS sombre

**Action :**
- 0:09.0 : noir complet, 4 frames. Volontairement.
- 0:09.13 : kinetic typography au centre de la frame :
  ```
  ⌘  ⇧  Espace
  ```
  Chaque touche apparaît dans une "key cap" macOS-like (border-radius
  12px, fond `#1B1E27`, border `#2A2D38`, label JetBrains Mono 36px).
  Stagger 80ms entre les 3 touches. Au moment où la dernière apparaît :
  flash blanc 1 frame.
- 0:09.7 : les key caps disparaissent. La fake fenêtre Meet apparaît
  fade-in 0.4s. Visage interlocuteur flouté radialement (preserve la
  privacy mais reste reconnaissable comme "un humain en visio").
- 0:10.0 : le Live Copilot overlay apparaît dans le coin haut-droite
  de l'écran (par-dessus, comme dans la vraie app). Slide-in from
  right de 60px, opacity 0 → 1, 320ms.
  
  **Format de l'overlay :**
  - Width 380px, height ~280px
  - Background `rgba(20, 22, 29, 0.95)` avec backdrop-filter
  - Border `1px solid #2A2D38`
  - Border-radius 16px
  - Box-shadow profond `0 32px 80px -20px rgba(99, 102, 241, 0.42)`
  
- 0:10.4 : header de l'overlay s'illumine. Petit dot indigo qui
  pulse + label "Listening · French".
- 0:10.6 : le bloc transcription apparaît dans l'overlay :
  
  **Question (label 11px uppercase + texte 14px italique) :**
  > "Parle-moi d'un projet où tu as dû négocier sous contrainte de temps."
  
  Le texte se type-écrit token-by-token sur 1.0s, ~25 chars/frame.
  
- 0:11.7 : sous la question, séparateur fin. Puis label "Réponse
  suggérée — STAR compressé" en accent indigo uppercase 11px.
- 0:11.85 : la réponse commence à streamer, token-by-token :
  
  > "En 2024 chez Stripe, j'ai mené une renégociation avec un fournisseur en 72 h ; j'ai cadré un appel d'offres parallèle, obtenu 18 % de remise, et tenu le launch."
  
  Vitesse de streaming : ~22 chars/frame. Streaming continue jusqu'à
  la fin du shot (le viewer ne voit jamais "fin" — implique
  continuité).

**Énergie :** la révélation. Le viewer comprend silencieusement :
"l'app m'écoute, comprend la question, génère la réponse en
direct". C'est SON moment "I want this".

**Transition out :** le Copilot reste visible, le shot se freeze
pendant ~6 frames, puis whip-out vers le shot 5.

---

### SHOT 5 — "Brand outro + loop point" (0:12.0 → 0:13.5)

**Surface :** brand frame
**Camera :** centered, dark backdrop avec radial accent glow

**Action :**
- 0:12.0 : whip-blur in. Le contenu précédent disparaît dans un blur
  indigo.
- 0:12.3 : background résolve en `#0A0B0F` avec un radial-gradient
  accent au centre.
- 0:12.4 : logo Career OS scale-in 0.92 → 1.0 sur 8 frames (spring),
  centré. Le logo = la lettre stylisée "C" + le mot "Career OS" en
  Inter 800 64px tracking -0.03em.
- 0:12.7 : sous le logo, "careeros.app" en Inter 500 28px, color
  `#B8BAC4`. Underline accent gradient sweep 0 → 100% width sur 12
  frames.
- 0:13.0 : tout en bas : "Beta privée · 47 places restantes" en
  uppercase 14px tracking 0.06em, color `#82858F`.
- 0:13.3 : tout fade-out en 6 frames vers la frame 1 du shot 1 (la
  dashboard), seamless loop.

**Énergie :** mémorable, sobre. Pas de fanfare. Juste "this is what it's
called, here's where to go".

**Pourquoi ce shot 5 et pas un loop direct :** le hero loop tourne en
boucle infinie. Si on cut directement du shot 4 au shot 1, le viewer
n'aura jamais l'occasion de lire "Career OS · careeros.app". La frame
brand garantit qu'à chaque cycle de 13s, le nom + l'URL apparaissent.

---

## 5. Préparation des assets — états de l'app à capturer

> À fournir au studio par nous (Career OS team), pas par eux. Le
> studio enregistre les écrans qu'on lui prépare.

### Pour Shot 1 — Dashboard

État de l'app :
- Login fait, dashboard chargé
- 47 candidatures actives (numéros à mocker dans la DB ou à fixer en
  store dev mode)
- Stats du haut : "47 candidatures · 12 entretiens · 3 offres · 82% ATS"
- Activity feed peuplé avec 6 lignes mockées :
  1. "Bain & Company · phone screen scheduled" — il y a 12 min
  2. "Stripe · application sent" — il y a 2 h
  3. "Anthropic · ATS analysis 87%" — il y a 4 h
  4. "Goldman Sachs · response received" — il y a 1 j
  5. "McKinsey · interview prep · 2 questions" — il y a 1 j
  6. "Mistral · cv updated" — il y a 2 j

### Pour Shot 2 — Applications pipeline

État de l'app :
- Page Applications, vue Kanban
- 12 cards réparties :
  - **Sourced (3)** — Latitude, Doctolib, Alan
  - **Applied (4)** — Stripe, Notion, Linear, Mistral
  - **Phone screen (3)** — Bain, BCG, McKinsey ← **la card "Bain" sera
    déplacée dans la séquence**
  - **Interview (2)** — Anthropic, Goldman
  - **Offer (0)**
- Logos des entreprises bien rendus (les vrais SVG si possible — le
  studio aura besoin d'une assets/companies/ folder)

### Pour Shot 3 — CV ATS analyzer

État de l'app :
- CV Manager → un CV nommé "CV — Strategy & Tech 2026.pdf"
- Le PDF preview à gauche doit être le CV de Gabriel (à fournir, version
  démo, infos non sensibles), Inter rendering, 1 page
- À droite : panel d'analyse vide au début ("Choisis une JD pour analyser")
- La JD à taper : "Senior Strategy Associate · Bain & Company · Paris"
- Le résultat à mocker :
  - Score : 82%
  - Keywords matched : M&A modeling ✓ · Strategy frameworks ✓ · Python ✓ · Manager-level XP ✓
  - Keywords missing : Due diligence — · French native —
  - Recommendations : "Tu domines la dimension technique" + "Renforce le narratif strategy/leadership"

### Pour Shot 4 — Live Copilot

État de l'app :
- La fake Google Meet window à fournir : screenshot d'une vraie session
  Meet avec un avatar flouté
- Live Copilot overlay réel de Career OS, en mode "Listening · FR"
- Question préchargée : "Parle-moi d'un projet où tu as dû négocier
  sous contrainte de temps."
- Réponse pré-générée à streamer : "En 2024 chez Stripe, j'ai mené une
  renégociation avec un fournisseur en 72 h ; j'ai cadré un appel
  d'offres parallèle, obtenu 18 % de remise, et tenu le launch."

### Pour Shot 5 — Brand frame

- Logo SVG Career OS : on fournit (existe déjà dans landing/public/favicon.svg)
- Aucun screen capture nécessaire. Pure motion graphics.

---

## 6. Spécifications techniques d'enregistrement

### Capture source

- **Outil :** ScreenStudio ou QuickTime Screen Recording (Cmd+Shift+5)
- **Résolution écran :** 1920×1200 (Mac display réglé sur "More Space")
- **Frame rate :** 60 fps (rien en dessous, le slow-mo en post sera mauvais)
- **Codec :** ProRes 422 LT (gros, mais lossless pour le post)
- **Audio :** désactivé à la capture
- **Cursor OS :** caché à la capture (`defaults write com.apple.universalaccess closeViewCursorType -int 4` ou via System Settings → Accessibility → Pointer)

### Window state

- Fenêtre Career OS positionnée et redimensionnée à exactement
  1600×1000 (4:2.5) au centre de l'écran 1920×1200
- Wallpaper macOS : `#0A0B0F` solid, ou un wallpaper sombre minimal
  fourni par nous (à demander)
- Menu bar masquée (System Settings → Control Center → Auto-hide menu
  bar : Always)
- Dock masqué auto

### Plusieurs captures, pas une seule

- Ne PAS essayer d'enregistrer une seule prise de 14s. Capturer chaque
  shot séparément, en plusieurs prises pour avoir le meilleur take
- Les transitions entre shots se font en post

---

## 7. Direction post-production

### Étalonnage

- Bumper saturation des accents indigo de +5%
- Crush des noirs de 2-3% (le fond `#0A0B0F` doit lire vraiment dense)
- Pas de filtre cinématique. C'est un produit, pas un trailer.

### Cursor en post

Le curseur OS Mac est CACHÉ à la capture (cf. §6). Le curseur dans la
vidéo finale est un dot indigo 8-10px ajouté en post comme couche
indépendante :

- Couleur : `#6366f1`
- Forme : cercle plein 8px, halo glow `0 0 12px rgba(99, 102, 241, 0.6)`
- Trail : 3 dots fantômes derrière, opacity dégressive 0.4 / 0.2 / 0.1,
  spacing 6px
- Mouvement : courbes Bézier pré-animées, jamais linéaires. Easing
  `ease-out` à l'arrivée
- Click feedback : anneau qui se propage de 0 → 16px en 280ms,
  opacity 0.8 → 0

### Motion blur

- 180° shutter sur tous les pans / whip
- Drags : motion blur subtil (0.5-1px) sur l'élément qu'on déplace
- Apparitions : aucun motion blur, scale + opacity uniquement

### Kinetic accents (le côté "frappe")

- Sur chaque chip qui apparaît dans Shot 3 : un flash blanc 1 frame
  juste avant le pop-in
- Sur le donut score 82% : un éclat radial qui se propage 0 → 200px en
  400ms au moment où le chiffre atteint 82
- Sur le hotkey ⌘⇧Espace : flash blanc 1 frame quand la 3ème touche
  apparaît
- Sur le streaming du Copilot : le caret de typing est un trait indigo
  vertical 2px qui clignote (12fps)

### Sound design — pour le timing seulement

Pas de son livré. Mais le rythme implique :
- Soft click au moment de chaque interaction cursor
- Whoosh sourd sur chaque transition entre shots
- Petit "bip" digital quand le donut atteint 82%
- Subtle keyboard "tac tac tac" pendant le streaming Copilot

→ Ces sons NE sont PAS dans le fichier livré, mais le rythme de
l'animation doit être tel qu'on les entendrait mentalement.

---

## 8. Loop technique

Trois options par ordre de qualité :

### Option A — La plus propre

- Shot 5 (brand frame) finit en fade-out vers `#0A0B0F` plein
- Shot 1 commence en fade-in depuis `#0A0B0F` plein
- Si fade-out et fade-in sont strictement identiques (mêmes 6 frames
  noires en commun), le loop est seamless

### Option B — Si fade-to-black trop sage

- Shot 5 finit en whip-blur indigo (60% opacity)
- Shot 1 commence en whip-blur identique qui se résout
- Le loop point devient une "respiration" indigo, plus dynamique mais
  plus de risque de trahir la coupure

### Option C — Pas de loop, hard cut

- Le studio livre 13.5s ; on accepte un saut visible toutes les 13.5s
- ⚠️ Pas recommandé pour un hero block

**Choix recommandé : Option A.**

---

## 9. Deliverables

Le studio livre, dans cet ordre :

1. **Storyboard PDF** (J+1 après kickoff)
   Frame-clés × shots, annotations
2. **Animatic V1** (J+3)
   Animation sans détail final, juste timing + camera moves
3. **First cut V1** (J+4)
   Animation complète, avec assets temporaires
4. **First cut V2** (J+5)
   Après round de feedback
5. **Final delivery** (J+5 ou J+6)

### Fichiers livrés

| Nom | Format | Specs | Usage |
|---|---|---|---|
| `careeros-demo-1080.mp4` | MP4 H.264 | 1920×1200, 30fps, ~3 Mbps | Landing principale |
| `careeros-demo-720.mp4` | MP4 H.264 | 1280×800, 30fps, ~1.5 Mbps | Mobile / fallback |
| `careeros-demo-poster.jpg` | JPEG | 1920×1200, frame de Shot 3 (donut 82%) | OG image, fallback static |
| `careeros-demo-source.aep` | After Effects | source projet | Pour itérations futures |
| `careeros-demo-frames.zip` | PNG sequence | 1920×1200, all frames | Backup / future re-encode |

### Naming + branding

- Pas de logo studio incrusté dans la vidéo
- Crédit studio dans le README du projet GitHub si demandé (à
  négocier au kickoff)
- Tous les fichiers livrés sans watermark

---

## 10. Timeline & budget guideline

### Timeline ferme (5 jours ouvrés)

| Jour | Studio livre | On répond |
|---|---|---|
| **J0 (kickoff)** | — | Nous : ce brief + assets app + accès Figma si besoin |
| **J+1** | Storyboard PDF (5-10 frames) | Feedback < 24h |
| **J+3** | Animatic V1 (rough animation, no polish) | Feedback < 24h |
| **J+4** | First cut V1 (avec polish, 80% final) | Feedback < 24h |
| **J+5** | Final cut V2 + tous les deliverables | Sign-off ou round V3 (max 1) |

Round V3 = scope limité à des micro-tweaks (couleur, timing, copy).
Pas de re-shoot.

### Budget de référence

| Studio FR | Tarif attendu | Délai |
|---|---|---|
| Junior / freelance solo | €1.5k - €2.5k | 5-7 jours |
| Studio mid-size (3-5 pers) | €2.5k - €4k | 5 jours |
| Studio premium (motion + UI/UX) | €4k - €8k | 5-7 jours |

**Recommandation : milieu de gamme, €2.5-4k.** Junior solo prend des
risques sur le polish. Premium est over-spec pour un hero loop de 14s.

### Ce qui n'est PAS dans le périmètre

À cadrer si demandé en sus :
- Variantes mobile / vertical (9:16)
- Versions 30s / 60s / 3min (long-form)
- Sound design + livraison avec piste audio
- Variantes A/B (deux versions à tester)
- Versions multilingues (subs, ou voice-overs)

---

## 11. Approval flow

| Niveau | Qui valide |
|---|---|
| Storyboard | Gabriel (founder) |
| Animatic | Gabriel + 1 lead designer si dispo |
| First cut V1 | Gabriel + 2 utilisateurs beta sélectionnés (test informel pour catch les "ça lit pas") |
| Final | Gabriel (sign-off) |

Feedback structuré uniquement (Loom annoté ou screenshots avec
timestamps). Pas de "j'aime pas" sans data point. Le studio peut
refuser un feedback non actionable et nous renvoyer reformuler.

---

## 12. Annexe — Pourquoi pas un cas plus simple

Le studio pourrait demander : "pourquoi pas juste un screen recording
brut avec un curseur qui bouge ?"

Réponse : ça a été testé sur Linear, Cursor, Stripe, et tous les
hero loops "no motion design" performent 30-50% moins bien sur :
- Hover-stop rate (le viewer scroll-passe en 1.5s)
- Bio-link CTR (l'œil ne capture pas le moment de feature)
- Time-on-page (le visiteur ne reste pas pour le 2ème cycle)

Le motion design n'est pas du décor. C'est ce qui transforme une
suite d'écrans en un récit. Sur un hero block où on a 1.5s pour
hooker, c'est rentable au premier deck d'attention.

---

*Brief complet. Questions au kickoff.*
