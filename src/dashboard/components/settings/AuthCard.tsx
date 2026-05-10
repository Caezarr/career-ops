/**
 * AuthCard — Settings → Account: magic-link sign-in / sign-out.
 *
 * Renders above the existing ProfileCard. Three visual states:
 *
 *   1. signed-out         — email field + "Send magic link" button
 *   2. requesting         — disabled spinner state
 *   3. awaiting-link      — "Check your inbox" callout + resend button
 *   4. signed-in          — email + license badge + "Sign out"
 *   5. error              — inline error message + retry
 *
 * Why this lives in a dedicated card (rather than appended to
 * ProfileCard): the auth state has its own backing slice and is
 * fully decoupled from the editable profile form. Mixing them
 * would force a `useEffect` chain to keep them in sync, and the
 * sign-in surface needs to be visible even when the rest of the
 * profile form is empty (fresh install).
 */
import { useState, type FormEvent } from "react";
import { LogIn, LogOut, Mail, ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { useAppStore } from "../../store";
import { useToast } from "../../primitives";
import type { LicenseStatus } from "../../lib/auth";

const LICENSE_LABEL: Record<LicenseStatus, string> = {
  free: "Free",
  trialing: "Trial",
  active: "Pro",
  past_due: "Paiement en retard",
  canceled: "Annulé",
};

const LICENSE_TONE: Record<LicenseStatus, string> = {
  free: "settings-chip--neutral",
  trialing: "settings-chip--accent",
  active: "settings-chip--accent",
  past_due: "settings-chip--warn",
  canceled: "settings-chip--neutral",
};

export default function AuthCard() {
  const status = useAppStore((s) => s.authStatus);
  const me = useAppStore((s) => s.me);
  const error = useAppStore((s) => s.authError);
  const pendingEmail = useAppStore((s) => s.authPendingEmail);
  const requestAction = useAppStore((s) => s.requestMagicLinkAction);
  const signOut = useAppStore((s) => s.signOutAction);
  const toast = useToast();

  // Local-only — keep the email input controlled so the empty state
  // doesn't depend on the slice. We seed from the user profile so a
  // signed-out user with a stored profile email gets a one-click
  // sign-in.
  const profileEmail = useAppStore((s) => s.user.email);
  const [email, setEmail] = useState(profileEmail || "");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Saisis un email pour recevoir le lien.");
      return;
    }
    await requestAction(trimmed);
  }

  // ── signed-in ──────────────────────────────────────────────────
  if (status === "signed-in" && me) {
    return (
      <section className="settings-card" aria-labelledby="settings-auth-title">
        <h2 id="settings-auth-title" className="settings-card__title">
          Compte Career OS
        </h2>
        <p className="settings-card__hint">
          Tu es connecté. Tes données sont prêtes à se synchroniser une fois que
          le sync cloud sera activé (Phase 2).
        </p>

        <div
          className="settings-row"
          style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12 }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              background: "var(--color-accent-soft, #21232c)",
              display: "grid",
              placeItems: "center",
            }}
            aria-hidden
          >
            <ShieldCheck size={20} strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{me.email}</div>
            <div
              style={{
                color: "var(--color-text-muted, #b8bac4)",
                fontSize: 12,
                marginTop: 2,
              }}
            >
              {me.lastLoginAt
                ? `Dernière connexion · ${new Date(me.lastLoginAt).toLocaleDateString()}`
                : "Première connexion"}
            </div>
          </div>
          <span className={`settings-chip ${LICENSE_TONE[me.license.status]}`}>
            {LICENSE_LABEL[me.license.status]}
          </span>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button
            type="button"
            className="settings-btn settings-btn--outline"
            onClick={async () => {
              await signOut();
              toast.success("Déconnecté.");
            }}
          >
            <LogOut size={14} />
            <span>Se déconnecter</span>
          </button>
        </div>
      </section>
    );
  }

  // ── awaiting-link ──────────────────────────────────────────────
  if (status === "awaiting-link") {
    return (
      <section className="settings-card" aria-labelledby="settings-auth-title">
        <h2 id="settings-auth-title" className="settings-card__title">
          Vérifie tes mails
        </h2>
        <p className="settings-card__hint">
          On vient d'envoyer un lien de connexion à
          {pendingEmail ? ` ${pendingEmail}` : " l'adresse renseignée"}. Clique
          dessus depuis cet appareil — Career OS s'ouvrira automatiquement et
          ta session sera active.
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 16,
            padding: 12,
            border: "1px solid var(--color-border, #21232c)",
            borderRadius: 10,
            background: "var(--color-surface-soft, rgba(99,102,241,0.06))",
          }}
        >
          <Mail size={20} strokeWidth={2} />
          <div style={{ fontSize: 13, color: "var(--color-text-muted, #b8bac4)" }}>
            Le lien expire dans 15 minutes. Pas de mail ? Vérifie le dossier
            spam puis renvoie-toi un nouveau lien.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button
            type="button"
            className="settings-btn settings-btn--outline"
            onClick={async () => {
              if (pendingEmail) await requestAction(pendingEmail);
              else toast.error("Email perdu — re-saisis-le ci-dessous.");
            }}
          >
            <Mail size={14} />
            <span>Renvoyer le lien</span>
          </button>
        </div>

        {/* Dev paste input also in awaiting-link state — that's
            the moment the user actually needs to finalise the
            sign-in. import.meta.env.DEV gates it out of prod. */}
        {import.meta.env.DEV && <DevJwtPasteInput />}
      </section>
    );
  }

  // ── signed-out / requesting / error / unknown ──────────────────
  const busy = status === "requesting" || status === "unknown";

  return (
    <section className="settings-card" aria-labelledby="settings-auth-title">
      <h2 id="settings-auth-title" className="settings-card__title">
        Connexion Career OS
      </h2>
      <p className="settings-card__hint">
        Connecte-toi pour retrouver tes candidatures, CVs et historique sur
        n'importe quel Mac. Pas de mot de passe — un lien magique unique
        envoyé à ton mail.
      </p>

      <form onSubmit={onSubmit} style={{ marginTop: 12 }}>
        <label
          htmlFor="auth-email"
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 6,
            color: "var(--color-text-muted, #b8bac4)",
          }}
        >
          Email
        </label>
        <input
          id="auth-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="ton@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
          required
          className="settings-input"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid var(--color-border, #21232c)",
            background: "var(--color-surface-input, #16181f)",
            color: "var(--color-text, #f4f5f8)",
            fontSize: 14,
          }}
        />

        {status === "error" && error && (
          <div
            role="alert"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              marginTop: 10,
              padding: "8px 10px",
              borderRadius: 8,
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "#fca5a5",
              fontSize: 12,
            }}
          >
            <AlertCircle size={14} strokeWidth={2} style={{ marginTop: 2 }} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button
            type="submit"
            className="settings-btn settings-btn--outline"
            disabled={busy}
          >
            {status === "requesting" ? (
              <Loader2 size={14} className="ic-spin" />
            ) : (
              <LogIn size={14} />
            )}
            <span>
              {status === "requesting" ? "Envoi en cours…" : "Recevoir le lien"}
            </span>
          </button>
        </div>
      </form>

      {/* Dev-only manual JWT paste — Tauri 2 + macOS route the
          `careeros://` deep link to the bundled release app, not
          the running `pnpm tauri dev` instance, so the round-trip
          can't reach the dev process. The /auth/verify page in
          dev shows the raw JWT with a Copier button; this input
          accepts the paste. Hidden in production builds via
          import.meta.env.DEV. */}
      {import.meta.env.DEV && <DevJwtPasteInput />}
    </section>
  );
}

/** Dev-only utility — visible only when `import.meta.env.DEV` is
 *  true (Vite strips this whole component out of production
 *  builds via tree-shaking). Lets the developer paste a JWT
 *  obtained from the worker's /auth/verify dev page directly,
 *  bypassing the macOS deep-link round-trip. */
function DevJwtPasteInput() {
  const completeSignIn = useAppStore((s) => s.completeSignIn);
  const toast = useToast();
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <details
      style={{
        marginTop: 18,
        padding: 12,
        borderRadius: 8,
        border: "1px dashed var(--color-border, #21232c)",
        background: "rgba(252,211,77,0.04)",
      }}
    >
      <summary
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#fcd34d",
          cursor: "pointer",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        Dev — coller un JWT manuellement
      </summary>
      <p
        style={{
          fontSize: 11,
          color: "var(--color-text-muted, #8a8d99)",
          marginTop: 8,
          marginBottom: 8,
          lineHeight: 1.5,
        }}
      >
        Sur macOS, <code>careeros://</code> route vers la version bundle. En
        dev, copie le JWT depuis la page <code>/auth/verify</code> du worker
        et colle-le ici.
      </p>
      <textarea
        value={pasted}
        onChange={(e) => setPasted(e.target.value)}
        placeholder="eyJhbGciOiJIUzI1NiIs..."
        rows={3}
        style={{
          width: "100%",
          padding: "8px 10px",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 11,
          borderRadius: 6,
          border: "1px solid var(--color-border, #21232c)",
          background: "var(--color-surface-input, #16181f)",
          color: "var(--color-text, #f4f5f8)",
          resize: "vertical",
        }}
      />
      <button
        type="button"
        className="settings-btn settings-btn--outline"
        disabled={busy || !pasted.trim()}
        style={{ marginTop: 8 }}
        onClick={async () => {
          const jwt = pasted.trim();
          if (!jwt) return;
          setBusy(true);
          try {
            await completeSignIn(jwt);
            toast.success("JWT enregistré.");
            setPasted("");
          } catch (e) {
            toast.error(`Échec : ${(e as Error).message ?? "inconnu"}`);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Validation…" : "Valider le JWT"}
      </button>
    </details>
  );
}
