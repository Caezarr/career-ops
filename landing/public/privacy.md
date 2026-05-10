# Politique de confidentialité — Career OS

**Dernière mise à jour** : 10 mai 2026
**Éditeur** : Gabriel Rance (gabriel@careeros.app)

---

## 1. Qui est responsable du traitement ?

Career OS est édité par **Gabriel Rance**, micro-entreprise immatriculée en France (SIRET à compléter). Le responsable du traitement des données personnelles au sens du RGPD est l'éditeur lui-même, joignable à l'adresse `privacy@careeros.app`.

## 2. Quelles données on collecte

Career OS est conçu autour du principe **"local-first"** : la grande majorité de tes données vit uniquement sur ton Mac. Les données qui transitent ou sont stockées côté serveur sont strictement :

| Donnée | Où elle vit | Pourquoi |
|--------|-------------|----------|
| **Email** | D1 Cloudflare (UE) | Authentification magic-link + identification du compte |
| **JWT de session** | macOS Keychain (sur ton Mac) | Maintenir ta session sans réauthentification quotidienne |
| **Statut d'abonnement** (free/active/cancelled) | D1 Cloudflare | Gating des fonctionnalités payantes |
| **Stripe Customer ID** | D1 Cloudflare | Lien avec ton historique de paiement (Stripe SAS) |
| **Compteur d'usage IA quotidien** | D1 Cloudflare | Rate-limiting (5 à 30 appels/jour selon endpoint) |
| **Texte envoyé aux endpoints IA** (CV, JD, narrative) | Anthropic (transit, non stocké côté Career OS) | Génération de contenu |

**Ce qui RESTE sur ton Mac uniquement** :
- Toutes tes candidatures, CVs, jobs ingérés, notes, transcripts d'interview
- Tes clés API tierces (si tu en utilises) dans le Keychain macOS
- Le contenu de ton `profile.md` (sauf au moment précis où il est généré via le serveur)

## 3. Cookies et trackers

L'app desktop **n'utilise aucun cookie ni tracker**. La landing page (`careeros.app`) utilise uniquement un cookie technique de session si tu te connectes ; aucune analytique tierce (pas de Google Analytics, pas de Meta Pixel).

## 4. Sous-traitants

| Prestataire | Rôle | Localisation des données |
|-------------|------|--------------------------|
| **Cloudflare** | Hébergement Worker + base D1 | UE (Frankfurt) |
| **Anthropic** | Génération IA (Claude) | États-Unis (sous-traitant validé via DPA Anthropic) |
| **Stripe** | Paiement abonnement | UE + États-Unis |
| **Loops** | Email transactionnel (magic-link) | États-Unis |

Anthropic, Stripe et Loops sont des sous-traitants situés hors UE. Les transferts sont encadrés par les clauses contractuelles types de la Commission européenne (Standard Contractual Clauses) que chaque prestataire publie.

**Anthropic** est explicitement engagé à ne pas utiliser les données envoyées via l'API pour l'entraînement de ses modèles ([source](https://www.anthropic.com/legal/commercial-terms)).

## 5. Durée de conservation

| Donnée | Durée |
|--------|-------|
| Compte (email + statut) | Tant que ton compte existe + 30 jours après suppression |
| JWT de session | 30 jours d'expiration côté serveur, supprimable instantanément côté client (Sign out) |
| Magic-link tokens | 15 minutes (expirés automatiquement) puis purge sous 24h |
| Compteur d'usage IA | 90 jours glissants |
| Données Stripe | Conservation imposée par la réglementation comptable (10 ans pour les factures) |

## 6. Tes droits (RGPD)

Tu peux à tout moment :

- **Accéder** à tes données — écris à `privacy@careeros.app`, on te transmet sous 30 jours
- **Rectifier** tes données — modifiable directement dans l'app (Settings → Profile)
- **Supprimer** ton compte — bouton "Delete account" dans Settings → Account ; ou écris à `privacy@careeros.app` (suppression en 30 jours, hors données Stripe imposées par la loi)
- **Exporter** tes données — bouton "Export all data" dans Settings → Account (JSON local + Markdown du `profile.md`)
- **T'opposer** à un traitement — pour les usages non-essentiels uniquement (le compte lui-même est nécessaire au service)
- **Réclamer auprès de la CNIL** — `cnil.fr/plaintes` si tu n'es pas satisfait de notre réponse

## 7. Sécurité

- Toutes les communications app ↔ serveur sont chiffrées en TLS 1.3
- Les JWT sont signés HS256 avec un secret 256-bit
- Les magic-links sont à usage unique avec consommation atomique (CAS SQL)
- Les clés API tierces que tu choisis de stocker localement sont placées dans le **macOS Keychain** (jamais en localStorage)
- L'overlay Copilot active la protection anti-screenshot macOS (`setContentProtected`)

## 8. Mineurs

Career OS s'adresse aux étudiants et professionnels. Tu dois avoir **au moins 16 ans** pour utiliser le service (seuil RGPD français pour le consentement parental).

## 9. Modifications de cette politique

On peut faire évoluer cette politique. Toute modification substantielle est annoncée par email à l'adresse de ton compte 30 jours avant prise d'effet.

---

**Contact** : `privacy@careeros.app`
