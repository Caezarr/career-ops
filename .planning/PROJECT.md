# Interview Copilot

## What This Is

Un overlay desktop Mac stealth qui assiste Gabriel pendant ses interviews live (visio, téléphone, case study) en finance, tech (AI), et stratégie/conseil. L'app capture l'audio (mic + audio système) avec diarisation, détecte les questions du recruteur, et génère en 2-5s des bullets structurés (frameworks STAR / MECE / Pyramid) pour répondre — contextualisés par le CV de Gabriel, l'offre d'emploi visée, et une mémoire long-terme nourrie par ses interviews passées. Outil personnel, pas un produit SaaS.

## Core Value

**Pendant une vraie interview live, l'app affiche en moins de 5 secondes des bullets de réponse de qualité supérieure à ce que Gabriel produirait seul sous stress** — invisibles au recruteur, dans la langue de l'interview (FR ou EN), et qui le font progresser dans sa façon de répondre.

Tout le reste (brief de prep, débrief, mémoire long-terme) sert ce moment de vérité.

## Requirements

### Validated

(None yet — ship to validate)

### Active

#### Live mode (cœur du produit)

- [ ] **LIVE-01** : Capture audio mic + audio système simultanée sur Mac (loopback) avec diarisation streaming (qui parle : Gabriel vs recruteur)
- [ ] **LIVE-02** : Transcription streaming temps réel FR + EN avec détection/switch de langue automatique en cours de session
- [ ] **LIVE-03** : Détection automatique de fin de question (silence + qui parle) avec override hotkey discret
- [ ] **LIVE-04** : Génération de bullets de réponse (3-5 points, framework adapté) en 2-5s après fin de question
- [ ] **LIVE-05** : Overlay flottant always-on-top, invisible aux captures Zoom/Teams/Meet (`NSWindow.sharingType = .none`)
- [ ] **LIVE-06** : Détection screen-share active → masquage/blur automatique de l'overlay (mode paranoid)
- [ ] **LIVE-07** : Reliability top-tier — failover STT (Deepgram → AssemblyAI), failover LLM (Claude → GPT), dégradation gracieuse si tout cloud tombe (Whisper.cpp + Ollama local)

#### Brief de prep (avant l'interview)

- [ ] **PREP-01** : Upload CV (PDF/docx) avec extraction structurée (expérience, compétences, achievements)
- [ ] **PREP-02** : Coller offre d'emploi (JD) + détails du process si connus → parsing structuré
- [ ] **PREP-03** : Brief approfondi auto (5-10 min de prep) : research entreprise (web), questions probables par domaine, pitch "tell me about yourself" personnalisé
- [ ] **PREP-04** : Snapshot 1 par offre — chaque interview a son contexte sauvegardé (CV+JD+brief+transcript)

#### Spécialisation domaine

- [ ] **DOMAIN-01** : Banques de questions curatées par domaine (Finance, Tech AI, Stratégie/Conseil) — DCF, model fit, MECE, etc.
- [ ] **DOMAIN-02** : Personae/prompts spécifiques par domaine (vocabulaire, frameworks attendus, ton)
- [ ] **DOMAIN-03** : RAG sur cas concrets par domaine (M&A cases, AI product cases, consulting cases)
- [ ] **DOMAIN-04** : Templates de frameworks de réponse spécifiques au domaine (STAR-L finance, MECE conseil, technical deep-dive AI)

#### Coaching & présentations

- [ ] **COACH-01** : Live case study coach — pendant un case, l'app suggère structure + hypothèses + calculs en bullets
- [ ] **COACH-02** : Pitch perso "tell me about yourself" généré et personnalisé par offre (1-3 min, FR/EN)

#### Post-interview & mémoire

- [ ] **MEM-01** : Transcript complet sauvegardé localement après chaque session
- [ ] **MEM-02** : Débrief IA auto post-interview (ce qui a marché, ce qui a foiré, suggestions concrètes)
- [ ] **MEM-03** : Mémoire long-terme indexée à partir des transcripts passés (RAG perso) — alimente la génération de réponses futures
- [ ] **MEM-04** : Capture du feedback de Gabriel post-interview (callback / pas de retour / commentaire RH) comme signal de qualité
- [ ] **MEM-05** : Auto-extraction de patterns (tics récurrents, mots répétés, hésitations, longueur moyenne) avec restitution en débrief

### Out of Scope

- **Distribution SaaS / multi-tenant** — Outil perso, pas de besoin auth / billing / multi-user. Si ça marche pour Gabriel et qu'il décide de pivoter, on refacto à ce moment.
- **Mode simulation / mock interview** — v2 candidate. Focus v1 sur le live réel et le brief. Gabriel testera en visio avec un pote.
- **Génération de slides / deck** — Pas le scope du produit. Le coaching de présentation se fait sur le pitch perso et le case study live, pas sur la création de deck.
- **Mobile / téléphone à côté** — Mac desktop overlay only. Pas de besoin mobile pour les visios + cases.
- **Browser extension** — Capture audio système couvre déjà Zoom/Teams/Meet/Google Meet sans toucher au navigateur.
- **LinkedIn import auto** — Onboarding via CV upload + profil manuel suffit. Pas de besoin OAuth tiers.
- **Sync calendrier** — Pas critique pour MVP. Gabriel lance l'app manuellement avant chaque interview.
- **Notes / annotations live pendant l'interview** — Pas critique MVP. Tout passe par le débrief auto post-session.
- **Synthèse vocale / earpiece audio** — Bullets visuels uniquement, pas de voix dans l'oreille.
- **Adaptation à la voix actuelle de Gabriel** — Volontairement non. L'app est un outil de progression : les bullets sont en mode "best practice", pas en mimétisme.

## Context

**Utilisateur cible** : Gabriel — un seul utilisateur, perso first. Polyglotte technique (a déjà projets en TS, Python, Rust dans son écosystème). Profil candidat senior visant des postes en finance, tech AI, conseil/stratégie.

**Use case réel** : Gabriel est en process de recherche d'emploi avec interviews FR + EN, parfois techniques (case study, technical deep-dive AI), parfois RH (screener téléphone), parfois stratégiques (entretien associé conseil). Le contexte change radicalement par offre — d'où le snapshot 1 par offre.

**Environnement technique** :
- macOS récent (Apple Silicon supposé)
- Capture audio système nécessite loopback (BlackHole 2ch ou équivalent) ou ScreenCaptureKit (Mac 13+)
- Anti-détection screen-share via `NSWindow.sharingType = .none` (Native API ou bridge depuis Tauri)

**Stack proposée (tech stack section ci-dessous fixe le détail)** :
- Desktop shell : **Tauri** (Rust + web frontend) — bundle léger ~10MB, perf top, ScreenCaptureKit accessible via crate Rust, web UI rapide à itérer (React + TypeScript)
- STT streaming : **Deepgram** primary (FR + EN, diarisation native, < 1s latency, zero-retention) + **AssemblyAI** failover
- LLM : **Claude API** (Anthropic, zero-retention) primary + **GPT-4** failover
- Embedding/RAG : Embedding model léger + vector store local (LanceDB ou Qdrant local) — la mémoire long-terme reste sur la machine
- Local fallback : Whisper.cpp + Ollama (Llama 3.x) pour mode dégradé si tout cloud tombe
- Web research (brief de prep) : Tavily ou Exa API

**Privacy / stealth model** :
- Audio brut ne quitte la machine que vers Deepgram (zero-retention contracté) — jamais stocké côté fournisseur
- Texte transcrit + contexte CV/JD vont à Claude API (zero-retention)
- Toutes les données persistantes (transcripts, profil, JDs, mémoire long-terme) restent localement (SQLite + vector store local)
- Overlay invisible au screen-share (window-level exclusion + détection screen-share active → masquage)

**Coût attendu** : ~1-3$ par heure d'interview (Deepgram + Claude). Acceptable.

**Mode IA "coaching, pas mimétisme"** : décision forte. L'app n'imite pas la voix de Gabriel — elle lui donne des bullets de meilleure qualité que ce qu'il produirait pour qu'il progresse. Le débrief auto identifie les écarts entre ses réponses et les bullets idéaux.

## Constraints

- **Tech stack** : Mac desktop only (macOS 13+) — pas de Windows / Linux pour MVP. Justifié par le besoin de ScreenCaptureKit + window-level exclusion native.
- **Latency** : Bullets affichés ≤ 5s après fin de question, idéalement 2-3s. Au-delà, l'app n'a plus de valeur pendant l'interview live.
- **Stealth** : Aucune indication visible côté recruteur. Window-level exclusion obligatoire. Détection screen-share + masquage obligatoire.
- **Reliability** : Tier-1 — l'app DOIT marcher pendant une vraie interview. Failover STT + failover LLM + cache local degraded mode tous obligatoires en v1.
- **Budget API** : Cible ~1-3$ par heure d'interview. Pas un blocker mais à monitorer.
- **Privacy** : Audio brut transite par STT cloud (zero-retention OK). Tout le reste (transcripts, mémoire, profil) reste local sur la machine. Pas de backend serveur.
- **Langues** : FR + EN obligatoires. Détection auto + switch in-session.
- **Onboarding** : Long acceptable si qualité top — Gabriel préfère investir du temps de configuration que de sacrifier la qualité.
- **Hallucinations CV** : Non-sujet — Gabriel fournit CV/JD/process, l'app ne doit jamais inventer un fait sur le candidat. Tout fait cité doit être traçable au CV chargé.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Mac desktop overlay (Tauri) plutôt que browser extension / mobile | Couvre toutes les visios + téléphone via audio système, capture mic+système nativement, stealth via window-level exclusion. Tauri = bundle léger, perf, web UI rapide à itérer. Native Swift retenu en alternative si Tauri bloque sur ScreenCaptureKit. | — Pending |
| Deepgram (STT cloud) plutôt que Whisper local pour STT primary | Streaming + diarisation natifs nécessaires pour 2-5s. Whisper local n'a pas de vrai streaming, diarisation faible. Zero-retention résout le risque privacy. | — Pending |
| Claude API (LLM cloud) plutôt que LLM local | Qualité réponses critique pour l'objectif coaching. Anthropic zero-retention résout privacy. Local LLM = fallback uniquement. | — Pending |
| Bullets coaching (best practice) plutôt que mimétisme de la voix de Gabriel | Objectif explicite : progression. Gabriel veut s'améliorer, pas se voir reflété. | — Pending |
| Auto + override hotkey pour le trigger de génération | Auto = magique mais fragile. Hotkey = fiable mais friction. La combo des deux donne le meilleur des deux mondes. | — Pending |
| Snapshot 1 par offre (pas un seul profil global) | Le contexte change radicalement par offre (entreprise, JD, process). 1 snapshot par offre permet brief + transcript + débrief cohérents. | — Pending |
| Failover STT + LLM + local degraded mode obligatoires en v1 | "Faut faire en sorte que ça marche tjrs" — l'app doit marcher pendant une vraie interview. Pas négociable. | — Pending |
| Perso first, pas de SaaS multi-tenant | Simplifie radicalement le scope (pas d'auth, pas de billing). Pivot SaaS possible plus tard si validation. | — Pending |
| Pas de mock/simulation en v1 | Focus sur le live réel + brief. Test possible en visio avec un pote. | — Pending |
| Pas de génération de deck / slides | Hors scope produit. Coaching pres = pitch perso + case live, pas création de slides. | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-26 after initialization*
