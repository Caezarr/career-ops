import ThemeToggle from "./ThemeToggle.tsx";

/**
 * Sticky header with frosted backdrop. Brand left, anchor links
 * centre, theme toggle + primary CTA right. Nav links hide on
 * mobile (CTA + toggle stay).
 *
 * Anchor clicks scroll smoothly thanks to the global
 * `scroll-behavior: smooth` rule in tokens.css; sections have
 * `scroll-margin-top: 80px` so the sticky header doesn't crop
 * the destination.
 */
export default function Header() {
  return (
    <header className="header">
      <div className="header__inner">
        <a href="#top" className="header__brand" aria-label="Career OS">
          {/* The icon-only "C" mark + the HTML wordmark. We avoid
              the bundled horizontal logo PNG because it has too
              much built-in padding and the wordmark colour can't
              react to the theme toggle. PNG icon stays crisp at
              24px (source is 1254×1254). */}
          <img
            src="/favicon.png"
            alt=""
            className="header__logo"
            width="24"
            height="24"
            style={{ borderRadius: 0, background: "transparent" }}
          />
          <span>Career OS</span>
        </a>

        <nav className="header__nav" aria-label="Sections">
          <a href="#features" className="header__nav-link">
            Fonctionnalités
          </a>
          <a href="#how" className="header__nav-link">
            Comment ça marche
          </a>
          <a href="#results" className="header__nav-link">
            Résultats
          </a>
          <a href="#testimonials" className="header__nav-link">
            Témoignages
          </a>
          <a href="/blog/" className="header__nav-link">
            Blog
          </a>
          {/* Tarifs is intentionally absent — bêta gratuite. We'll
              add it back when the paid Pro tier ships. */}
        </nav>

        <div className="header__right">
          <ThemeToggle />
          <a href="/a-propos.html" className="header__nav-link header__nav-link--cta-ghost">
            À propos
          </a>
          <a href="#beta" className="header__cta">
            Réserver ma place
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden style={{ marginLeft: 4 }}>
              <path d="M3 8 H13 M9 4 L13 8 L9 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}
