/**
 * Hero — opinionated headline, beta status badge, two CTAs.
 * Copy is FR-first; no overclaim, no "AI-powered" buzzwords. The
 * <em> wrapper on "top firms" gets the gradient treatment from CSS.
 */
export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="container">
        <span className="hero__badge">
          <span className="hero__badge-dot" aria-hidden />
          Beta privée · Mac · 47 places
        </span>

        <h1 className="hero__title">
          L'OS de carrière pour viser les <em>top firms</em>.
        </h1>

        <p className="hero__subtitle">
          Une seule fenêtre pour 40 candidatures. Un score ATS en local, ancré
          dans ton CV. Et quand l'entretien commence, un coach silencieux qui
          n'apparaît jamais à l'écran partagé.
        </p>

        <div className="hero__cta-row">
          <a href="#beta" className="btn-primary">
            Rejoindre la beta
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M6 3 L11 8 L6 13"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
          <a href="#how" className="btn-ghost">
            Voir comment ça marche
          </a>
        </div>

        <div className="hero__meta">
          <span>macOS 13+</span>
          <span>100% local</span>
          <span>Open beta · gratuit</span>
        </div>
      </div>
    </section>
  );
}
