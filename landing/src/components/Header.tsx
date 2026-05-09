/**
 * Sticky header with frosted backdrop. Brand left, anchor links centre,
 * primary CTA right. Hidden nav links on mobile (CTA stays).
 */
export default function Header() {
  return (
    <header className="header">
      <div className="header__inner">
        <a href="#top" className="header__brand" aria-label="Career OS">
          <span className="header__logo" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 3 L13 3 L13 6 L6.5 6 L6.5 7.5 L11.5 7.5 L11.5 10.5 L6.5 10.5 L6.5 13 L3 13 Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span>Career OS</span>
        </a>

        <nav className="header__nav" aria-label="Sections">
          <a href="#features" className="header__nav-link">
            Fonctionnalités
          </a>
          <a href="#how" className="header__nav-link">
            Comment ça marche
          </a>
          <a href="#privacy" className="header__nav-link">
            Privacy
          </a>
        </nav>

        <a href="#beta" className="header__cta">
          Rejoindre la beta
        </a>
      </div>
    </header>
  );
}
