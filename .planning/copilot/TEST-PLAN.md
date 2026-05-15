# Career OS — Copilot test plan E2E

Manuel de test end-to-end avant la phase de build complet (~17-20h).
Suivre dans l'ordre — chaque test dépend du précédent étant OK.

État attendu après ce test : tu sais exactement ce qui marche, ce qui
casse, et l'ordre dans lequel attaquer le build des features manquantes.

---

## §0 — Pré-flight (15 min)

### 0.1 BlackHole 2ch installé

BlackHole est le device virtuel macOS qui permet de capturer le son du
système (= la voix de l'interviewer dans Zoom/Meet/Teams). Sans lui,
Career OS ne peut **PAS** transcrire l'interviewer.

```bash
brew install --cask blackhole-2ch
# Reboot le Mac une fois installé.
```

Vérifie l'install :
- Ouvre **Audio MIDI Setup** (Spotlight → "Audio MIDI")
- Tu dois voir "BlackHole 2ch" dans la sidebar gauche

### 0.2 Multi-Output Device (pour entendre l'interviewer ET le capturer)

Sans Multi-Output, BlackHole avale le son et tu n'entends plus rien.
Solution : créer un device qui route le son vers les hauts-parleurs **ET**
BlackHole en parallèle.

Dans **Audio MIDI Setup** :
1. Cliquer `+` en bas à gauche → **Create Multi-Output Device**
2. Cocher : tes hauts-parleurs (ou casque) **+** BlackHole 2ch
3. Renommer → "Career OS Output" (clic droit → Rename)
4. Cocher "Drift Correction" sur BlackHole

Pour l'utiliser pendant un entretien :
- Mac System Settings → Sound → Output → choisir **Career OS Output**
- Tu entends comme d'habitude, mais BlackHole reçoit une copie

### 0.3 Worker secrets configurés

```bash
cd /Users/gabriel/Desktop/Wonka/code/interview-copilot/worker

# Doivent être présents :
pnpm dlx wrangler secret list | grep -E "ANTHROPIC|ASSEMBLYAI|LOOPS|STRIPE|JWT"
```

Si `ASSEMBLYAI_API_KEY` manque :
```bash
pnpm dlx wrangler secret put ASSEMBLYAI_API_KEY
# paste ta clé AssemblyAI
pnpm run deploy
```

### 0.4 Career OS build + signed-in

```bash
cd /Users/gabriel/Desktop/Wonka/code/interview-copilot
pnpm tauri dev  # ou DMG installé
```

- Magic-link auth avec `gabranpro@gmail.com`
- Vérifier dans Settings que tu es bien connecté

### 0.5 Pré-flight self-check

| Vérif | OK ? |
|---|---|
| BlackHole 2ch visible dans Audio MIDI Setup | ☐ |
| "Career OS Output" Multi-Output Device créé | ☐ |
| System Output réglé sur "Career OS Output" | ☐ |
| Worker déployé avec ASSEMBLYAI_API_KEY | ☐ |
| Career OS lancé + signé-in | ☐ |

Si l'un de ces points casse, on n'avance pas — tout le reste en dépend.

---

## §1 — Feature 1 : capture audio interviewer (~15 min)

**Objectif** : prouver que la voix d'un interviewer dans Zoom/Meet est
transcrite en temps réel dans Career OS.

### 1.1 Setup test call

Tu auras besoin d'une **2e device** (téléphone, autre Mac, tablette) qui
joue le rôle de l'interviewer. Options :

- **Option A** (le plus simple) : Lance une vidéo YouTube sur ton iPhone
  d'un entretien réel (ex: "Tony Smith McKinsey case interview") en
  haut-parleur. Pas besoin de Zoom, BlackHole capte tout son qui sort de
  ton Mac… donc en fait il faut Zoom pour que YouTube soit dedans.

- **Option B** (réaliste) : Ouvre Zoom, démarre un meeting solo (gratuit
  jusqu'à 40min), joins-toi avec ton iPhone, et fais parler quelqu'un sur
  l'iPhone qui apparaît dans le meeting.

- **Option C** (le plus rapide) : Ouvre QuickTime → New Audio Recording
  → joue-toi un podcast d'entretien, en utilisant **Career OS Output**.
  Le son sort vers BlackHole, donc Career OS le capte.

→ Vas-y avec **Option C** pour ce test, c'est le plus rapide.

### 1.2 Démarrer une session Copilot

1. Dans Career OS → bouton "Live Copilot" (ou raccourci)
2. Choisir un job pour le contexte (utilise une offre existante)
3. **Start session**

### 1.3 Vérifications

| Test | Attendu | OK ? |
|---|---|---|
| Bouton "Start" passe à "Stop" | ✅ | ☐ |
| Témoin "Connecting → Listening" visible | ❓ (à valider — peut être absent) | ☐ |
| **Mic meter** : barre verte qui bouge quand tu parles | ✅ | ☐ |
| Transcription apparaît dans LiveTranscript quand tu joues l'audio test | ✅ | ☐ |
| Transcript suit la voix avec **< 2s** de délai | ✅ | ☐ |
| Si tu mutes ta sortie système → transcription s'arrête | ✅ | ☐ |

### 1.4 Comportement attendu sur les erreurs

| Action | Comportement attendu |
|---|---|
| Couper le wifi en pleine session | Banner "Connexion perdue, reconnexion…" |
| Mic permission refusée au démarrage | Banner explicite + lien Settings |
| BlackHole pas installé | Warning "Loopback device introuvable — vérifie BlackHole" |
| Aucun son pendant 30s | Hint "Aucun son détecté — vérifie ta sortie audio" |

**Note les comportements RÉELS** (pas attendus) ici :

```
- Couper wifi : [écris ce qui se passe]
- Mic refusé : [...]
- BlackHole absent : [...]
- Silence 30s : [...]
```

### 1.5 Limitation connue à ce stade

❌ **La voix de l'utilisateur (toi) n'est PAS transcrite.**
Le mic est capturé mais ses samples ne sont pas envoyés à AssemblyAI.
Conséquence : seule la voix de l'interviewer apparaît dans le transcript.
C'est ce que Feature 3 (prompter adaptatif) va débloquer.

---

## §2 — Feature 2 : stealth pendant un screen share (~10 min)

**Objectif** : prouver que Career OS est invisible quand tu partages
ton écran en entretien.

### 2.1 État actuel du code

- ✅ **Fenêtre Copilot overlay** : `content_protected = true`
  → Invisible aux captures
- ❌ **Fenêtre Dashboard principale** : non protégée
  → Visible aux captures

**À builder dans la phase suivante** : protection de la fenêtre Dashboard.

### 2.2 Tests à faire AUJOURD'HUI

#### Test A — Screenshot CMD+SHIFT+5

1. Lance Career OS, ouvre une session Copilot active
2. Glisse la fenêtre Copilot overlay sur ton bureau
3. `CMD + SHIFT + 5` → "Capture Entire Screen"
4. Vérifier le screenshot dans Desktop

| Élément | Visible dans le screenshot ? | Attendu |
|---|---|---|
| Fenêtre Dashboard principale | ☐ visible | ❌ visible (pas encore protégé) |
| Fenêtre Copilot overlay | ☐ invisible | ✅ invisible |

#### Test B — Zoom screen-share

1. Ouvre Zoom, démarre un meeting solo
2. Joins-toi avec un autre device (téléphone)
3. Sur ton Mac → "Share Screen" → Entire Screen
4. Regarde le rendu sur ton téléphone (= ce que voit l'interviewer)

| Élément | Visible côté téléphone ? | Attendu |
|---|---|---|
| Fenêtre Dashboard principale | ☐ visible | ❌ visible (pas encore protégé) |
| Fenêtre Copilot overlay | ☐ invisible | ✅ invisible |

#### Test C — QuickTime screen recording

1. QuickTime → File → New Screen Recording
2. Record l'écran entier pendant 10s avec Copilot ouvert
3. Lis l'enregistrement

⚠ **macOS limitation connue** : QuickTime peut bypasser
`NSWindowSharingNone` sur certaines versions. Note ce qui se passe :

```
- QuickTime + Copilot overlay : [visible / invisible]
```

#### Test D — Microsoft Teams / Google Meet

Si tu utilises ces outils en entretien, fais le même test que Zoom.

```
- Teams : [résultat]
- Google Meet : [résultat]
```

---

## §3 — Feature 3 : prompter adaptatif (~5 min)

**Objectif** : observer l'état actuel (suggestion statique) et
documenter la cible (prompter qui scroll au rythme de ta voix).

### 3.1 État actuel

- Suggestion s'affiche comme une carte markdown
- Texte streamé token-par-token (effet typewriter)
- ✅ Cursor blink pendant le streaming
- ❌ AUCUN word-level highlight
- ❌ AUCUN auto-scroll basé sur ta vitesse de parole
- ❌ AUCUNE adaptation : si tu parles lentement ou vite, le texte ne suit
  pas

### 3.2 À tester aujourd'hui

1. Lance une session
2. Joue un audio d'interviewer qui pose une question (Option C du §1)
3. Attends la suggestion → elle stream
4. Observe : peux-tu lire à ton rythme et "réciter" en suivant ?

| Test | Constat |
|---|---|
| Le texte est-il lisible pendant que tu parles ? | ☐ |
| Y a-t-il un repère visuel du mot suivant à dire ? | ❌ (aujourd'hui non) |
| Si tu parles vite, le texte est-il toujours synchro ? | ❌ |
| Si tu parles lentement, le texte attend-il ? | ❌ |

### 3.3 Vision cible (à builder en Phase 4)

```
┌─ Suggestion ──────────────────────────────────┐
│ Mon expérience chez McKinsey m'a appris       │
│ à structurer des problèmes ambigus.           │
│ ▓▓▓▓▓ ← curseur "mot suivant à dire"          │
│ Par exemple, sur un projet de transformation  │ (gris, prochaine ligne)
│ digitale pour un client retail...             │ (gris)
└───────────────────────────────────────────────┘
```

Tu parles → AAI transcrit ta voix → matcher les mots prononcés avec le
texte de la suggestion → curseur avance → auto-scroll si on s'approche
du bas → grise les mots déjà dits.

---

## §4 — Edge cases (~10 min)

| Scénario | Test | Comportement actuel | Attendu |
|---|---|---|---|
| Démarrer session sans Anthropic key configurée | Click Start | Erreur après click | Bouton désactivé + tooltip |
| Wifi coupé en pleine session | Coupe le wifi | ? | Banner "Reconnexion…" |
| Session > 5 min (token AAI expire) | Laisse tourner 6 min | Silencieux fail ? | Soit refresh, soit warning |
| Quit l'app au milieu d'une session | CMD+Q pendant transcript | Crash ? Données perdues ? | Cleanup propre |
| Mic permission refusée | Revoke dans Settings → Privacy | ? | Banner + lien |
| 2 instances de Career OS en parallèle | Lance 2x | ? | Empêcher 2 sessions |
| AssemblyAI rate limit atteint (120/jour) | Lance 120 sessions | ? | Message clair |
| Long answer (Claude > 30s) | Question complexe | ? | Streaming fluide |

Note les comportements réels dans ce tableau.

---

## §5 — Synthèse de test

À la fin du test, rapport ici :

### Ce qui marche (✅)

```
- [...]
```

### Ce qui casse / manque (❌)

```
- [...]
```

### Bugs reproductibles (priorité décroissante)

```
1. [...]
2. [...]
```

### Surprises / observations

```
- [...]
```

---

## §6 — Suite : phases de build (~17-20h)

Une fois ce test fait + ton rapport en main, on attaque dans cet ordre :

### Phase 1 — Quick wins reliability (~3h)
- Stealth fenêtre Dashboard (`content_protected` sur main window)
- Pré-flight gate sur Start (Anthropic key + mic perm)
- Token AAI fetch 5s timeout
- Token AAI refresh mid-session (cap à 30min/session sinon)
- Error wrapping (pas de stack trace brute à l'utilisateur)
- Banner "Connexion perdue" sur disconnect WebSocket
- Banner "Aucun son détecté" si silence > 5s
- Banner "Loopback introuvable" si BlackHole manquant

### Phase 2 — Transcription user voice (~6h)
- 2e WebSocket AAI streaming pour la voix user (mic separé)
- Word-level timestamps activés sur les 2 streams
- État `userTranscript` en parallèle de `recruiterTranscript`
- Display optionnel "Toi disais : …" dans LiveTranscript

### Phase 3 — Speaker diarization UI (~3h)
- Label visuel "Recruteur" / "Toi" dans LiveTranscript
- Couleurs distinctes
- Filtre "voir seulement le recruteur" / "seulement moi"

### Phase 4 — Prompter adaptatif (~6h)
- Word-matcher : matcher chaque mot prononcé par toi à un mot dans la
  suggestion en cours
- Algo : levenshtein + window glissante (tolère skip/repeat)
- UI : highlight progressif du curseur "next word"
- Auto-scroll quand approche du bas
- Toggle on/off (mode "prompteur" vs mode "lecture libre")
- CSS : prochain mot en gras indigo, mots passés grisés

### Phase 5 — Polish final (~2h)
- Hotkey global pour start/stop (CMD+SHIFT+C)
- Idle timeout 60min max session
- Cleanup propre sur quit (persist transcript snapshot)
- Toast feedback sur copy/share
- Empty states cosmétiques

---

## §7 — Phase 4b — ASR-driven teleprompter cursor (live test)

Phase 4b ajoute un **deuxième WebSocket AssemblyAI** dédié à la voix
du candidat (mic). Les mots transcrits font avancer le curseur du
teleprompter via un matcher Levenshtein "banded" — au lieu (ou en
plus) du timer 150 WPM de la Phase 4a. Le timer reste en filet de
sécurité quand le candidat se tait > 2s ou part hors-script.

### 7.1 Pré-flight (1 min)

Vérifier que le Worker peut bien servir DEUX tokens AAI par session :
```bash
cd /Users/gabriel/Desktop/Wonka/code/interview-copilot/worker
pnpm dlx wrangler tail --format pretty | grep "transcription-token"
# Tu dois voir 2 hits POST /v1/copilot/transcription-token
# au démarrage de chaque session Copilot.
```

Le rate limit est journalier (120/jour/user, défini dans
`worker/src/lib/rateLimit.ts`) — 2 tokens par session = 60
sessions/jour max. Largement OK pour la beta.

### 7.2 Test happy path — curseur suit la voix (5 min)

1. **Démarrer une session Copilot** (mode QA), poser une question
   bidon dans Zoom/Meet (ou jouer un sample audio sur les enceintes
   capturées par le Core Audio Tap / BlackHole).
2. **Attendre que Claude génère une réponse** — le teleprompter
   apparaît avec le texte streamé.
3. **Lire la réponse à voix haute** au mic, posément.
4. **Vérifier** :
   - Le curseur (mot surligné `--current`) doit avancer **dans les
     ~500 ms** après chaque mot prononcé. Pas de saccade visible.
   - Si tu sautes un mot ("voilà" → silence → "donc"), le matcher
     doit rattraper sur le bloc de 3-5 mots suivants.
   - Si tu te trompes (paraphrase, mot inversé), le curseur n'avance
     pas — il attend que tu retrouves le script.

### 7.3 Test fallback — silence du candidat (2 min)

1. Démarrer une session, laisser Claude générer une réponse.
2. **NE PAS lire à voix haute.**
3. **Vérifier** :
   - Pendant ~2 secondes le curseur reste sur le mot courant.
   - Après 2s de silence, **le timer 150 WPM prend le relais** et
     fait avancer le curseur tout seul (Phase 4a inchangée).
   - Dès que tu reprends la lecture à voix haute, le matcher reprend
     la main et le curseur saute au mot que tu viens de dire.

### 7.4 Test rate-limit graceful (1 min)

1. Forcer un échec du second token : couper le réseau APRÈS le
   premier `getAssemblyAiToken()` mais avant le second (DevTools →
   Network → Offline pendant 200 ms autour du `start()`).
2. **Vérifier** :
   - La session démarre quand même (un warning console
     `[copilot] user-voice transcription token unavailable…`).
   - Le teleprompter fonctionne en mode Phase 4a (timer-only),
     aucun event `user-transcript` n'arrive.
   - Pas de banner d'erreur visible côté UI.

### 7.5 Test fenêtre standalone (1 min)

1. Démarrer une session — la fenêtre `teleprompter` doit s'afficher
   en haut de l'écran (Phase 5).
2. Lire à voix haute.
3. **Vérifier** : le curseur dans la fenêtre standalone suit la voix
   **identiquement** à celui du dashboard. Le payload
   `teleprompter-state` ship maintenant un champ `userPartial`
   supplémentaire — le matcher Levenshtein tourne dans la webview
   `teleprompter` exactement comme dans `main`.

### 7.6 Vérifier que la Phase 4a n'est PAS cassée (1 min)

1. **Désactiver Phase 4b** : commenter localement le push du
   `userVoiceAssemblyaiToken` dans `useCopilotSession.ts::start()`
   (passer `''` à la place).
2. Lancer une session.
3. **Vérifier** : le teleprompter fonctionne comme avant — curseur
   timer 150 WPM, hotkeys ⌥+espace / flèches OK. Aucun changement
   visible côté UX.
4. Recommitter le push après.

### Résultat attendu

- 2 tokens AAI fetchés par session start (`wrangler tail` confirme).
- 2 WebSockets AAI vivants (logs Rust : `AssemblyAI connected
  (interviewer)` + `AssemblyAI connected (user)`).
- Le curseur suit la voix dans les ~500 ms ; fallback timer après 2s
  de silence ; le mode legacy continue de marcher sans le second
  token.

### Caveats connus

- Le matcher est ancré sur la fenêtre `[cursor-2, cursor+5]` — si le
  candidat sait sa réponse par cœur et la débite à 220 WPM
  ininterrompu, il peut "déborder" la fenêtre. Pas vu en prod ; à
  re-tuner si feedback.
- Le matcher tolère ~40% d'edit distance — sur des passages
  techniques avec beaucoup de noms propres ("Levenshtein", "Tauri",
  "AssemblyAI") la confiance peut chuter et le curseur reste en
  arrière. C'est OK : le timer fallback le rattrapera.
- Le second token consomme le budget AAI : avec 120 tokens/jour le
  candidat est limité à 60 sessions/jour. Au-delà, augmenter
  `transcription-token` dans `worker/src/lib/rateLimit.ts`.
