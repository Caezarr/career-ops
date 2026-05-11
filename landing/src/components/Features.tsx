/**
 * Features grid v2 — 4 cards, each pairs a benefit-titled card with
 * a real product-mockup screenshot below the copy. Matches the
 * "Trust bar → 4 features" layout in the design.
 *
 * The mockups (`feature-*.png`) come from the actual app, exported
 * from Figma or directly screenshotted on a 2× macbook. Falling
 * back to a dashed placeholder when the asset isn't dropped yet.
 *
 * Cards fade in with a 100ms-staggered delay when the section
 * enters the viewport (via `useReveal`).
 */

import { useReveal } from "../hooks/useReveal.ts";

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
    title: "Trouve les annonces avant les 500 autres",
    body:
      "Sources premium agrégées, filtres fins par firme cible (MBB, IB, FAANG, AI). Tu sais quoi postuler le lundi matin — sans LinkedIn.",
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
    title: "CV adapté en 2 minutes, score ATS &gt; 90",
    body:
      "Tu colles l'annonce, l'IA reformule ton CV avec les bons mots-clés. 75% des CV sont rejetés par les ATS. Le tien passe.",
    mockup: "feature-ats.png",
    mockupAlt: "Carte Score ATS 94 Excellent avec jauge verte",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 5 L20 5 L20 17 L13 17 L8 21 L8 17 L4 17 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
    title: "Connais tes 12 questions avant l'entretien",
    body:
      "Brief IA personnalisé par firme + tes réponses STAR prêtes + Live Copilot pendant l'appel. Tu entres calme. Tu sors avec une offre.",
    mockup: "feature-prep.png",
    mockupAlt: "Carte Brief d'entretien avec waveform audio et progression des questions ciblées",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 21 C12 21 4 14.5 4 9 a5 5 0 0 1 9.5 -2 a5 5 0 0 1 9.5 2 c0 5.5 -8 12 -8 12 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
    title: "Sais quoi faire dès demain matin",
    body:
      "Plan d'actions quotidien + relances automatiques + tracker visuel. Plus jamais une candidature oubliée. Plus jamais une journée perdue.",
    mockup: "feature-momentum.png",
    mockupAlt: "Plan d'actions : 24/40 candidatures, 8 entretiens, 2 offres",
  },
];

export default function Features() {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <section className="section features features--cards" id="features">
      <div
        ref={ref}
        className={`container reveal ${shown ? "reveal--shown" : ""}`}
      >
        <header className="section__header">
          <span className="section__eyebrow">Fonctionnalités</span>
          <h2 className="section__title">
            Tout ce qu'il te faut pour signer.
          </h2>
          <p className="section__sub">
            4 modules. 1 système. Zéro outil à coordonner.
          </p>
        </header>

        <div className="features__grid features__grid--4">
          {FEATURES.map((f, i) => (
            <article
              className="feature-card feature-card--with-mockup"
              key={f.title}
              style={{ transitionDelay: `${i * 90}ms` }}
            >
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
