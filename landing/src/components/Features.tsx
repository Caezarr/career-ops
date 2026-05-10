/**
 * Three feature cards — benefit-led titles, each anchored to a real
 * pain point of the ICP (HEC/ESCP/Polytechnique student in M2 with
 * 40 active applications).
 *
 * Order is deliberate:
 *   1. Tracker first  — the most immediate, daily pain
 *   2. ATS second     — the recurring weekly task that compounds
 *   3. Copilot last   — the high-intensity magic moment, kept
 *                       visually subdued so the brand never reads
 *                       as "the cheating tool"
 *
 * Card titles speak the user's outcome ("Plus jamais figé en
 * entretien"), not the feature name. The feature name shows up as
 * a small kicker so a tech reader can still anchor.
 */

interface Feature {
  icon: React.ReactNode;
  kicker: string;
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
    kicker: "Tracker",
    title: "Plus jamais 12 onglets ouverts",
    body:
      "Tes candidatures Greenhouse, Lever, Ashby, JobTeaser, ton calendar, tes notes — une seule fenêtre. Drag-and-drop pipeline. Plus de Notion à maintenir, plus de tableau Excel partagé sur WhatsApp.",
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
    kicker: "ATS Analyzer",
    title: "Sache si tu passes l'ATS avant d'envoyer",
    body:
      "Score CV vs JD calculé en 2 secondes. Les keywords qui manquent, les reformulations exactes, en français comme en anglais. Une vraie analyse — pas du copier-coller ChatGPT que les ATS détectent en 2026.",
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
    kicker: "Live Copilot",
    title: "Plus jamais figé en entretien",
    body:
      "Pendant le call, le Copilot écoute, comprend la question, et te suggère une réponse en pyramide STAR ancrée dans ton CV. N'apparaît jamais sur l'écran partagé. Hotkey ⌘⇧Espace.",
  },
];

export default function Features() {
  return (
    <section className="section features" id="features">
      <div className="container">
        <div className="features__head">
          <span className="section__eyebrow">Trois surfaces · un seul flow</span>
          <h2 className="section__title">
            Pensé pour les candidats qui visent les top firms — pas pour les autres.
          </h2>
          <p className="section__lead">
            Career OS vit à côté de ton travail sur Mac. Il sait quels rôles tu cibles,
            quel CV tu envoies, ce que tu as répondu la dernière fois. Tout reste sur ta
            machine — recruteurs, ATS et concurrents n'ont pas accès à cette donnée.
          </p>
        </div>

        <div className="features__grid">
          {FEATURES.map((f) => (
            <article className="feature-card" key={f.kicker}>
              <div className="feature-card__icon" aria-hidden>
                {f.icon}
              </div>
              <span className="feature-card__kicker">{f.kicker}</span>
              <h3 className="feature-card__title">{f.title}</h3>
              <p className="feature-card__body">{f.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
