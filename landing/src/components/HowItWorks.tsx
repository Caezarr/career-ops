/**
 * 4-step process matching the v2 mockup ("Trouve → Adapte →
 * Prépare → Décroche"). Visual is a horizontal timeline on
 * desktop, vertical stack on mobile. Each step has a numbered
 * circle icon + a short title + one-liner body.
 *
 * Connecting horizontal line between steps is a CSS
 * pseudo-element drawn in landing.css.
 */

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
    body: "On détecte les bonnes opportunités, tu choisis.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
        <path d="M16.5 16.5 L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    num: "2.",
    title: "Adapte",
    body: "Ton CV et ta lettre sont optimisés pour chaque offre.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 12 H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="9" cy="12" r="2.2" fill="currentColor" />
        <circle cx="15" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="15" cy="18" r="2.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M15 8 V12 M15 16 V12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    num: "3.",
    title: "Prépare",
    body: "Tu t'entraînes et arrives confiant le jour J.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 3 L4 7 L4 12 C 4 17 8 21 12 22 C 16 21 20 17 20 12 L20 7 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 12 L11 14 L15 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    num: "4.",
    title: "Décroche",
    body: "Passe tes entretiens et reçois les meilleures offres.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M7 4 H17 V8 a5 5 0 0 1 -10 0 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 12 L9 16 H15 V12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 20 H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M5 5 L3 5 V8 a3 3 0 0 0 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M19 5 L21 5 V8 a3 3 0 0 1 -3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section className="section how-it-works" id="how">
      <div className="container">
        <p className="how-it-works__eyebrow">Un process simple en 4 étapes</p>

        <div className="how-it-works__timeline">
          {STEPS.map((s) => (
            <div className="how-it-works__step" key={s.title}>
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
