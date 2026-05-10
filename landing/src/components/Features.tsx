/**
 * Features grid v2 — 4 cards, each pairs a benefit-titled card with
 * a real product-mockup screenshot below the copy. Matches the
 * "Trust bar → 4 features" layout in the design.
 *
 * The mockups (`feature-*.png`) come from the actual app, exported
 * from Figma or directly screenshotted on a 2× macbook. Falling
 * back to a dashed placeholder when the asset isn't dropped yet.
 */

interface Feature {
  icon: React.ReactNode;
  title: string;
  body: string;
  /** Filename inside `landing/public/assets/`. */
  mockup: string;
  /** Accessibility label for the mockup image. */
  mockupAlt: string;
}

const FEATURES: Feature[] = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
        <path d="M16.5 16.5 L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    title: "Sourcing intelligent",
    body:
      "Trouve les meilleures opportunités avant les autres grâce à des sources premium et des filtres fins.",
    mockup: "feature-sourcing.png",
    mockupAlt: "Carte Opportunités pertinentes : McKinsey Business Analyst, Google Product Manager",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9 8 H15 M9 12 H15 M9 16 H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    title: "CV qui passe les ATS",
    body:
      "Adaptez ton CV en 2 minutes à chaque offre pour passer le filtre automatique.",
    mockup: "feature-ats.png",
    mockupAlt: "Carte Score ATS 94 Excellent avec jauge verte",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 5 L20 5 L20 17 L13 17 L8 21 L8 17 L4 17 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
    title: "Préparation entretien",
    body:
      "Obtiens des briefs de questions ciblées, tes réponses prêtes et un coaching IA.",
    mockup: "feature-prep.png",
    mockupAlt: "Carte Brief d'entretien avec waveform audio et progression des questions ciblées",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 21 C12 21 4 14.5 4 9 a5 5 0 0 1 9.5 -2 a5 5 0 0 1 9.5 2 c0 5.5 -8 12 -8 12 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
    title: "Momentum & suivi",
    body:
      "Un plan d'actions clair pour rester régulier, ne rien oublier et convertir plus d'entretiens en offres.",
    mockup: "feature-momentum.png",
    mockupAlt: "Plan d'actions : 24/40 candidatures, 8 entretiens, 2 offres",
  },
];

export default function Features() {
  return (
    <section className="section features features--cards" id="features">
      <div className="container">
        <div className="features__grid features__grid--4">
          {FEATURES.map((f) => (
            <article className="feature-card feature-card--with-mockup" key={f.title}>
              <header className="feature-card__head">
                <div className="feature-card__icon" aria-hidden>
                  {f.icon}
                </div>
                <h3 className="feature-card__title">{f.title}</h3>
              </header>
              <p className="feature-card__body">{f.body}</p>

              <div className="feature-card__mockup-wrap">
                <img
                  src={`/assets/${f.mockup}`}
                  alt={f.mockupAlt}
                  className="feature-card__mockup-img"
                  loading="lazy"
                  onError={(e) => {
                    const el = e.currentTarget;
                    el.style.display = "none";
                    const sib = el.nextElementSibling as HTMLElement | null;
                    if (sib) sib.style.display = "flex";
                  }}
                />
                <div className="asset-placeholder" style={{ display: "none", minHeight: 180 }}>
                  <span>📷 {f.mockup}</span>
                  <span style={{ fontSize: 11, opacity: 0.7 }}>
                    Drop la card mockup ici
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
