/**
 * Install help — covers the 3-4 friction points beta users hit
 * within their first 5 minutes:
 *
 *   1. Gatekeeper warning (app unsigned in Beta Zero-Budget)
 *   2. Sign-in flow (magic-link expectation)
 *   3. Privacy reassurance (one more time, sceptics need it twice)
 *   4. What to do if a feature breaks (link to feedback)
 *
 * Each block answers ONE concrete fear, no marketing fluff. The
 * goal is to keep the beta user productive in the 30s after they
 * see "macOS can't verify this developer".
 */

const ITEMS = [
  {
    q: "macOS dit \"app non vérifiée\" au premier lancement ?",
    a: "Normal — pour la beta on n'a pas encore d'Apple Developer Program (99 $/an). Clique droit sur Career OS dans Applications → \"Ouvrir\" → confirme dans la dialog. Une seule fois.",
  },
  {
    q: "Pas de mot de passe, juste un magic-link ?",
    a: "Oui. Tu rentres ton email, on t'envoie un lien à usage unique (15 min de durée de vie). Clique dessus, l'app reçoit ton jeton, tu es signed-in. Pas de mot de passe à gérer = pas de mot de passe à perdre.",
  },
  {
    q: "Mes données vont sur tes serveurs ?",
    a: "Seulement l'email + un compteur d'usage IA quotidien (rate-limit). Tes CVs, candidatures, transcripts d'entretien restent sur ton Mac. Le texte de ton CV est envoyé en transit à Anthropic uniquement quand tu cliques \"Generate\" / \"Analyze\" — jamais stocké.",
  },
  {
    q: "Un truc casse, je fais quoi ?",
    a: "Settings → Feedback → décris ce qui s'est passé. Le mail s'auto-formate avec ta version + page + diagnostics. Je lis chaque report en personne pendant la beta.",
  },
  {
    q: "Comment je me désinscris / supprime mon compte ?",
    a: "Settings → Account → Sign out (efface ton JWT local). Pour suppression complète des données serveur, écris à privacy@careeros.fr — on supprime ton compte sous 30 jours.",
  },
];

export default function InstallHelp() {
  return (
    <section className="install-help" id="install-help">
      <div className="container">
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <span className="section__eyebrow">Premier lancement</span>
          <h2 className="section__title">
            Les 5 trucs qui peuvent t'arrêter au début.
          </h2>
          <p className="section__lead">
            Pas de support technique 24/7 sur une beta. Les questions
            ci-dessous couvrent ~90 % des blocages qu'on a vus.
          </p>

          <ul className="install-help__list" style={{
            listStyle: "none",
            padding: 0,
            margin: "32px 0 0",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}>
            {ITEMS.map((item) => (
              <li
                key={item.q}
                style={{
                  padding: "16px 18px",
                  borderRadius: 10,
                  border: "1px solid var(--border, #21232C)",
                  background: "var(--bg-1, #16181F)",
                }}
              >
                <h3 style={{
                  margin: "0 0 6px",
                  fontSize: 15,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                }}>
                  {item.q}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "var(--text-2, #B8BAC4)",
                }}>
                  {item.a}
                </p>
              </li>
            ))}
          </ul>

          <p style={{
            marginTop: 28,
            fontSize: 13,
            color: "var(--text-3, #8a8d99)",
            textAlign: "center",
          }}>
            Encore une question ? <a href="mailto:gabranpro@gmail.com" style={{ color: "inherit", textDecoration: "underline" }}>Écris-moi</a> — je réponds dans la journée.
          </p>
        </div>
      </div>
    </section>
  );
}
