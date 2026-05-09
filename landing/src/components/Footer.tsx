/**
 * Minimal footer — brand left, legal/social right. The legal links
 * are placeholders today; CNIL-required mentions ("mentions légales",
 * "politique de confidentialité") need real text before any paid
 * advertising spend in France.
 */
export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__inner">
          <div className="footer__brand">
            <span>Career OS</span>
            <span style={{ color: "var(--text-3)", fontWeight: 400 }}>
              · construit en solo, en France
            </span>
          </div>
          <nav className="footer__links" aria-label="Liens">
            <a href="https://github.com/Caezarr/career-ops" target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a href="#privacy">Privacy</a>
            <a href="/legal" aria-disabled="true" tabIndex={-1} style={{ opacity: 0.6 }}>
              Mentions légales
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
