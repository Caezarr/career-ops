/**
 * Four-step journey from install to interview win. Each step is
 * outcome-led ("Lance le Copilot, plus jamais figé") rather than
 * procedure-led ("Click here, then click there"). The numbers stay
 * monospaced and muted so they read as positions, not importance.
 */

const STEPS = [
  {
    n: "01",
    title: "Reçois ton accès",
    body:
      "Tu postules à la beta. Réponse sous 7 jours, DMG signé envoyé par mail. Première session : 90 secondes pour configurer.",
  },
  {
    n: "02",
    title: "Importe ton CV",
    body:
      "Drag-and-drop ton PDF. Career OS le parse en local, le compare à la JD que tu vises, te dit exactement quoi changer pour passer l'ATS.",
  },
  {
    n: "03",
    title: "Track tes 40 candidatures",
    body:
      "Sync auto depuis Greenhouse, Lever, Ashby, YC, JobTeaser. Pipeline drag-and-drop. War Room par job pour préparer chaque entretien.",
  },
  {
    n: "04",
    title: "Lance le Copilot avant le call",
    body:
      "Hotkey ⌘⇧Espace. Transcription locale, réponses en pyramide STAR, 80 mots max. Tu ne lis pas — tu t'inspires, tu reformules.",
  },
];

export default function HowItWorks() {
  return (
    <section className="section" id="how">
      <div className="container">
        <span className="section__eyebrow">4 étapes · 5 minutes au total</span>
        <h2 className="section__title">
          De la candidature à l'offre — sans friction.
        </h2>

        <div className="how__steps">
          {STEPS.map((s) => (
            <div className="how__step" key={s.n}>
              <span className="how__step-num">{s.n}</span>
              <h3 className="how__step-title">{s.title}</h3>
              <p className="how__step-body">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
