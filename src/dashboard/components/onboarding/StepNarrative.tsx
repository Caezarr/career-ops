import { useState } from "react";
import { Pencil } from "lucide-react";
import NarrativeQuestion from "./NarrativeQuestion";

/**
 * Step 4 — the Career Narrative.
 *
 * The user answers up to 5 reflective prompts; the result is
 * compiled into a single Markdown blob (`buildProfileMarkdown`)
 * that the parent `Onboarding` component writes to
 * `user.profileMarkdown` on completion. Career OS reads this on
 * top of the structured fields when generating CVs and Copilot
 * answers — it's the human voice in the prompt context.
 *
 * Each question is individually skippable via "Skip cette
 * question" in the parent footer (the parent is the source of
 * truth for navigation). The whole step is also skippable via
 * "Skip pour plus tard" — that path leaves `answers` empty and
 * `profileMarkdown` ends up an empty string.
 *
 * UX flow:
 *   - One question at a time (sub-step 0..4)
 *   - After question 5, a recap card lets the user review +
 *     edit any section before moving on to FirstSource
 *
 * The component receives `answers` (5-entry array) + `setAnswers`
 * from the parent so the resume-mid-flow flag in the user slice
 * still works — the parent persists the array as part of the
 * narrative draft state.
 */

export const NARRATIVE_QUESTIONS = [
  {
    title: "Ton parcours en deux phrases",
    subtitle:
      "Comment t'es-tu retrouvé là où tu en es ? Le contexte qui explique ton trajet, sans CV-speak.",
    section: "Mon parcours",
  },
  {
    title: "Ta réalisation la plus marquante",
    subtitle:
      "Le projet ou le résultat dont tu es le plus fier. Avec un chiffre quantifié si possible.",
    section: "Réalisation marquante",
  },
  {
    title: "Ce que tu apportes de différent",
    subtitle:
      "La chose que tes anciens collègues mentionnent quand ils parlent de toi.",
    section: "Ce que j'apporte",
  },
  {
    title: "Un échec qui t'a changé",
    subtitle: "Court, honnête. C'est ce qui prouve que tu réfléchis.",
    section: "L'échec qui m'a fait grandir",
  },
  {
    title: "Le rôle ou l'entreprise que tu vises vraiment",
    subtitle:
      "Et pourquoi spécifiquement celle-là. Ce sera ton ancre quand tu prépareras un entretien.",
    section: "Mon ambition",
  },
] as const;

/** Build the final Markdown blob from the 5 answers. Skipped /
 *  empty answers are OMITTED entirely (no empty `## Section`
 *  headers). Trim + normalise whitespace per section. */
export function buildProfileMarkdown(answers: string[]): string {
  return NARRATIVE_QUESTIONS.map((q, i) => {
    const a = (answers[i] ?? "").trim();
    if (!a) return null;
    return `## ${q.section}\n\n${a}\n`;
  })
    .filter((x): x is string => x !== null)
    .join("\n");
}

export interface StepNarrativeProps {
  answers: string[];
  setAnswers: (next: string[]) => void;
  /** Sub-step inside the narrative (0..4 = questions, 5 = recap).
   *  Bound from the parent so the wizard's own "Skip cette
   *  question" / "Suivant" buttons drive navigation. */
  subStep: number;
  setSubStep: (n: number) => void;
}

export default function StepNarrative({
  answers,
  setAnswers,
  subStep,
  setSubStep,
}: StepNarrativeProps) {
  // Defensive — if a stale persisted array has fewer entries than
  // the question list, pad with empty strings so indexing is safe.
  const safeAnswers =
    answers.length === NARRATIVE_QUESTIONS.length
      ? answers
      : Array.from({ length: NARRATIVE_QUESTIONS.length }, (_, i) => answers[i] ?? "");

  function setOne(i: number, v: string) {
    const next = safeAnswers.slice();
    next[i] = v;
    setAnswers(next);
  }

  // Question view (subStep 0..4)
  if (subStep < NARRATIVE_QUESTIONS.length) {
    const q = NARRATIVE_QUESTIONS[subStep];
    return (
      <div className="onboarding__step">
        <span className="onboarding__eyebrow">
          Career Narrative · optionnel mais recommandé
        </span>
        <NarrativeQuestion
          index={subStep}
          total={NARRATIVE_QUESTIONS.length}
          title={q.title}
          subtitle={q.subtitle}
          value={safeAnswers[subStep] ?? ""}
          onChange={(v) => setOne(subStep, v)}
          onNext={() => setSubStep(subStep + 1)}
        />
      </div>
    );
  }

  // Recap view (subStep === 5)
  return <Recap answers={safeAnswers} onEdit={(i) => setSubStep(i)} />;
}

const Recap: React.FC<{ answers: string[]; onEdit: (i: number) => void }> = ({
  answers,
  onEdit,
}) => {
  const filled = answers.filter((a) => a.trim().length > 0).length;
  return (
    <div className="onboarding__step">
      <span className="onboarding__eyebrow">Career Narrative · récap</span>
      <h1 className="onboarding__title">Ton profil narratif</h1>
      <p className="onboarding__subtitle">
        {filled === 0
          ? "Rien de saisi. Tu pourras revenir l'écrire dans Settings → Profile à tout moment."
          : `${filled}/${NARRATIVE_QUESTIONS.length} sections renseignées. Career OS s'en sert dans chaque CV et chaque réponse Copilot.`}
      </p>

      <ul className="onboarding-narrative-recap">
        {NARRATIVE_QUESTIONS.map((q, i) => {
          const a = (answers[i] ?? "").trim();
          return (
            <li key={q.section} className="onboarding-narrative-recap__item">
              <div className="onboarding-narrative-recap__head">
                <span className="onboarding-narrative-recap__section">{q.section}</span>
                <button
                  type="button"
                  className="onboarding-narrative-recap__edit"
                  onClick={() => onEdit(i)}
                  aria-label={`Modifier ${q.section}`}
                >
                  <Pencil size={12} strokeWidth={2} />
                  <span>{a ? "Modifier" : "Ajouter"}</span>
                </button>
              </div>
              <p
                className={
                  "onboarding-narrative-recap__body" +
                  (a ? "" : " onboarding-narrative-recap__body--empty")
                }
              >
                {a || "— vide —"}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

/** Helper hook for the parent — owns the (subStep, setSubStep)
 *  pair so the parent doesn't have to thread it everywhere. */
export function useNarrativeSubStep() {
  return useState<number>(0);
}
