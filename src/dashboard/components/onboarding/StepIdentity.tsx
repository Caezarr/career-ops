import { useEffect, useRef } from "react";
import brandMark from "../../assets/brand-mark.png";

const SCHOOLS = [
  "HEC Paris",
  "ESCP",
  "ESSEC",
  "Polytechnique",
  "Mines Paris",
  "Sciences Po",
  "INSEAD",
  "Autre",
];

interface Props {
  firstName: string;
  setFirstName: (v: string) => void;
  school: string;
  setSchool: (v: string) => void;
  schoolOther: string;
  setSchoolOther: (v: string) => void;
  // Sprint 6 — optional academic context. Both can stay empty.
  degree: string;
  setDegree: (v: string) => void;
  gradYear: string;
  setGradYear: (v: string) => void;
}

/** Step 1 — required identity fields (prénom + école) plus the
 *  optional diplôme / promo year captured Sprint 6 so prep + CV
 *  generators have a richer profile from the start. Drives the
 *  enabled state of the Next button via the parent's validation. */
export default function StepIdentity({
  firstName,
  setFirstName,
  school,
  setSchool,
  schoolOther,
  setSchoolOther,
  degree,
  setDegree,
  gradYear,
  setGradYear,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the first field when the step mounts.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="onboarding__step">
      <div className="onboarding__brand" aria-hidden>
        <img
          src={brandMark}
          alt=""
          width={48}
          height={48}
          className="onboarding__brand-mark"
        />
      </div>
      <h1 className="onboarding__title">Bienvenue dans Career OS</h1>
      <p className="onboarding__subtitle">
        Trois minutes pour calibrer l&apos;app sur ton parcours.
      </p>

      <div className="onboarding__field">
        <label className="onboarding__label" htmlFor="onb-firstName">
          Prénom
        </label>
        <input
          id="onb-firstName"
          ref={inputRef}
          className="onboarding__input"
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Camille"
          autoComplete="given-name"
        />
      </div>

      <div className="onboarding__field">
        <label className="onboarding__label" htmlFor="onb-school">
          École
        </label>
        <select
          id="onb-school"
          className="onboarding__input onboarding__select"
          value={school}
          onChange={(e) => setSchool(e.target.value)}
        >
          <option value="" disabled>
            Sélectionne ton école
          </option>
          {SCHOOLS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {school === "Autre" && (
        <div className="onboarding__field">
          <label className="onboarding__label" htmlFor="onb-schoolOther">
            Précise ton école
          </label>
          <input
            id="onb-schoolOther"
            className="onboarding__input"
            type="text"
            value={schoolOther}
            onChange={(e) => setSchoolOther(e.target.value)}
            placeholder="ex: EM Lyon, CentraleSupélec"
          />
        </div>
      )}

      <div
        className="onboarding__field-row"
        style={{ display: "flex", gap: 12 }}
      >
        <div className="onboarding__field" style={{ flex: 1 }}>
          <label className="onboarding__label" htmlFor="onb-degree">
            Diplôme <span className="onboarding__optional">(facultatif)</span>
          </label>
          <input
            id="onb-degree"
            className="onboarding__input"
            type="text"
            value={degree}
            onChange={(e) => setDegree(e.target.value)}
            placeholder="ex: MSc Strategy, Bachelor CS, MBA"
            autoComplete="off"
          />
        </div>
        <div className="onboarding__field" style={{ width: 140 }}>
          <label className="onboarding__label" htmlFor="onb-gradYear">
            Promo
          </label>
          <input
            id="onb-gradYear"
            className="onboarding__input"
            type="text"
            inputMode="numeric"
            value={gradYear}
            onChange={(e) => {
              // Keep input numeric-only without forcing controlled
              // type="number" (which has UX warts on Safari/Tauri).
              const v = e.target.value.replace(/\D/g, "").slice(0, 4);
              setGradYear(v);
            }}
            placeholder="2025"
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}
