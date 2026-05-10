import { useState, type FormEvent } from "react";
import {
  submitWaitlist,
  WaitlistError,
  buildReferralLink,
  makeReferralCode,
  type ApplicationTarget,
} from "../lib/waitlist.ts";

/**
 * Beta selection form.
 *
 * Two-screen flow:
 *
 *   1. Application — email + target dropdown ("tu vises quoi ?").
 *      Frame is "applying", not "signing up". The dropdown both
 *      qualifies the lead (ICP scoring server-side) and gives the
 *      user the feeling of being filtered, not gathered.
 *
 *   2. Confirmed — referral panel front and centre. The user just
 *      took an action; capitalise on momentum with the next ask:
 *      "skip the queue by inviting 3 friends." Three share buttons
 *      + copy-link, all populated with a stable per-email code.
 *
 * No fake position number. We don't fake "#142 in queue" because
 * Loops doesn't expose the count and we'd rather under-promise.
 * "Tu es dans la pile" reads as honest and exclusive.
 */

type Status = "idle" | "loading" | "ok" | "err";

interface TargetOption {
  value: ApplicationTarget;
  label: string;
}

const TARGETS: TargetOption[] = [
  { value: "consulting", label: "Conseil — MBB / Tier 2" },
  { value: "ib_finance", label: "Finance — IB / PE / VC" },
  { value: "tech", label: "Tech — Anthropic, Stripe, FAANG" },
  { value: "startup", label: "Startup — Series A à C" },
  { value: "career_change", label: "Reconversion / pivot de carrière" },
  { value: "other", label: "Autre" },
];

export default function BetaCTA() {
  const [email, setEmail] = useState("");
  const [target, setTarget] = useState<ApplicationTarget | "">("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "loading") return;
    if (!target) {
      setStatus("err");
      setMessage("Choisis ce que tu vises — ça nous aide à prioriser ta candidature.");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      await submitWaitlist({ email, target });
      setStatus("ok");
    } catch (err) {
      const reason =
        err instanceof WaitlistError
          ? err.message
          : "Quelque chose a foiré. Réessaie ?";
      setStatus("err");
      setMessage(reason);
    }
  }

  if (status === "ok") {
    return (
      <section className="beta-cta" id="beta">
        <div className="container">
          <SuccessPanel email={email} />
        </div>
      </section>
    );
  }

  return (
    <section className="beta-cta beta-cta--dark beta-cta--split" id="beta">
      <div className="container">
        <div className="beta-cta__split">
          {/* ── Left: copy ─────────────────────────────────────── */}
          <div className="beta-cta__copy">
            <h2 className="beta-cta__title">
              Prêt à décrocher mieux,
              <br />
              sans y laisser{" "}
              <span className="beta-cta__title-accent">300 heures&nbsp;?</span>
            </h2>

            <ul className="beta-cta__perks">
              <li>
                <span className="beta-cta__perk-icon" aria-hidden>✓</span>
                Accès anticipé à la bêta privée
              </li>
              <li>
                <span className="beta-cta__perk-icon" aria-hidden>✓</span>
                Réponse sous 7 jours ouvrés
              </li>
              <li>
                <span className="beta-cta__perk-icon" aria-hidden>✓</span>
                Places limitées chaque semaine
              </li>
            </ul>
          </div>

          {/* ── Right: form ────────────────────────────────────── */}
          <form className="beta-application beta-application--card" onSubmit={handleSubmit} noValidate>
            <label className="beta-field">
              <span className="beta-field__label">Ton email professionnel</span>
              <input
                type="email"
                className="beta-field__input"
                placeholder="prenom@domaine.com"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === "loading"}
              />
            </label>

            <label className="beta-field">
              <span className="beta-field__label">Ton rôle cible</span>
              <div className="beta-field__select-wrap">
                <select
                  className="beta-field__select"
                  required
                  value={target}
                  onChange={(e) => setTarget(e.target.value as ApplicationTarget)}
                  disabled={status === "loading"}
                >
                  <option value="" disabled>
                    Ex : Consultant, Analyste, PM…
                  </option>
                  {TARGETS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <svg
                  className="beta-field__select-chevron"
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M4 6 L8 10 L12 6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </label>

            <button
              type="submit"
              className="btn-primary beta-application__submit"
              disabled={status === "loading" || email.trim().length === 0 || !target}
            >
              {status === "loading" ? "Envoi en cours…" : "Postuler à la bêta"}
              {status !== "loading" && (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path
                    d="M3 8 H13 M9 4 L13 8 L9 12"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>

            {status === "err" && message && (
              <p className="beta-status beta-status--err" role="status" aria-live="polite">
                {message}
              </p>
            )}

            <p className="beta-application__fineprint">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden style={{ verticalAlign: "middle", marginRight: 4 }}>
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.6" />
                <path d="M8 4.5 V8.5 L10.5 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Sans engagement. Réponse sous 7 jours.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}

// ── Success panel ──────────────────────────────────────────────────────────

function SuccessPanel({ email }: { email: string }) {
  const code = makeReferralCode(email);
  const link = buildReferralLink(code);
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    });
  }

  const shareText =
    "J'ai postulé à Career OS — l'OS de carrière pour viser les top firms (MBB, IB, top tech). Tu peux postuler aussi via mon lien :";

  return (
    <div className="beta-success" role="region" aria-label="Candidature confirmée">
      <div className="beta-success__icon" aria-hidden>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12.5 L10 17.5 L19 7.5"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2 className="beta-success__title">Ta candidature est dans la pile.</h2>
      <p className="beta-success__sub">
        On revient vers toi par mail sous 7 jours. En attendant, tu peux avancer
        dans la file dès maintenant.
      </p>

      <div className="referral-card">
        <div className="referral-card__head">
          <div>
            <span className="referral-card__eyebrow">Skip la queue</span>
            <h3 className="referral-card__title">3 amis = accès anticipé</h3>
            <p className="referral-card__body">
              Chaque ami qui postule via ton lien te fait avancer de 50 places.
              À 3 amis, tu sautes en tête de la prochaine vague.
            </p>
          </div>
          <Tier label="3 amis" sub="accès anticipé" highlighted />
        </div>

        <div className="referral-card__link">
          <input
            className="referral-card__input"
            type="text"
            value={link}
            readOnly
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Ton lien de référencement"
          />
          <button
            type="button"
            className="referral-card__copy"
            onClick={copy}
            aria-live="polite"
          >
            {copied ? "Copié ✓" : "Copier"}
          </button>
        </div>

        <div className="referral-card__shares">
          <ShareButton
            label="WhatsApp"
            href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${link}`)}`}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.5 14.4c-.3-.2-1.7-.9-2-1s-.5-.1-.7.1-.8 1-1 1.2-.3.2-.7 0c-1.7-.9-2.9-1.6-4.1-3.6-.3-.5.3-.5.9-1.6.1-.2 0-.4 0-.5-.1-.2-.7-1.6-.9-2.2s-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1.1 1.1-1.1 2.6 1.1 3 1.2 3.2c.2.2 2.2 3.4 5.4 4.7.8.3 1.4.5 1.8.6.8.2 1.5.2 2 .1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.4zM12 2C6.5 2 2 6.5 2 12c0 1.7.4 3.4 1.3 4.9L2 22l5.3-1.4c1.4.8 3 1.2 4.7 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z" />
              </svg>
            }
          />
          <ShareButton
            label="X / Twitter"
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(link)}`}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.9 1.6h3.7l-8 9.2 9.4 12.6h-7.4l-5.8-7.6-6.6 7.6H.5l8.6-9.9L0 1.6h7.6l5.2 7 5.5-7zm-1.3 19.7h2L6.6 3.6H4.4l13.2 17.7z" />
              </svg>
            }
          />
          <ShareButton
            label="LinkedIn"
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14zM8.5 18v-7H6v7h2.5zM7.25 9.7a1.45 1.45 0 1 0 0-2.9 1.45 1.45 0 0 0 0 2.9zM18 18v-3.85c0-2.31-1.24-3.4-2.9-3.4a2.5 2.5 0 0 0-2.27 1.25V11H10.4v7h2.5v-3.7c0-1.04.5-1.65 1.42-1.65.93 0 1.18.6 1.18 1.69V18H18z" />
              </svg>
            }
          />
        </div>
      </div>

      <p className="beta-success__footnote">
        Pas pressé ? Tu peux fermer cette page. Tu reçois quand même une réponse
        par mail — promis.
      </p>
    </div>
  );
}

function ShareButton({
  label,
  href,
  icon,
}: {
  label: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      className="referral-card__share-btn"
      href={href}
      target="_blank"
      rel="noreferrer noopener"
    >
      <span className="referral-card__share-icon" aria-hidden>
        {icon}
      </span>
      {label}
    </a>
  );
}

function Tier({
  label,
  sub,
  highlighted = false,
}: {
  label: string;
  sub: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={
        highlighted ? "referral-tier referral-tier--highlight" : "referral-tier"
      }
      aria-hidden
    >
      <span className="referral-tier__label">{label}</span>
      <span className="referral-tier__sub">{sub}</span>
    </div>
  );
}
