/**
 * 4-step process matching the v2 mockup ("Trouve → Adapte →
 * Prépare → Décroche"). Visual is a horizontal timeline on
 * desktop, vertical stack on mobile. Each step has a numbered
 * circle icon + a short title + one-liner body.
 *
 * Connecting horizontal line between steps is a CSS
 * pseudo-element drawn in landing.css.
 *
 * Steps fade in with a staggered delay as the section enters the
 * viewport (`useReveal`).
 */

import { useReveal } from "../hooks/useReveal.ts";

interface Step {
  num: string;
  title: string;
  body: string;
  icon: React.ReactNode;
}

const STEPS: Step[] = [
  {
    num: "1.",
    title: "Trouve",
    body: "Optimise ta recherche d'opportunités, ta cible.",
    // Magnifying glass — search/discovery
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="M16.5 16.5 L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    num: "2.",
    title: "Adapte",
    body: "Ton CV et ta lettre sont optimisés pour chaque offre.",
    // Horizontal sliders — adapt/configure
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 7 H20 M4 12 H20 M4 17 H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="10" cy="7" r="2.4" fill="currentColor" stroke="currentColor" strokeWidth="2" />
        <circle cx="16" cy="12" r="2.4" fill="currentColor" stroke="currentColor" strokeWidth="2" />
        <circle cx="8" cy="17" r="2.4" fill="currentColor" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    num: "3.",
    title: "Prépare",
    body: "Tu t'entraînes et révise conforté sur l'IA.",
    // Audio waveform — voice prep / interview rehearsal
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 11 V13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M7 9 V15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M10 5 V19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M13 8 V16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M16 6 V18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M19 10 V14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    num: "4.",
    title: "Décroche",
    body: "Reçois tes entretiens et reçois les meilleures offres.",
    // User silhouette in circle — candidate hired
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="9" r="3.2" stroke="currentColor" strokeWidth="2" />
        <path d="M5 19 C 5.5 15 8.5 13 12 13 S 18.5 15 19 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <section className="section how-it-works" id="how">
      <div
        ref={ref}
        className={`container reveal ${shown ? "reveal--shown" : ""}`}
      >
        <header className="section__header">
          <span className="section__eyebrow">Comment ça marche</span>
          <h2 className="section__title">
            Du chaos à l'offre signée en 4 étapes.
          </h2>
          <p className="section__sub">
            Pas de méthode magique. Un système exécutable dès lundi matin.
          </p>
        </header>

        <div className="how-it-works__timeline">
          {STEPS.map((s, i) => (
            <div
              className="how-it-works__step"
              key={s.title}
              style={{ transitionDelay: `${i * 110}ms` }}
            >
              <div className="how-it-works__icon" aria-hidden>
                {s.icon}
              </div>
              <h3 className="how-it-works__title">
                <span className="how-it-works__num">{s.num}</span>
                {" "}
                {s.title}
              </h3>
              <p className="how-it-works__body">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
