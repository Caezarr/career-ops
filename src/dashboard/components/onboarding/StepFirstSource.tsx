import { useEffect, useState } from "react";
import { Check, Plus } from "lucide-react";
import { useAppStore } from "../../store";
import { getBuiltinSources } from "../../lib/ingest";
import type { IngestProvider } from "../../store/types";

interface CardSpec {
  provider: IngestProvider;
  identifier: string;
  title: string;
  blurb: string;
}

/** Curated 4-card pick from BUILTIN_SOURCES — picked to span the
 *  spread (top AI lab, fintech leader, design tooling, broad YC feed)
 *  so any persona sees one recognisable name. The actual builtin set
 *  is fetched via Rust so we display the live identifier list, but
 *  the title / blurb stay editorial. */
const PRESETS: CardSpec[] = [
  {
    provider: "greenhouse",
    identifier: "anthropic",
    title: "Anthropic",
    blurb: "Tous les rôles, mis à jour quotidiennement.",
  },
  {
    provider: "greenhouse",
    identifier: "stripe",
    title: "Stripe",
    blurb: "Fintech, infra, GTM et Eng.",
  },
  {
    provider: "ashby",
    identifier: "Linear",
    title: "Linear",
    blurb: "Product-led, équipes restreintes.",
  },
  {
    provider: "ycombinator",
    identifier: "",
    title: "Y Combinator",
    blurb: "Work at a Startup — feed complet.",
  },
];

/** Step 4 — first job source. Each card maps 1:1 to an entry the user
 *  could otherwise add manually in Settings → Job Sources. We dedupe
 *  against the existing slice so a re-entered wizard doesn't double up. */
export default function StepFirstSource() {
  const ingestSources = useAppStore((s) => s.ingestSources);
  const addIngestSource = useAppStore((s) => s.addIngestSource);
  const [available, setAvailable] = useState<Set<string>>(new Set());

  // Verify each card is in the live BUILTIN_SOURCES list — if Rust
  // dropped one, we hide the card rather than seed something stale.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const builtin = await getBuiltinSources();
        if (cancelled) return;
        const keys = new Set(
          builtin.map((s) => `${s.provider}::${s.identifier}`),
        );
        setAvailable(keys);
      } catch {
        // If the Rust call fails we still show all presets — they're
        // hard-coded above and unlikely to break.
        if (!cancelled) {
          setAvailable(
            new Set(PRESETS.map((p) => `${p.provider}::${p.identifier}`)),
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function isConnected(p: CardSpec): boolean {
    return ingestSources.some(
      (s) => s.provider === p.provider && s.identifier === p.identifier,
    );
  }

  function connect(p: CardSpec) {
    if (isConnected(p)) return;
    addIngestSource({ provider: p.provider, identifier: p.identifier });
  }

  return (
    <div className="onboarding__step">
      <h1 className="onboarding__title">Connecte une source de jobs</h1>
      <p className="onboarding__subtitle">
        On synchronisera les nouveaux postes en arrière-plan.
      </p>

      <div className="onboarding__cards" role="list">
        {PRESETS.map((p) => {
          const key = `${p.provider}::${p.identifier}`;
          const builtinOk = available.size === 0 || available.has(key);
          if (!builtinOk) return null;

          const connected = isConnected(p);
          return (
            <button
              key={key}
              type="button"
              role="listitem"
              className={
                "onboarding__card" +
                (connected ? " onboarding__card--connected" : "")
              }
              onClick={() => connect(p)}
              aria-pressed={connected}
              disabled={connected}
            >
              <div className="onboarding__card-head">
                <span className="onboarding__card-title">{p.title}</span>
                <span
                  className={
                    "onboarding__card-icon" +
                    (connected ? " onboarding__card-icon--ok" : "")
                  }
                  aria-hidden="true"
                >
                  {connected ? <Check size={16} /> : <Plus size={16} />}
                </span>
              </div>
              <div className="onboarding__card-blurb">{p.blurb}</div>
              <div className="onboarding__card-foot">
                {connected ? "Connecté" : providerLabel(p.provider)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function providerLabel(p: IngestProvider): string {
  return {
    greenhouse: "Greenhouse",
    lever: "Lever",
    ashby: "Ashby",
    ycombinator: "Y Combinator",
    jobteaser: "Job Teaser",
  }[p];
}
