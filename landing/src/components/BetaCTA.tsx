import { useState, type FormEvent } from "react";
import { submitWaitlist, WaitlistError } from "../lib/waitlist.ts";

/**
 * Beta capture form. Local UI states (idle / loading / ok / err) so
 * the user never wonders if the click registered. The success state
 * is intentionally warm — they just gave us their email, we owe them
 * a confident "you're in".
 */

type Status = "idle" | "loading" | "ok" | "err";

export default function BetaCTA() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setMessage("");
    try {
      await submitWaitlist(email);
      setStatus("ok");
      setMessage(
        "C'est noté. Tu reçois un mail dans 60 secondes — pense à check les spams.",
      );
      setEmail("");
    } catch (err) {
      const reason =
        err instanceof WaitlistError
          ? err.message
          : "Quelque chose a foiré. Réessaie ?";
      setStatus("err");
      setMessage(reason);
    }
  }

  return (
    <section className="beta-cta" id="beta">
      <div className="container">
        <div className="beta-cta__inner">
          <h2 className="beta-cta__title">Rejoins la beta privée.</h2>
          <p className="beta-cta__sub">
            47 places restantes. Le DMG arrive par mail dans les 7 jours qui suivent ton
            inscription. Référer 3 amis = accès anticipé.
          </p>

          <form className="beta-form" onSubmit={handleSubmit} noValidate>
            <label htmlFor="beta-email" className="sr-only">
              Email
            </label>
            <input
              id="beta-email"
              type="email"
              className="beta-form__input"
              placeholder="prenom@ecole.fr"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "loading"}
            />
            <button
              type="submit"
              className="beta-form__btn"
              disabled={status === "loading" || email.trim().length === 0}
            >
              {status === "loading" ? "Envoi…" : "Rejoindre"}
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
          </form>

          <p
            className={
              status === "ok"
                ? "beta-status beta-status--ok"
                : status === "err"
                  ? "beta-status beta-status--err"
                  : "beta-status"
            }
            role="status"
            aria-live="polite"
          >
            {message}
          </p>

          <div className="beta-meta">
            <span>Mac · macOS 13+</span>
            <span className="beta-meta__dot" aria-hidden />
            <span>Open beta · gratuit</span>
            <span className="beta-meta__dot" aria-hidden />
            <span>Aucun spam, jamais</span>
          </div>
        </div>
      </div>
    </section>
  );
}
