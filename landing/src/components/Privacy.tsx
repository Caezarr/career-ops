/**
 * Privacy panel. The privacy posture is one of the genuine
 * differentiators vs Cluely / Teal HQ / Simplify — never undersell
 * it. Each bullet is a checked claim from src-tauri (single-egress
 * cloud client, Keychain via the keyring crate, no raw audio on
 * disk, JSONL transcripts only).
 */

const POINTS = [
  {
    strong: "Tout en local.",
    rest: "Tes CVs, tes candidatures, tes transcriptions vivent dans ~/Library/Application Support. Jamais iCloud, jamais un serveur tiers.",
  },
  {
    strong: "Pas un seul clip audio sur disque.",
    rest: "L'audio reste en RAM le temps de la transcription. Seul le texte JSONL est gardé, et tu peux le purger en un clic.",
  },
  {
    strong: "Clés API dans le Keychain macOS.",
    rest: "Anthropic, OpenAI, AssemblyAI : stockées via le crate keyring, jamais dans SQLite, jamais dans le bundle, jamais dans les logs.",
  },
  {
    strong: "Une seule sortie réseau auditée.",
    rest: "Tous les appels passent par un module unique (cloud::Client). Greppable en 2 minutes pour quiconque inspecte le binaire.",
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
            <h2 className="section__title">Tes données ne quittent pas ton Mac.</h2>
            <p className="section__lead">
              Quand tu prépares 40 candidatures, tu manipules des éléments sensibles :
              CVs, lettres, transcriptions d'entretiens. Career OS est une app native Mac,
              pas un service web. Tout est local par défaut — et auditable côté code.
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
