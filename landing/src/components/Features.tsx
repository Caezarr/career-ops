/**
 * Three feature cards — the only three product surfaces that drive
 * conversion. Order is deliberate: Tracker first (immediate pain),
 * ATS Analyzer second (recurring value), Live Copilot last (the
 * magic moment, gated visually so it never reads as "the cheating
 * tool").
 */

interface Feature {
  icon: React.ReactNode;
  title: string;
  body: string;
}

const FEATURES: Feature[] = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 9 H16 M8 13 H13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    title: "Tracker unifié",
    body:
      "Toutes tes candidatures, dans une seule fenêtre. Pipeline drag-and-drop, sources scrapées en local (Greenhouse, Lever, Ashby, YC, JobTeaser), zéro tab Notion à maintenir.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 14 L9 9 L13 13 L20 6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M14 6 H20 V12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "ATS Analyzer",
    body:
      "Score temps réel CV vs n'importe quelle JD. Identifie les keywords manquants, propose les reformulations exactes. Powered by Claude, jamais ChatGPT-slop.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 3 V21 M5 8 V16 M19 8 V16 M9 5 V19 M16 5 V19"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
    title: "Live Copilot",
    body:
      "Pendant l'entretien : transcription locale, suggestions de réponse en pyramide STAR ancrées dans ton CV. N'apparaît jamais sur l'écran partagé. Hotkey Cmd+Shift+Space.",
  },
];

export default function Features() {
  return (
    <section className="section features" id="features">
      <div className="container">
        <div className="features__head">
          <span className="section__eyebrow">Trois surfaces, un seul flow</span>
          <h2 className="section__title">
            Construit pour les candidats qui visent McKinsey, Goldman ou Anthropic.
          </h2>
          <p className="section__lead">
            Career OS vit à côté de ton travail. Il sait quels rôles tu vises, quel CV tu
            envoies, et ce que tu as répondu en entretien la dernière fois. Tout reste sur
            ton Mac.
          </p>
        </div>

        <div className="features__grid">
          {FEATURES.map((f) => (
            <article className="feature-card" key={f.title}>
              <div className="feature-card__icon" aria-hidden>
                {f.icon}
              </div>
              <h3 className="feature-card__title">{f.title}</h3>
              <p className="feature-card__body">{f.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
