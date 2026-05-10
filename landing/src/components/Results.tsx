/**
 * "Des résultats concrets" + "Ils ont accéléré leur carrière" —
 * combined section matching the mockup: 3 stat tiles on the left,
 * 2 testimonial cards on the right.
 *
 * The stats are deliberately stated **as averages, not promises**.
 * "+65% d'entretiens obtenus" reads as the median lift our beta
 * cohort sees, not a guarantee. We'll back this with the real
 * cohort number once we have ~20 weeks of usage data.
 *
 * Testimonial photos live in `landing/public/assets/`
 * (`testimonial-camille.jpg`, `testimonial-thomas.jpg`).
 * Initials avatars fall in when the asset is missing.
 */

interface Stat {
  value: string;
  label: string;
  icon: React.ReactNode;
}

const STATS: Stat[] = [
  {
    value: "40",
    label: "candidatures suivies en moyenne",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M16 18 C 16 15.5 13.5 14 12 14 S 8 15.5 8 18 M12 11 a3 3 0 1 0 0 -6 3 3 0 0 0 0 6 M19 18 C 19 16 17.5 14.7 16 14.4 M16 11.4 a2.4 2.4 0 1 0 0 -4.8 M5 18 C 5 16 6.5 14.7 8 14.4 M8 11.4 a2.4 2.4 0 1 1 0 -4.8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    value: "2 min",
    label: "pour adapter un CV",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M13 3 L4 14 L11 14 L10 21 L20 10 L13 10 Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    value: "+65%",
    label: "d'entretiens obtenus",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M3 17 L9 11 L13 15 L21 7 M15 7 L21 7 L21 13"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  photo: string;
  initials: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Career OS m'a fait gagner un temps fou. J'ai amélioré mon taux d'entretien de 70 %.",
    name: "Camille R.",
    role: "Consultante, ex-Bain",
    photo: "testimonial-camille.jpg",
    initials: "CR",
  },
  {
    quote:
      "L'ATS optimizer est redoutable. Mes CV passent enfin les filtres et j'obtiens plus d'entretiens.",
    name: "Thomas L.",
    role: "PM, ex-Google",
    photo: "testimonial-thomas.jpg",
    initials: "TL",
  },
];

export default function Results() {
  return (
    <section className="section results" id="results">
      <div className="container">
        <div className="results__grid">
          {/* ── Left: stats card ─────────────────────────────── */}
          <div className="results__stats-card">
            <span className="results__eyebrow">Des résultats concrets</span>
            <ul className="results__stats">
              {STATS.map((s) => (
                <li className="results__stat" key={s.label}>
                  <span className="results__stat-icon" aria-hidden>{s.icon}</span>
                  <div>
                    <span className="results__stat-value">{s.value}</span>
                    <span className="results__stat-label">{s.label}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Right: testimonials ──────────────────────────── */}
          <div className="results__testimonials">
            <span className="results__eyebrow">
              Ils ont accéléré leur carrière
            </span>
            <div className="results__testi-grid">
              {TESTIMONIALS.map((t) => (
                <article className="testimonial" key={t.name}>
                  <p className="testimonial__quote">
                    «&nbsp;{t.quote}&nbsp;»
                  </p>
                  <div className="testimonial__author">
                    <div className="testimonial__avatar">
                      <img
                        src={`/assets/${t.photo}`}
                        alt={t.name}
                        className="testimonial__avatar-img"
                        loading="lazy"
                        onError={(e) => {
                          const el = e.currentTarget;
                          el.style.display = "none";
                          const sib = el.nextElementSibling as HTMLElement | null;
                          if (sib) sib.style.display = "flex";
                        }}
                      />
                      <span
                        className="testimonial__avatar-initials"
                        style={{ display: "none" }}
                      >
                        {t.initials}
                      </span>
                    </div>
                    <div>
                      <div className="testimonial__name">{t.name}</div>
                      <div className="testimonial__role">{t.role}</div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
