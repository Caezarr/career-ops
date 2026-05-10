import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useAppStore } from "../../store";
import type { User } from "../../store";
import StepIdentity from "./StepIdentity";
import StepTargets, { trackLabel } from "./StepTargets";
import StepBackground from "./StepBackground";
import StepFirstCV from "./StepFirstCV";
import StepNarrative, {
  buildProfileMarkdown,
  type NarrativeAnswers,
} from "./StepNarrative";
import StepFirstSource from "./StepFirstSource";
import { readAnthropicKey } from "../../lib/secrets";
import { polishProfileMarkdown } from "../../lib/polishProfile";
import "../../styles/onboarding.css";

// Sprint 6 (CV OCR + extended profile + narrative): 6-step wizard.
// Order: Identity → Targets → Background → FirstCV → Narrative →
// FirstSource. Background is captured BEFORE the CV upload so a
// user who skips the PDF still leaves with a usable profile;
// Narrative comes AFTER the CV so the auto-extracted contact
// fields are already in place when the user starts thinking
// about their story.
const STEP_COUNT = 6;

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
  // Sprint 6: in-flight while Claude polishes the narrative into a
  // structured profile.md. Drives the "Optimisation de ton profil…"
  // overlay shown over the wizard during finish().
  const [polishing, setPolishing] = useState(false);

  // Identity (Step 1) — seeded from any persisted partial.
  const [firstName, setFirstName] = useState<string>(
    user.name?.split(" ")[0] ?? "",
  );
  const [school, setSchool] = useState<string>(user.school ?? "");
  const [schoolOther, setSchoolOther] = useState<string>("");
  const [degree, setDegree] = useState<string>(user.degree ?? "");
  const [gradYear, setGradYear] = useState<string>(
    user.gradYear ? String(user.gradYear) : "",
  );

  // Targets (Step 2).
  const [tracks, setTracks] = useState<string[]>(user.targetTracks ?? []);

  // Background (Step 3) — Sprint 6, all optional.
  const [experienceLevel, setExperienceLevel] = useState<User["experienceLevel"]>(
    user.experienceLevel,
  );
  const [targetGeo, setTargetGeo] = useState<string[]>(user.targetGeo ?? []);
  const [contractType, setContractType] = useState<User["contractType"]>(
    user.contractType,
  );
  const [salaryMin, setSalaryMin] = useState<string>(
    user.salaryMin ? String(user.salaryMin) : "",
  );
  const [salaryMax, setSalaryMax] = useState<string>(
    user.salaryMax ? String(user.salaryMax) : "",
  );

  // Narrative (Step 4) — Sprint 6. We don't seed from
  // `user.profileMarkdown` because the existing markdown is
  // free-form and re-parsing it back into 4 buckets isn't worth
  // the complexity. If the user re-runs onboarding they'll see
  // empty prompts and the new answers append to the existing
  // markdown (handled in `finish()` below).
  const [narrative, setNarrative] = useState<NarrativeAnswers>({
    story: "",
    wins: "",
    lesson: "",
    north_star: "",
  });

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
  // 0 = Identity (required), 1 = Targets (required), 2 = Background
  // (skip), 3 = FirstCV (skip), 4 = Narrative (skip), 5 = FirstSource
  // (skip).
  const canAdvance = useMemo(() => {
    if (step === 0) return identityValid;
    if (step === 1) return targetsValid;
    return true; // Steps 2 / 3 / 4 / 5 are always skippable.
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

  /** Resolve the final profile.md for `markOnboarded`:
   *
   *   1. Try the AI polish path — Claude transforms the four raw
   *      answers into a structured narrative with real Highlights
   *      bullets pulled from the CV.
   *   2. If the polish call returns null (no Anthropic key, network
   *      failure, empty answers) fall back to the brut concat from
   *      `buildProfileMarkdown`.
   *   3. Re-running onboarding: append rather than clobber any
   *      existing profileMarkdown — Settings → Profile remains the
   *      canonical edit surface.
   */
  async function resolveProfileMarkdown(): Promise<string | undefined> {
    const anthropicKey = readAnthropicKey();
    // Pull the most recently imported CV's parsed text — Claude
    // uses it to ground the Highlights bullets in real numbers.
    const allCvs = useAppStore.getState().cvs;
    const latestCvText = allCvs[0]?.parsedText ?? null;

    let polished: string | null = null;
    if (anthropicKey) {
      polished = await polishProfileMarkdown({
        answers: narrative,
        cvText: latestCvText,
        user: {
          targetTracks: tracks,
          experienceLevel,
        },
        anthropicKey,
      });
    }

    const fresh = polished ?? buildProfileMarkdown(narrative);
    if (!fresh) return user.profileMarkdown; // nothing new to add

    if (user.profileMarkdown && user.profileMarkdown.trim()) {
      return `${user.profileMarkdown.trim()}\n\n${fresh}`;
    }
    return fresh;
  }

  async function finish() {
    setPolishing(true);
    const profileMarkdown = await resolveProfileMarkdown();
    setPolishing(false);
    setExiting(true);

    const finalSchool =
      school === "Autre" ? schoolOther.trim() : school;
    const targetCompany = tracks.map(trackLabel).join(", ");
    const gradYearNum = gradYear ? parseInt(gradYear, 10) : undefined;
    const salaryMinNum = salaryMin ? parseInt(salaryMin, 10) : undefined;
    const salaryMaxNum = salaryMax ? parseInt(salaryMax, 10) : undefined;

    // 320ms — matches the fade-out animation duration in onboarding.css.
    window.setTimeout(() => {
      markOnboarded({
        // Sprint 6: respect the auto-fill from StepFirstCV — only
        // overwrite `name` if the user typed a prénom in StepIdentity.
        // Otherwise keep whatever extractCvProfile injected via
        // updateUser (could be the full "Camille Durand" extracted
        // from the CV header).
        ...(firstName.trim() ? { name: firstName.trim() } : {}),
        school: finalSchool,
        ...(degree.trim() ? { degree: degree.trim() } : {}),
        ...(gradYearNum && !Number.isNaN(gradYearNum)
          ? { gradYear: gradYearNum }
          : {}),
        // Mirror école into `location` only if location is empty —
        // we don't want to clobber a real city the user typed via
        // Settings later. Empty string is fine; downstream consumers
        // already handle that.
        location: user.location || finalSchool,
        targetTracks: tracks,
        targetCompany: targetCompany || user.targetCompany,
        // Sprint 6 background fields — all optional.
        ...(experienceLevel ? { experienceLevel } : {}),
        ...(targetGeo.length > 0 ? { targetGeo } : {}),
        ...(contractType ? { contractType } : {}),
        ...(salaryMinNum && !Number.isNaN(salaryMinNum)
          ? { salaryMin: salaryMinNum }
          : {}),
        ...(salaryMaxNum && !Number.isNaN(salaryMaxNum)
          ? { salaryMax: salaryMaxNum }
          : {}),
        ...(profileMarkdown ? { profileMarkdown } : {}),
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
              degree={degree}
              setDegree={setDegree}
              gradYear={gradYear}
              setGradYear={setGradYear}
            />
          )}
          {step === 1 && (
            <StepTargets selected={tracks} setSelected={setTracks} />
          )}
          {step === 2 && (
            <StepBackground
              experienceLevel={experienceLevel}
              setExperienceLevel={setExperienceLevel}
              targetGeo={targetGeo}
              setTargetGeo={setTargetGeo}
              contractType={contractType}
              setContractType={setContractType}
              salaryMin={salaryMin}
              setSalaryMin={setSalaryMin}
              salaryMax={salaryMax}
              setSalaryMax={setSalaryMax}
            />
          )}
          {step === 3 && <StepFirstCV />}
          {step === 4 && (
            <StepNarrative answers={narrative} setAnswers={setNarrative} />
          )}
          {step === 5 && <StepFirstSource />}
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
            {/* Step 2 (Background), 3 (FirstCV), 4 (Narrative),
                5 (FirstSource) are skippable. Step 0/1 are required
                so no skip button there. */}
            {(step === 2 || step === 3 || step === 4 || step === 5) && (
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
              disabled={!canAdvance || polishing}
            >
              <span>
                {step === STEP_COUNT - 1
                  ? polishing
                    ? "Optimisation…"
                    : "Plonger dans Career OS"
                  : "Suivant"}
              </span>
              {step !== STEP_COUNT - 1 && (
                <ArrowRight size={14} strokeWidth={2} />
              )}
            </button>
          </div>
        </div>

        {/* Sprint 6: blocking overlay shown over the panel while
            Claude polishes the narrative answers into the final
            profile.md. Cap visible duration ≈ 3-6s on a typical
            Anthropic call; falls through gracefully if the call
            errors / has no key. */}
        {polishing && (
          <div className="onboarding__polish-overlay" role="status" aria-live="polite">
            <div className="onboarding__polish-spinner" aria-hidden="true" />
            <div className="onboarding__polish-title">
              On structure ton profil…
            </div>
            <div className="onboarding__polish-sub">
              Claude reformule tes réponses en un narratif que les CVs
              tirés et le Copilot pourront utiliser.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
