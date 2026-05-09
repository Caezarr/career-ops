/**
 * Hero — sales-led copy.
 *
 * Structure obeys the AIDA pyramid for high-WTP B2C-ish products:
 *   Attention — beta badge with scarcity number, animated dot
 *   Interest  — headline names the firms (specificity = identification)
 *               and the pain ("12 onglets", "300 heures")
 *   Desire    — subtitle promises a concrete OUTCOME, not features
 *   Action    — two CTAs: primary "Postuler" (frame as exclusive),
 *               secondary preview link
 *
 * No "AI-powered". No "revolutionary". Specific firm names + concrete
 * numbers do the lifting. The `<em>` wrappers get the gradient
 * treatment from CSS — used sparingly to anchor the eye.
 */
export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="container">
        <span className="hero__badge">
          <span className="hero__badge-dot" aria-hidden />
          Beta privée · 47 places restantes · gratuit
        </span>

        <h1 className="hero__title">
          Postule à <em>McKinsey, Goldman, Anthropic</em>.
          <br />
          Sans perdre 300 heures dans 12 onglets.
        </h1>

        <p className="hero__subtitle">
          Career OS rassemble tout ton job hunt dans une seule app Mac.
          Tracker tes 40 candidatures, score ATS de ton CV en 2&nbsp;secondes, drill
          tes questions d'entretien — et un coach silencieux qui prépare la
          réponse pendant que tu réponds.
        </p>

        <div className="hero__cta-row">
          <a href="#beta" className="btn-primary">
            Postuler à la beta
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
          <span>Mac · macOS 13+</span>
          <span>Tout en local</span>
          <span>Réponse en 7 jours</span>
        </div>
      </div>
    </section>
  );
}
