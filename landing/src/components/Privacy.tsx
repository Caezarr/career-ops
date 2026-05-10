/**
 * Privacy panel. The privacy posture is the single genuine
 * differentiator vs Cluely / Teal HQ / Simplify — never undersell.
 * Each bullet maps to a real implementation guarantee in src-tauri
 * (single-egress cloud client, Keychain via the keyring crate, no
 * raw audio on disk, JSONL transcripts only). Soft opener that
 * names the real fear ("ce que tu écris ne doit pas finir chez un
 * recruteur") — then lists the controls that prove it.
 */

const POINTS = [
  {
    strong: "Tout reste sur ta machine.",
    rest: "CVs, candidatures, transcriptions : dans ~/Library/Application Support. Jamais iCloud, jamais un serveur Career OS, jamais un tiers.",
  },
  {
    strong: "Aucun clip audio sur disque.",
    rest: "L'audio vit en RAM le temps de la transcription, puis disparaît. Seul le texte est gardé — purgeable en un clic.",
  },
  {
    strong: "Tes clés API dans le Keychain macOS.",
    rest: "Anthropic, OpenAI, AssemblyAI : protégées par macOS, jamais en clair, jamais loggées, jamais dans le bundle.",
  },
  {
    strong: "Une seule sortie réseau, auditée.",
    rest: "Tous les appels passent par un module unique. Code source GitHub-public, vérifiable en 2 minutes au grep.",
  },
];

const CheckIcon = () => (
  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d="M3 8.5 L6.5 12 L13 4.5"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function Privacy() {
  return (
    <section className="privacy" id="privacy">
      <div className="container">
        <div className="privacy__inner">
          <div>
            <span className="section__eyebrow">Privacy par design</span>
            <h2 className="section__title">
              Ton CV ne finira pas dans un dataset d'entraînement.
            </h2>
            <p className="section__lead">
              Tu écris des choses sensibles dans cette app : ton vrai salaire, le
              nom de ton manager toxique, la raison de ton dernier échec d'entretien.
              Career OS est une app native Mac, pas un service web — et la vie
              privée n'est pas un argument marketing, c'est un défaut d'architecture.
            </p>
          </div>

          <ul className="privacy__list">
            {POINTS.map((p) => (
              <li key={p.strong}>
                <span className="privacy__check" aria-hidden>
                  <CheckIcon />
                </span>
                <span>
                  <strong>{p.strong}</strong> {p.rest}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
