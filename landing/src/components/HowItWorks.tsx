/**
 * Four-step journey from install to interview win. The numbers are
 * monospaced + muted so they read as positions, not as importance —
 * the steps speak for themselves.
 */

const STEPS = [
  {
    n: "01",
    title: "Installe l'app",
    body:
      "Téléchargement DMG signé. Première session 90s : choix tracker / CV / Copilot.",
  },
  {
    n: "02",
    title: "Importe ton CV",
    body:
      "PDF parsé en local par Docling. Analyse ATS contre la JD. Suggestions de reformulation.",
  },
  {
    n: "03",
    title: "Track tes candidatures",
    body:
      "Sync depuis Greenhouse, Lever, Ashby, YC, JobTeaser. Pipeline drag-and-drop, vue War Room par job.",
  },
  {
    n: "04",
    title: "Lance le Copilot",
    body:
      "Hotkey Cmd+Shift+Space avant le call. Transcription locale, réponses en STAR, format 80 mots max.",
  },
];

export default function HowItWorks() {
  return (
    <section className="section" id="how">
      <div className="container">
        <span className="section__eyebrow">4 étapes · 5 minutes au total</span>
        <h2 className="section__title">De l'installation à ton premier entretien préparé.</h2>

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
