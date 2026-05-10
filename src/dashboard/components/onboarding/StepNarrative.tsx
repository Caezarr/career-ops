/** Sprint 6 — Career Narrative step. Captures the free-form
 *  context that drives `profile.md`: 4 reflective prompts, all
 *  skippable. The four raw answers are then sent to Claude (via
 *  the parent's `polishProfileMarkdown` call in `finish()`) which
 *  reformulates them into a structured Markdown narrative the CV
 *  generator + Copilot can pull from.
 *
 *  Voice-to-text was prototyped via `webkitSpeechRecognition` but
 *  Tauri 2's WKWebView blocks it by default (no microphone
 *  permission plumbing through to the webview). Re-introducing it
 *  cleanly requires a dedicated Rust command around the Apple
 *  Speech framework — tracked separately. For now: keyboard only,
 *  honest UX.
 *
 *  The parent (`Onboarding.tsx`) owns the 4 string answers and
 *  builds the Markdown blob in `finish()`. We don't persist the raw
 *  Q&A — only the assembled `profileMarkdown` lives in
 *  `user.profileMarkdown`. */

const PROMPTS: { id: NarrativeKey; label: string; placeholder: string }[] = [
  {
    id: "story",
    label: "Ton parcours en 2-3 phrases",
    placeholder:
      "Ex: Diplômée HEC en 2024, j'ai 2 ans d'expérience en strategy chez BCG. Je vise un MBB ou un fonds VC pour 2027.",
  },
  {
    id: "wins",
    label: "Une expérience qui t'a marqué (chiffrée si possible)",
    placeholder:
      "Ex: J'ai mené un projet de transformation digitale pour un retailer top 10 — 12M€ d'economies sur 18 mois.",
  },
  {
    id: "lesson",
    label: "Un échec et ce que tu en as tiré",
    placeholder:
      "Ex: J'ai sous-estimé l'engagement stakeholder sur un projet IT — j'ai appris à passer 30% du temps en alignement avant de spec.",
  },
  {
    id: "north_star",
    label: "Ce que tu cherches vraiment dans ton prochain poste",
    placeholder:
      "Ex: Une équipe data-driven, un VP qui mentore, et un sujet à fort impact sociétal (climate, healthtech).",
  },
];

export type NarrativeKey = "story" | "wins" | "lesson" | "north_star";
export type NarrativeAnswers = Record<NarrativeKey, string>;

interface Props {
  answers: NarrativeAnswers;
  setAnswers: (next: NarrativeAnswers) => void;
}

export default function StepNarrative({ answers, setAnswers }: Props) {
  function setOne(key: NarrativeKey, value: string) {
    setAnswers({ ...answers, [key]: value });
  }

  return (
    <div className="onboarding__step onboarding__step--compact">
      <h1 className="onboarding__title">Raconte-toi</h1>
      <p className="onboarding__subtitle">
        On structure ensuite tes réponses avec Claude pour générer un
        narratif réutilisable par les CVs tirés et le Copilot. Tout est
        facultatif — vise 2-3 phrases par question.
      </p>

      {PROMPTS.map((p) => (
        <div className="onboarding__field" key={p.id}>
          <label className="onboarding__label" htmlFor={`narrative-${p.id}`}>
            {p.label}
          </label>
          <textarea
            id={`narrative-${p.id}`}
            className="onboarding__input onboarding__textarea"
            value={answers[p.id]}
            onChange={(e) => setOne(p.id, e.target.value)}
            placeholder={p.placeholder}
            rows={3}
            style={{
              height: "auto",
              minHeight: 72,
              padding: "10px 12px",
              resize: "vertical",
              lineHeight: 1.5,
            }}
          />
        </div>
      ))}
    </div>
  );
}

/** Build a structured Markdown blob from the 4 answers. Used as
 *  a fallback when the LLM polish path is unavailable (no
 *  Anthropic key, network failure). Empty answers are omitted so
 *  a partial fill still produces a clean profile.md, not a wall
 *  of empty headings. The headings mirror the placeholder template
 *  in `ProfileCard` for editing consistency. */
export function buildProfileMarkdown(answers: NarrativeAnswers): string {
  const sections: string[] = [];
  if (answers.story.trim()) {
    sections.push(`# Quick story\n${answers.story.trim()}`);
  }
  if (answers.wins.trim()) {
    sections.push(`# Highlights\n${answers.wins.trim()}`);
  }
  if (answers.lesson.trim()) {
    sections.push(`# Anecdotes & lessons\n${answers.lesson.trim()}`);
  }
  if (answers.north_star.trim()) {
    sections.push(`# What I'm looking for next\n${answers.north_star.trim()}`);
  }
  return sections.join("\n\n");
}
