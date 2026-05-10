import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useAppStore } from "../../store";
import StepIdentity from "./StepIdentity";
import StepTargets, { trackLabel } from "./StepTargets";
import StepFirstCV from "./StepFirstCV";
import StepFirstSource from "./StepFirstSource";
import "../../styles/onboarding.css";

const STEP_COUNT = 4;

/** First-launch setup wizard.
 *
 *  Mounted unconditionally by `DashboardApp` — guards itself on
 *  `user.onboarded` so we don't have to thread the flag through the
 *  routing tree. The wizard keeps its captured state local until the
 *  user finishes; only on `markOnboarded` do we merge into `user`,
 *  so a quit-mid-flow doesn't pollute the profile with half-typed
 *  values (the resume position is persisted via `onboardingStep`).
 *
 *  Step 1 / 2 are required. Step 3 / 4 are skippable (they touch
 *  separate slices — `cvs` / `ingestSources` — directly when the
 *  user opts in, so completion isn't gated on them). */
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

  // Persist resume position whenever the user advances.
  useEffect(() => {
    setOnboardingStep(step);
  }, [step, setOnboardingStep]);

  // Identity validation — Step 1 needs a non-empty prénom + a chosen
  // école (with the free-text fallback when "Autre" is picked).
  const identityValid = useMemo(() => {
    if (!firstName.trim()) return false;
    if (!school) return false;
    if (school === "Autre" && !schoolOther.trim()) return false;
    return true;
  }, [firstName, school, schoolOther]);

  const targetsValid = tracks.length > 0;

  // Whether the current step's primary action should be enabled.
  const canAdvance = useMemo(() => {
    if (step === 0) return identityValid;
    if (step === 1) return targetsValid;
    return true; // Steps 3 / 4 are always skippable.
  }, [step, identityValid, targetsValid]);

  function goNext() {
    if (!canAdvance) return;
    if (step === STEP_COUNT - 1) {
      finish();
      return;
    }
    setDirection("next");
    setStep((s) => Math.min(STEP_COUNT - 1, s + 1));
  }

  function goBack() {
    if (step === 0) return;
    setDirection("back");
    setStep((s) => Math.max(0, s - 1));
  }

  function finish() {
    setExiting(true);
    const finalSchool =
      school === "Autre" ? schoolOther.trim() : school;
    const targetCompany = tracks.map(trackLabel).join(", ");

    // 320ms — matches the fade-out animation duration in onboarding.css.
    window.setTimeout(() => {
      markOnboarded({
        name: firstName.trim(),
        school: finalSchool,
        // Mirror école into `location` only if location is empty —
        // we don't want to clobber a real city the user typed via
        // Settings later. Empty string is fine; downstream consumers
        // already handle that.
        location: user.location || finalSchool,
        targetTracks: tracks,
        targetCompany: targetCompany || user.targetCompany,
        avatarInitials: firstName.trim().charAt(0).toUpperCase() || "",
      });
    }, 320);
  }

  return (
    <div
      className={"onboarding-overlay" + (exiting ? " onboarding-overlay--out" : "")}
      role="dialog"
      aria-modal="true"
      aria-label="Configuration initiale"
    >
      <div className="onboarding-panel">
        <div className="onboarding__progress" role="progressbar" aria-valuemin={1} aria-valuemax={STEP_COUNT} aria-valuenow={step + 1}>
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
          key={step}
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
          {step === 3 && <StepFirstSource />}
        </div>

        <div className="onboarding__footer">
          <div className="onboarding__footer-left">
            {step > 0 && (
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
            {(step === 2 || step === 3) && (
              <button
                type="button"
                className="onboarding__btn onboarding__btn--ghost"
                onClick={goNext}
              >
                Skip pour plus tard
              </button>
            )}
            <button
              type="button"
              className="onboarding__btn onboarding__btn--primary"
              onClick={goNext}
              disabled={!canAdvance}
            >
              <span>
                {step === STEP_COUNT - 1
                  ? "Plonger dans Career OS"
                  : "Suivant"}
              </span>
              {step !== STEP_COUNT - 1 && (
                <ArrowRight size={14} strokeWidth={2} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
