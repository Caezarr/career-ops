/**
 * Hero — two-column layout matching the v2 mockup.
 *
 *   Left column  — eyebrow + headline + subtitle + CTAs + meta
 *   Right column — product mockup screenshot (provided in
 *                  public/assets/hero-mockup.png)
 *
 * The "300 heures" inside the headline gets the brand
 * blue→violet gradient via the `.hero__title-accent` class
 * (defined in landing.css) — used sparingly so it really
 * draws the eye. Same applies to the body word in the CTA.
 *
 * Mobile collapses to a single column with the mockup stacked
 * under the CTA row — handled by `.hero__grid` media queries.
 */
export default function Hero() {
  return (
    <section className="hero hero--split" id="top">
      <div className="container">
        <div className="hero__grid">
          {/* ── Left: copy + CTAs ──────────────────────────────── */}
          <div className="hero__copy">
            <span className="hero__eyebrow">
              <span className="hero__eyebrow-star" aria-hidden>✶</span>
              {" "}
              Le système de carrière des ambitieux
            </span>

            <h1 className="hero__title">
              Décroche les meilleurs jobs
              <br />
              sans y laisser{" "}
              <span className="hero__title-accent">300 heures.</span>
            </h1>

            <p className="hero__subtitle">
              Career OS remplace les outils éparpillés et les 12 onglets
              ouverts par un système unique pour sourcer, optimiser vos
              CV, suivre vos candidatures et préparer vos entretiens.
            </p>

            <div className="hero__cta-row">
              <a href="#beta" className="btn-primary">
                Postuler à la bêta
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path
                    d="M3 8 H13 M9 4 L13 8 L9 12"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
              <a href="#how" className="btn-ghost">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden style={{ marginRight: 4 }}>
                  <path d="M5 3 L13 8 L5 13 Z" />
                </svg>
                Voir la démo
              </a>
            </div>

            <ul className="hero__meta-list">
              <li><CheckDot /> Bêta privée</li>
              <li><CheckDot /> Réponse sous 7 jours</li>
              <li><CheckDot /> Places limitées</li>
            </ul>
          </div>

          {/* ── Right: product mockup ──────────────────────────── */}
          <div className="hero__mockup">
            {/* Asset: landing/public/assets/hero-mockup.png
                ~1200×900, screenshot of Dashboard with Pipeline +
                Score ATS card + Momentum card overlaid. */}
            <img
              src="/assets/hero-mockup.png"
              alt="Career OS Dashboard avec Pipeline de candidatures, score ATS et Momentum"
              className="hero__mockup-img"
              loading="eager"
              onError={(e) => {
                // Show placeholder until the asset is dropped in.
                const el = e.currentTarget;
                el.style.display = "none";
                const sib = el.nextElementSibling as HTMLElement | null;
                if (sib) sib.style.display = "flex";
              }}
            />
            <div className="asset-placeholder" style={{ display: "none" }}>
              <span>📷 hero-mockup.png</span>
              <span style={{ fontSize: 11, opacity: 0.7 }}>
                Drop ton screenshot Dashboard ici
                <br />(landing/public/assets/)
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CheckDot() {
  return (
    <span className="hero__meta-dot" aria-hidden>
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
        <path
          d="M3 8.5 L6.5 12 L13 4.5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
