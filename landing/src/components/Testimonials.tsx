/**
 * "Ils ont accéléré leur recherche" — testimonials section.
 *
 * Two big horizontal cards. Each card has:
 *   - a left-side block: round photo, name, role, ex-firm badge
 *   - the quote takes the rest of the card
 *
 * This split mirrors the mockup the user shipped. Previous version
 * crammed stats + testimonials into a single row; the new layout
 * gives testimonials their own breathing room and lets each quote
 * read as a paragraph instead of a chip.
 *
 * Ex-firm badge:
 *   The "ex-Bain" / "ex-Google" line below the role is what makes
 *   the social proof land. We render the firm name as a small pill
 *   so it's visually distinct from the job title.
 *
 * Avatars:
 *   `landing/public/assets/testimonial-camille.jpg`
 *   `landing/public/assets/testimonial-thomas.jpg`
 *   If the file is missing, the initials fallback fills in.
 */

import { useReveal } from "../hooks/useReveal.ts";

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  exFirm: string;
  photo: string;
  initials: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Career OS m'a fait gagner un temps fou. J'ai décroché 4 entretiens en 10 jours au lieu de courir après mes outils.",
    name: "Camille R.",
    role: "Consultante",
    exFirm: "ex-Bain",
    photo: "testimonial-camille.png",
    initials: "CR",
  },
  {
    quote:
      "Le brief d'entretien et le suivi m'ont enfin donné un système. J'exécute mieux, et ça se voit dans mes résultats.",
    name: "Thomas L.",
    role: "PM",
    exFirm: "ex-Google",
    photo: "testimonial-thomas.png",
    initials: "TL",
  },
];

export default function Testimonials() {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <section className="section testimonials" id="testimonials">
      <div
        ref={ref}
        className={`container reveal ${shown ? "reveal--shown" : ""}`}
      >
        <header className="testimonials__header">
          <span className="testimonials__eyebrow">Témoignages bêta</span>
          <h2 className="testimonials__title">
            Ils visaient haut. Ils ont signé en 30 jours.
          </h2>
        </header>

        <div className="testimonials__grid">
          {TESTIMONIALS.map((t, i) => (
            <article
              className="testimonial-card"
              key={t.name}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="testimonial-card__author">
                <div className="testimonial-card__avatar">
                  <img
                    src={`/assets/${t.photo}`}
                    alt={t.name}
                    className="testimonial-card__avatar-img"
                    loading="lazy"
                    onError={(e) => {
                      const el = e.currentTarget;
                      el.style.display = "none";
                      const sib = el.nextElementSibling as HTMLElement | null;
                      if (sib) sib.style.display = "flex";
                    }}
                  />
                  <span
                    className="testimonial-card__avatar-initials"
                    style={{ display: "none" }}
                    aria-hidden
                  >
                    {t.initials}
                  </span>
                </div>
                <div className="testimonial-card__id">
                  <div className="testimonial-card__name">{t.name}</div>
                  <div className="testimonial-card__role">{t.role}</div>
                  <span className="testimonial-card__pill">{t.exFirm}</span>
                </div>
              </div>

              <p className="testimonial-card__quote">
                «&nbsp;{t.quote}&nbsp;»
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
