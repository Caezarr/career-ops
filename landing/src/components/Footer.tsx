/**
 * Footer v2 — 4 columns matching the mockup:
 *   Produit / Ressources / Entreprise / Légal
 *
 * Brand block sits on the left with social icons underneath.
 * Bottom rule has the copyright line.
 *
 * Hash anchors for nav-internal links + real URLs for external
 * ones (GitHub, mailto). Privacy + Terms are served as raw .md
 * files from `landing/public/` (the static host handles them).
 */

interface Column {
  title: string;
  links: Array<{
    label: string;
    href: string;
    external?: boolean;
    /** When set, the link doesn't navigate — it opens an overlay
     *  (currently only "demo" is supported, hooked to DemoModal). */
    action?: "demo";
  }>;
}

const COLUMNS: Column[] = [
  {
    title: "Produit",
    links: [
      { label: "Fonctionnalités", href: "#features" },
      { label: "Comment ça marche", href: "#how" },
      { label: "Résultats", href: "#results" },
      { label: "Témoignages", href: "#testimonials" },
      { label: "Postuler à la bêta", href: "#beta" },
    ],
  },
  {
    title: "Ressources",
    links: [
      { label: "Démo (1 min)", href: "#beta", action: "demo" },
      { label: "Blog", href: "/blog/" },
      { label: "Comment rentrer chez Bain", href: "/blog/comment-rentrer-chez-bain.html" },
      { label: "Le CV qui passe les ATS", href: "/blog/cv-qui-passe-ats-top-firms.html" },
      { label: "Préparation entretien de cas", href: "/blog/preparation-entretien-cas-mbb.html" },
    ],
  },
  {
    title: "Entreprise",
    links: [
      { label: "À propos", href: "/a-propos.html" },
      { label: "Contact", href: "mailto:gabranpro@gmail.com" },
      { label: "Partenariats", href: "mailto:gabranpro@gmail.com" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Mentions légales", href: "/legal/mentions-legales.html" },
      { label: "CGU", href: "/legal/cgu.html" },
      { label: "Confidentialité", href: "/legal/confidentialite.html" },
      { label: "Cookies", href: "/legal/cookies.html" },
    ],
  },
];

const SOCIALS = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/gabriel-rance",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14zM8.5 18v-7H6v7h2.5zM7.25 9.7a1.45 1.45 0 1 0 0-2.9 1.45 1.45 0 0 0 0 2.9zM18 18v-3.85c0-2.31-1.24-3.4-2.9-3.4a2.5 2.5 0 0 0-2.27 1.25V11H10.4v7h2.5v-3.7c0-1.04.5-1.65 1.42-1.65.93 0 1.18.6 1.18 1.69V18H18z" />
      </svg>
    ),
  },
  {
    label: "X",
    href: "https://twitter.com",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M18.9 1.6h3.7l-8 9.2 9.4 12.6h-7.4l-5.8-7.6-6.6 7.6H.5l8.6-9.9L0 1.6h7.6l5.2 7 5.5-7zm-1.3 19.7h2L6.6 3.6H4.4l13.2 17.7z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "https://instagram.com",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: "GitHub",
    href: "https://github.com/Caezarr/career-ops",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2 0 1.8 1.3 1.8 1.3 1.1 1.9 2.9 1.4 3.6 1 .1-.8.4-1.4.7-1.7-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.3-3.3-.1-.3-.6-1.5.1-3.2 0 0 1-.3 3.3 1.2A11.5 11.5 0 0 1 12 5.8a11.5 11.5 0 0 1 3 .4c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.2 2.9.1 3.2.8.9 1.3 2 1.3 3.3 0 4.7-2.9 5.7-5.5 6 .4.4.8 1.1.8 2.3v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3z" />
      </svg>
    ),
  },
];

export default function Footer() {
  return (
    <footer className="footer footer--v2">
      <div className="container">
        <div className="footer__grid">
          {/* ── Brand + socials ───────────────────────────────── */}
          <div className="footer__brand-block">
            <div className="footer__brand-row">
              <img
                src="/favicon.png"
                alt=""
                width={28}
                height={28}
                className="footer__brand-mark"
              />
              <span className="footer__brand-name">Career OS</span>
            </div>
            <p className="footer__brand-tagline">
              L'OS de carrière pour viser haut.
              <br />
              Moins d'heures. Plus d'entretiens. Plus d'offres.
            </p>
            <div className="footer__socials">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  className="footer__social"
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={s.label}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* ── Link columns ──────────────────────────────────── */}
          {COLUMNS.map((col) => (
            <div className="footer__col" key={col.title}>
              <h4 className="footer__col-title">{col.title}</h4>
              <ul className="footer__col-list">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.action === "demo" ? (
                      <a
                        href={link.href}
                        onClick={(e) => {
                          e.preventDefault();
                          window.dispatchEvent(
                            new CustomEvent("careeros:open-demo"),
                          );
                        }}
                      >
                        {link.label}
                      </a>
                    ) : (
                      <a
                        href={link.href}
                        target={link.external ? "_blank" : undefined}
                        rel={link.external ? "noreferrer noopener" : undefined}
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer__bottom">
          © {new Date().getFullYear()} Career OS — Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
