import { useEffect, useRef } from "react";
import type { User } from "../../store";

/** Sprint 6 — between Targets and FirstCV. Captures four
 *  optional context fields used by the AI prompts (prep
 *  question difficulty, copilot tone) and the job-list
 *  filtering (geo + contract type + salary band).
 *
 *  Every field is skippable — the parent treats this step as
 *  always-advancing. We deliberately don't validate "all four
 *  filled" because the friction would push users to skip the
 *  whole step. */

const EXP_LEVELS: { id: NonNullable<User["experienceLevel"]>; label: string; sub: string }[] = [
  { id: "student", label: "Étudiant", sub: "Stage / alternance" },
  { id: "graduate", label: "Jeune diplômé", sub: "0-1 an d'XP" },
  { id: "1-3", label: "Junior", sub: "1-3 ans d'XP" },
  { id: "3-7", label: "Confirmé", sub: "3-7 ans d'XP" },
  { id: "7+", label: "Senior+", sub: "7+ ans d'XP" },
];

const GEOS = [
  "Paris",
  "Londres",
  "New York",
  "San Francisco",
  "Remote",
  "Autre",
];

const CONTRACTS: { id: NonNullable<User["contractType"]>; label: string }[] = [
  { id: "cdi", label: "CDI" },
  { id: "stage", label: "Stage" },
  { id: "alternance", label: "Alternance" },
  { id: "freelance", label: "Freelance" },
  { id: "any", label: "Peu importe" },
];

interface Props {
  experienceLevel: User["experienceLevel"];
  setExperienceLevel: (v: User["experienceLevel"]) => void;
  targetGeo: string[];
  setTargetGeo: (v: string[]) => void;
  contractType: User["contractType"];
  setContractType: (v: User["contractType"]) => void;
  salaryMin: string;
  setSalaryMin: (v: string) => void;
  salaryMax: string;
  setSalaryMax: (v: string) => void;
}

export default function StepBackground({
  experienceLevel,
  setExperienceLevel,
  targetGeo,
  setTargetGeo,
  contractType,
  setContractType,
  salaryMin,
  setSalaryMin,
  salaryMax,
  setSalaryMax,
}: Props) {
  const firstFieldRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  function toggleGeo(g: string) {
    if (targetGeo.includes(g)) {
      setTargetGeo(targetGeo.filter((x) => x !== g));
    } else {
      setTargetGeo([...targetGeo, g]);
    }
  }

  return (
    <div className="onboarding__step onboarding__step--compact">
      <h1 className="onboarding__title">Calibre tes recos</h1>
      <p className="onboarding__subtitle">
        Tout est facultatif. On filtrera les offres et la prep en
        conséquence — tu peux ajuster plus tard depuis Settings.
      </p>

      {/* ── Niveau d'expérience ─────────────────────────────────── */}
      <div className="onboarding__field">
        <label className="onboarding__label">
          Niveau d&apos;expérience{" "}
          <span className="onboarding__optional">(facultatif)</span>
        </label>
        <div
          className="onboarding__pills onboarding__pills--compact"
          role="radiogroup"
          aria-label="Niveau d'expérience"
        >
          {EXP_LEVELS.map((lv, i) => {
            const active = experienceLevel === lv.id;
            return (
              <button
                ref={i === 0 ? firstFieldRef : undefined}
                key={lv.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={
                  "onboarding__pill" +
                  (active ? " onboarding__pill--active" : "")
                }
                onClick={() =>
                  setExperienceLevel(active ? undefined : lv.id)
                }
              >
                <span className="onboarding__pill-label">{lv.label}</span>
                <span className="onboarding__pill-sub">{lv.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Géographies cibles ──────────────────────────────────── */}
      <div className="onboarding__field">
        <label className="onboarding__label">
          Géographies cibles{" "}
          <span className="onboarding__optional">(plusieurs choix)</span>
        </label>
        <div
          className="onboarding__pills onboarding__pills--compact"
          role="group"
          aria-label="Géographies"
        >
          {GEOS.map((g) => {
            const active = targetGeo.includes(g);
            return (
              <button
                key={g}
                type="button"
                aria-pressed={active}
                className={
                  "onboarding__pill" +
                  (active ? " onboarding__pill--active" : "")
                }
                onClick={() => toggleGeo(g)}
              >
                <span className="onboarding__pill-label">{g}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Type de contrat ─────────────────────────────────────── */}
      <div className="onboarding__field">
        <label className="onboarding__label">
          Type de contrat{" "}
          <span className="onboarding__optional">(facultatif)</span>
        </label>
        <div
          className="onboarding__pills onboarding__pills--compact"
          role="radiogroup"
          aria-label="Type de contrat"
        >
          {CONTRACTS.map((c) => {
            const active = contractType === c.id;
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={
                  "onboarding__pill" +
                  (active ? " onboarding__pill--active" : "")
                }
                onClick={() => setContractType(active ? undefined : c.id)}
              >
                <span className="onboarding__pill-label">{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tranche de salaire ──────────────────────────────────── */}
      <div className="onboarding__field">
        <label className="onboarding__label">
          Tranche cible (€/an brut){" "}
          <span className="onboarding__optional">(facultatif)</span>
        </label>
        <div
          className="onboarding__field-row"
          style={{ display: "flex", gap: 12 }}
        >
          <div className="onboarding__field" style={{ flex: 1, marginBottom: 0 }}>
            <input
              className="onboarding__input"
              type="text"
              inputMode="numeric"
              placeholder="Min — ex: 45000"
              value={salaryMin}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 7);
                setSalaryMin(v);
              }}
              autoComplete="off"
            />
          </div>
          <div className="onboarding__field" style={{ flex: 1, marginBottom: 0 }}>
            <input
              className="onboarding__input"
              type="text"
              inputMode="numeric"
              placeholder="Max — ex: 70000"
              value={salaryMax}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 7);
                setSalaryMax(v);
              }}
              autoComplete="off"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
