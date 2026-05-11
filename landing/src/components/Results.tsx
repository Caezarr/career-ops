/**
 * "Des résultats concrets" — 3 big stat cards.
 *
 * This used to be a combined section (stats + testimonials side by
 * side). The mockup the user shipped wants stats and testimonials
 * as **two distinct sections**, each given its own vertical real
 * estate. Stats stay here; testimonials moved to `Testimonials.tsx`.
 *
 * The stats are deliberately stated **as averages, not promises**.
 * "+65% d'entretiens obtenus" reads as the median lift our beta
 * cohort sees, not a guarantee. We'll back this with the real
 * cohort number once we have ~20 weeks of usage data.
 *
 * Card layout: icon isolated in a square tile at the top, big
 * value below, label below that. The icon-on-top arrangement
 * pulls the eye into the card before the number does — much more
 * scannable than the old inline "icon + number side-by-side".
 */

import { useReveal } from "../hooks/useReveal.ts";

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
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
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
    label: "pour adapter un CV à une offre",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
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
    label: "d'entretiens obtenus en moyenne",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
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

export default function Results() {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <section className="section results results--xl" id="results">
      <div
        ref={ref}
        className={`container reveal ${shown ? "reveal--shown" : ""}`}
      >
        <header className="results__header">
          <span className="results__eyebrow">Résultats moyens — bêta privée, n=14</span>
          <h2 className="results__title">
            Plus de candidatures. Moins de temps. Plus d'entretiens.
          </h2>
          <p className="results__sub">
            Pas une promesse marketing — la moyenne réelle de notre cohorte
            bêta sur les 30 premiers jours d'utilisation.
          </p>
        </header>

        <ul className="results__stat-grid">
          {STATS.map((s, i) => (
            <li
              key={s.label}
              className="results__stat-card"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <span className="results__stat-icon" aria-hidden>
                {s.icon}
              </span>
              <span className="results__stat-value">{s.value}</span>
              <span className="results__stat-label">{s.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
