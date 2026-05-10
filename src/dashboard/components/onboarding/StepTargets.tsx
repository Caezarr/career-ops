interface Props {
  selected: string[];
  setSelected: (next: string[]) => void;
}

const TRACKS: { id: string; label: string; sub: string }[] = [
  { id: "consulting", label: "Conseil", sub: "MBB, Tier 2, boutiques" },
  { id: "ib_pe_vc", label: "IB / PE / VC", sub: "Banque d'affaires, fonds" },
  { id: "big_tech", label: "Big Tech", sub: "Anthropic, Stripe, FAANG" },
  { id: "startup", label: "Startup Series A-C", sub: "Scale-ups bien financées" },
  { id: "reconversion", label: "Reconversion", sub: "Changement de cap" },
  { id: "other", label: "Autre", sub: "Industrie, public, ONG" },
];

/** Step 2 — multi-select pills, ≥1 required. Toggling is local but
 *  the canonical list lives on the parent so the wizard can validate
 *  Next button state. */
export default function StepTargets({ selected, setSelected }: Props) {
  function toggle(id: string) {
    if (selected.includes(id)) {
      setSelected(selected.filter((x) => x !== id));
    } else {
      setSelected([...selected, id]);
    }
  }

  return (
    <div className="onboarding__step">
      <h1 className="onboarding__title">Tu vises quoi ?</h1>
      <p className="onboarding__subtitle">
        Plusieurs choix possibles. On filtrera tes recos en conséquence.
      </p>

      <div className="onboarding__pills" role="group" aria-label="Cibles">
        {TRACKS.map((t) => {
          const active = selected.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              className={
                "onboarding__pill" + (active ? " onboarding__pill--active" : "")
              }
              onClick={() => toggle(t.id)}
              aria-pressed={active}
            >
              <span className="onboarding__pill-label">{t.label}</span>
              <span className="onboarding__pill-sub">{t.sub}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Display label for a track id — exported so the parent can write
 *  human-readable strings into `user.targetTracks`. */
export function trackLabel(id: string): string {
  return TRACKS.find((t) => t.id === id)?.label ?? id;
}
