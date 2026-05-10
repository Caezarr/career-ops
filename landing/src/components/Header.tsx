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
          {/* Real brand logo. The image's "Career OS" wordmark is
              dark-on-light by design — relies on the theme cascade
              CSS to invert in dark mode (see `header.css`). Width
              caps with min-w to stay readable on narrow screens. */}
          <img
            src="/logo.png"
            alt="Career OS"
            className="header__logo-img"
            width="140"
            height="32"
          />
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

        <div className="header__right">
          <ThemeToggle />
          <a href="#beta" className="header__cta">
            Postuler à la beta
          </a>
        </div>
      </div>
    </header>
  );
}
