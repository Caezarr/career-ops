# Beta invitation — modèle d'email

À envoyer aux 5-10 premiers users de confiance. Personnalise le `[Prénom]` et `[Comment je te connais]`. Le ton est intentionnellement direct (pas de marketing-speak) — on veut des retours honnêtes, pas des likes polis.

---

## Version courte (Gmail one-screen)

```
Objet : J'ai un truc à te montrer (Mac uniquement, 3 min)

Salut [Prénom],

J'ai construit Career OS — une app Mac qui rassemble ton job hunt
au lieu de te le faire vivre dans 12 onglets. Tu trackes tes
candidatures, tu génères un CV adapté à chaque offre en 30s, et
tu drilles tes questions d'entretien dans une seule fenêtre.

Je cherche 5-10 personnes de confiance pour la première beta —
[comment je te connais, ex: "tu m'as parlé d'ATS l'autre fois", 
"tu en es à 40 candidatures depuis 2 mois"], donc je pense que
tu vas voir des trucs que je n'ai pas vu.

→ Téléchargement (DMG, ~100 MB) :
   https://github.com/Caezarr/career-ops/releases/latest

→ Site : https://careeros.fr

Premier lancement : macOS va probablement bloquer parce que l'app
n'est pas signée (Apple Developer Program à 99$/an, je ne paie
pas tant que la beta n'est pas validée). Workaround : clic droit
sur l'app dans Applications → "Ouvrir" → confirme. Une seule
fois.

Ce que je te demande :
- Si tu peux installer + faire l'onboarding (~3 min) ce week-end
- Casse-le. Trouve un truc qui ne marche pas. Dis-moi le pire
  moment.

J'attendrai pas de réponse polie. Je veux 1 ligne (= "ça marche
moyen sur X") ou 5 lignes (= ton expérience complète). À ta
guise.

Merci.

Gab
```

---

## Version "FAQ pré-emptive" (à envoyer en 2e message si question / blocage)

```
Quelques questions qui peuvent arriver :

> "C'est gratuit ?"
Oui pendant la beta. Plus tard ce sera 150€/an. Tu auras un
accès à vie en remerciement si tu m'aides à valider le produit.

> "J'ai pas de Mac"
Désolé, Mac only pour l'instant (la stack technique est macOS
native). Windows / Linux après la validation Mac.

> "Mes données sont en sécurité ?"
Local-first. Toutes tes candidatures, CV, transcripts vivent
dans le SQLite de l'app, sur ton Mac. Le seul truc qui transite
par le serveur : tes 4 réponses d'onboarding + le texte de ton
CV au moment de générer le profile.md (envoyé à Anthropic via
mon serveur, jamais stocké). Privacy complète :
https://careeros.fr/privacy.md

> "Apple dit 'application non vérifiée' / 'fichier corrompu'"
Normal — l'app n'a pas le tampon Apple ($99/an pour ça, on
verra après la beta). Clic droit sur l'app → "Ouvrir" → "Ouvrir"
dans la dialog. Une fois fait, ça ne reposera plus la question.

> "Le copilot live d'interview, c'est tricher ?"
Ça dépend de l'interview. Pour un screen RH ou behavioural, c'est
un coach qui prépare ton elevator pitch à partir de ton CV. Pour
un test technique chronométré ou un examen formel — non, je ne
le recommande pas. À ta discrétion.
```

---

## Suivi après 48h (template auto-relance soft)

```
Objet : Re: J'ai un truc à te montrer

Salut [Prénom],

Petit ping si tu as eu 3 min pour ouvrir Career OS — pas grave si
non, je sais que c'est demandé un week-end.

Si tu as essayé : qu'est-ce qui t'a marqué (en bien ou en moins
bien) ? Pas besoin de soigner la réponse.

Si tu n'as pas eu le temps : je relance pas, dis-moi juste si tu
préfères que je note dans une cohorte plus tard ou que je te
laisse tranquille.

Merci !
Gab
```

---

## Liste de cibles initiales — checklist

Critères pour les 10 premiers :
- [ ] Ils ont un Mac récent (macOS 13+)
- [ ] Ils cherchent activement (ou viennent de chercher) un job → vraie immersion
- [ ] Au moins 3 personnes qui visent du top tier (McKinsey / Goldman / Anthropic / etc.) — ton ICP exact
- [ ] Au moins 2 personnes qui n'aiment PAS l'IA / sont sceptiques → ils trouveront les pires bugs
- [ ] 2-3 personnes que tu peux appeler 10 min en visio pour debrief, pas juste un email

Évite :
- Mecs qui te disent "tu me montres ?" depuis 2 mois sans jamais avoir installé un seul de tes projets
- Recruteurs (intéressant pour eux mais pas ton ICP user)
- Anyone qui te répondrait "c'est super génial, bravo" par politesse
