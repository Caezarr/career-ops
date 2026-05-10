import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useAppStore } from "../../store";
import StepIdentity from "./StepIdentity";
import StepTargets, { trackLabel } from "./StepTargets";
import StepFirstCV from "./StepFirstCV";
import StepNarrative, {
  NARRATIVE_QUESTIONS,
  buildProfileMarkdown,
} from "./StepNarrative";
import StepFirstSource from "./StepFirstSource";
import "../../styles/onboarding.css";

const STEP_COUNT = 5;
const STEP_NARRATIVE = 3; // 0:Identity 1:Targets 2:CV 3:Narrative 4:FirstSource

/** First-launch setup wizard.
 *
 *  Mounted unconditionally by `DashboardApp` — guards itself on
 *  `user.onboarded` so we don't have to thread the flag through the
 *  routing tree. The wizard keeps its captured state local until the
 *  user finishes; only on `markOnboarded` do we merge into `user`,
 *  so a quit-mid-flow doesn't pollute the profile with half-typed
 *  values (the resume position is persisted via `onboardingStep`).
 *
 *  Steps 1 & 2 are required. Steps 3 / 4 / 5 are skippable.
 *
 *  Step 4 (Narrative) sub-steps internally over its 5 reflective
 *  prompts (`subStep` 0..4 = questions, 5 = recap). The wizard's
 *  primary "Suivant" button drives both the outer step and the
 *  inner narrative sub-step uniformly. */
export default function Onboarding() {
  const user = useAppStore((s) => s.user);
  const setOnboardingStep = useAppStore((s) => s.setOnboardingStep);
  const markOnboarded = useAppStore((s) => s.markOnboarded);

  const [step, setStep] = useState<number>(
    Math.max(0, Math.min(STEP_COUNT - 1, user.onboardingStep ?? 0)),
  );
  const [exiting, setExiting] = useState(false);
  const [direction, setDirection] = useState<"next" | "back">("next");

  // Identity (Step 1) — seeded from any persisted partial.
  const [firstName, setFirstName] = useState<string>(
    user.name?.split(" ")[0] ?? "",
  );
  const [school, setSchool] = useState<string>(user.school ?? "");
  const [schoolOther, setSchoolOther] = useState<string>("");

  // Targets (Step 2).
  const [tracks, setTracks] = useState<string[]>(user.targetTracks ?? []);

  // Narrative (Step 4) — 5 answer slots + an internal sub-step.
  // Seed from existing profileMarkdown so a returning user lands on
  // the recap with their previous answers pre-filled. (We accept a
  // small amount of fidelity loss — if the user hand-edited the
  // Markdown via Settings, sections may not roundtrip perfectly;
  // that's an acceptable tradeoff for resume support.)
  const [narrativeAnswers, setNarrativeAnswers] = useState<string[]>(() =>
    parseProfileMarkdown(user.profileMarkdown ?? ""),
  );
  const [narrativeSubStep, setNarrativeSubStep] = useState<number>(0);

  // Persist resume position whenever the user advances.
  useEffect(() => {
    setOnboardingStep(step);
  }, [step, setOnboardingStep]);

  const identityValid = useMemo(() => {
    if (!firstName.trim()) return false;
    if (!school) return false;
    if (school === "Autre" && !schoolOther.trim()) return false;
    return true;
  }, [firstName, school, schoolOther]);

  const targetsValid = tracks.length > 0;

  const canAdvance = useMemo(() => {
    if (step === 0) return identityValid;
    if (step === 1) return targetsValid;
    return true; // Steps 3 / 4 / 5 are always skippable.
  }, [step, identityValid, targetsValid]);

  // Inside the narrative step we sub-step BEFORE leaving to the next
  // outer step. The recap state (subStep === NARRATIVE_QUESTIONS.length)
  // is the only "ready to leave" state for the narrative step.
  const inNarrativeQuestion =
    step === STEP_NARRATIVE && narrativeSubStep < NARRATIVE_QUESTIONS.length;

  function goNext() {
    if (!canAdvance) return;
    // Inside narrative, advance the sub-step first; only when we hit
    // the recap (or pass it) do we leave the outer step.
    if (inNarrativeQuestion) {
      setNarrativeSubStep((n) => n + 1);
      return;
    }
    if (step === STEP_COUNT - 1) {
      finish();
      return;
    }
    setDirection("next");
    setStep((s) => Math.min(STEP_COUNT - 1, s + 1));
  }

  function goBack() {
    // Inside narrative, walk the sub-step back before exiting the
    // outer step. From the recap, "Retour" sends the user back to
    // the last question.
    if (step === STEP_NARRATIVE && narrativeSubStep > 0) {
      setNarrativeSubStep((n) => n - 1);
      return;
    }
    if (step === 0) return;
    setDirection("back");
    setStep((s) => Math.max(0, s - 1));
    // Whenever we leave the narrative outer step, snap its sub-step
    // back to the recap so re-entering shows the recap (not q1).
    if (step === STEP_NARRATIVE) {
      setNarrativeSubStep(NARRATIVE_QUESTIONS.length);
    }
  }

  /** Skip-this-question (narrative only) — wipes the current answer
   *  and advances the sub-step. Skip-the-whole-step (CV / Sources)
   *  is just `goNext()` because those steps don't have answers to
   *  wipe. */
  function skipCurrent() {
    if (inNarrativeQuestion) {
      const next = narrativeAnswers.slice();
      next[narrativeSubStep] = "";
      setNarrativeAnswers(next);
    }
    goNext();
  }

  /** Whole-step skip — used by the "Skip pour plus tard" button.
   *  For CV / Sources, identical to goNext. For narrative, it
   *  jumps over all sub-questions to the next outer step. */
  function skipStep() {
    if (step === STEP_NARRATIVE) {
      // Don't wipe answers — user may have completed some + skipped
      // the rest. The recap's "Modifier" buttons let them adjust.
      setNarrativeSubStep(NARRATIVE_QUESTIONS.length);
      setDirection("next");
      setStep((s) => Math.min(STEP_COUNT - 1, s + 1));
      return;
    }
    goNext();
  }

  function finish() {
    setExiting(true);
    const finalSchool = school === "Autre" ? schoolOther.trim() : school;
    const targetCompany = tracks.map(trackLabel).join(", ");
    const profileMarkdown = buildProfileMarkdown(narrativeAnswers);

    window.setTimeout(() => {
      markOnboarded({
        name: firstName.trim(),
        school: finalSchool,
        location: user.location || finalSchool,
        targetTracks: tracks,
        targetCompany: targetCompany || user.targetCompany,
        avatarInitials: firstName.trim().charAt(0).toUpperCase() || "",
        // Only overwrite profileMarkdown when the user actually wrote
        // something. Empty narrative = leave any pre-existing blob
        // alone (e.g. seeded from a future Settings → Profile editor).
        ...(profileMarkdown.trim().length > 0
          ? { profileMarkdown }
          : {}),
      });
    }, 320);
  }

  // The CTA / footer config varies per step. Centralise here.
  const isSkippableStep =
    step === 2 || step === STEP_NARRATIVE || step === STEP_COUNT - 1;
  const isLastOuterStep = step === STEP_COUNT - 1;
  const primaryLabel = isLastOuterStep
    ? "Plonger dans Career OS"
    : inNarrativeQuestion
      ? "Suivant"
      : "Suivant";
  const skipLabel = inNarrativeQuestion
    ? "Skip cette question"
    : "Skip pour plus tard";

  return (
    <div
      className={"onboarding-overlay" + (exiting ? " onboarding-overlay--out" : "")}
      role="dialog"
      aria-modal="true"
      aria-label="Configuration initiale"
    >
      <div className="onboarding-panel">
        <div
          className="onboarding__progress"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEP_COUNT}
          aria-valuenow={step + 1}
        >
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <span
              key={i}
              className={
                "onboarding__dot" +
                (i === step ? " onboarding__dot--active" : "") +
                (i < step ? " onboarding__dot--done" : "")
              }
              aria-hidden="true"
            />
          ))}
        </div>

        <div
          key={step + ":" + (step === STEP_NARRATIVE ? narrativeSubStep : 0)}
          className={
            "onboarding__stage onboarding__stage--" +
            (direction === "next" ? "in-next" : "in-back")
          }
        >
          {step === 0 && (
            <StepIdentity
              firstName={firstName}
              setFirstName={setFirstName}
              school={school}
              setSchool={setSchool}
              schoolOther={schoolOther}
              setSchoolOther={setSchoolOther}
            />
          )}
          {step === 1 && (
            <StepTargets selected={tracks} setSelected={setTracks} />
          )}
          {step === 2 && <StepFirstCV />}
          {step === STEP_NARRATIVE && (
            <StepNarrative
              answers={narrativeAnswers}
              setAnswers={setNarrativeAnswers}
              subStep={narrativeSubStep}
              setSubStep={setNarrativeSubStep}
            />
          )}
          {step === STEP_COUNT - 1 && <StepFirstSource />}
        </div>

        <div className="onboarding__footer">
          <div className="onboarding__footer-left">
            {(step > 0 || (step === STEP_NARRATIVE && narrativeSubStep > 0)) && (
              <button
                type="button"
                className="onboarding__btn onboarding__btn--ghost"
                onClick={goBack}
              >
                <ArrowLeft size={14} strokeWidth={2} />
                <span>Retour</span>
              </button>
            )}
          </div>

          <div className="onboarding__footer-right">
            {isSkippableStep && (
              <button
                type="button"
                className="onboarding__btn onboarding__btn--ghost"
                onClick={inNarrativeQuestion ? skipCurrent : skipStep}
              >
                {skipLabel}
              </button>
            )}
            <button
              type="button"
              className="onboarding__btn onboarding__btn--primary"
              onClick={goNext}
              disabled={!canAdvance}
            >
              <span>{primaryLabel}</span>
              {!isLastOuterStep && <ArrowRight size={14} strokeWidth={2} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Roundtrip a `profileMarkdown` blob back into the 5-answer array
 *  shape so a resume-mid-flow user sees their previous text. We
 *  match by the section header in `NARRATIVE_QUESTIONS` — anything
 *  that doesn't match a known section is dropped (acceptable —
 *  Settings → Profile editor will own free-form edits later). */
function parseProfileMarkdown(md: string): string[] {
  const blank = NARRATIVE_QUESTIONS.map(() => "");
  if (!md.trim()) return blank;

  const sectionByTitle = new Map<string, number>();
  NARRATIVE_QUESTIONS.forEach((q, i) => sectionByTitle.set(q.section, i));

  const out = blank.slice();
  // Greedy parse: split on `## ` headers, take the title from the
  // first line, content from the rest.
  const blocks = md.split(/\n## /).map((b, i) => (i === 0 ? b.replace(/^## /, "") : b));
  for (const block of blocks) {
    const newlineAt = block.indexOf("\n");
    if (newlineAt < 0) continue;
    const title = block.slice(0, newlineAt).trim();
    const body = block.slice(newlineAt + 1).trim();
    const idx = sectionByTitle.get(title);
    if (idx !== undefined && body) {
      out[idx] = body;
    }
  }
  return out;
}
