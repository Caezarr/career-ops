/**
 * Minimal footer — brand left, legal/social/download links right.
 * Privacy + Terms are RGPD-compliant FR drafts in `landing/public/`,
 * served directly as `.md` files by the static host.
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
            <a
              href="https://github.com/Caezarr/career-ops/releases/latest"
              target="_blank"
              rel="noreferrer"
            >
              Télécharger
            </a>
            <a href="https://github.com/Caezarr/career-ops" target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a href="/privacy.md">Confidentialité</a>
            <a href="/terms.md">CGU</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
