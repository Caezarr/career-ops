/**
 * Billing client — talks to the Worker (`/v1/billing/*`), not Stripe
 * directly. The Stripe secret key only ever lives in the Worker; the
 * desktop app only ever sees Checkout URLs Stripe returns.
 *
 * Pricing model (post-beta):
 *   - Free          — 0€
 *   - Lifetime      — 99€ one-time, no guarantee
 *   - Lifetime Pro  — 149€ one-time, 180-day result guarantee
 *
 * The previous BYOK Stripe wiring (each user dropping their own
 * sk_… in the Keychain) was removed entirely. That pattern doesn't
 * make sense for a B2C SaaS where Career OS is the merchant.
 */
import { open as openExternal } from "@tauri-apps/plugin-shell";
import { API_BASE_URL, readJwt } from "./auth";

// ─── Public API ────────────────────────────────────────────────────────────

export type Plan = "free" | "lifetime" | "lifetime_pro";

export interface BillingStatus {
  plan: Plan;
  /** Unix ms of the Checkout completion event. Null while on Free. */
  purchasedAt: number | null;
  /** Unix ms of `purchasedAt + 180 days` for Lifetime Pro, else null. */
  refundDeadlineAt: number | null;
  hasGuarantee: boolean;
  refundRequestedAt: number | null;
  refundedAt: number | null;
  /** Convenience flag from the Worker — true only when the guarantee is
   *  active, the window is still open, and no refund was requested. */
  canRequestRefund: boolean;
}

export class BillingError extends Error {
  constructor(
    public readonly kind:
      | "no_auth"
      | "already_paid"
      | "not_configured"
      | "no_guarantee"
      | "already_requested"
      | "window_expired"
      | "upstream"
      | "network"
      | "client",
    message: string,
    public readonly status: number = 0,
  ) {
    super(message);
    this.name = "BillingError";
  }
}

/**
 * Create a Stripe Checkout Session via the Worker, then open the
 * returned URL in the system browser. The user lands back via the
 * `careeros://billing/success` (or `…cancel`) deep-link once Stripe
 * is done with them — the `useBillingDeepLink` hook handles it.
 */
export async function startCheckout(target: "lifetime" | "lifetime_pro"): Promise<void> {
  const data = await postBilling<{ url: string; sessionId: string }>(
    "/checkout",
    { plan: target },
  );
  if (!data.url) {
    throw new BillingError("upstream", "Stripe did not return a Checkout URL.");
  }
  // Open in the user's default browser. `tauri-plugin-shell` is
  // already wired in the manifest, so no extra setup here.
  await openExternal(data.url);
}

/** Fetch the current user's billing status from the Worker (D1). */
export async function fetchBillingStatus(): Promise<BillingStatus> {
  return getBilling<BillingStatus>("/status");
}

/**
 * Flag a refund request. The Worker logs the request in D1; a human
 * reviews the candidate's activity (≥30 candidatures + 0 interview)
 * before manually issuing the Stripe refund. We don't auto-refund
 * here on purpose — anyone could otherwise drain the merchant.
 */
export async function requestRefund(): Promise<{ deadlineAt: number }> {
  const data = await postBilling<{ requested: boolean; deadlineAt: number }>(
    "/refund",
    {},
  );
  return { deadlineAt: data.deadlineAt };
}

// ─── HTTP helpers ──────────────────────────────────────────────────────────

async function postBilling<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const jwt = await readJwt();
  if (!jwt) {
    throw new BillingError(
      "no_auth",
      "Connecte-toi pour gérer ton abonnement.",
    );
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/v1/billing${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new BillingError(
      "network",
      `Service de paiement injoignable (${API_BASE_URL}). Vérifie ta connexion.`,
    );
  }

  return handleResponse<T>(res);
}

async function getBilling<T>(path: string): Promise<T> {
  const jwt = await readJwt();
  if (!jwt) {
    throw new BillingError(
      "no_auth",
      "Connecte-toi pour gérer ton abonnement.",
    );
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/v1/billing${path}`, {
      headers: { authorization: `Bearer ${jwt}` },
    });
  } catch {
    throw new BillingError(
      "network",
      `Service de paiement injoignable (${API_BASE_URL}).`,
    );
  }

  return handleResponse<T>(res);
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401 || res.status === 403) {
    throw new BillingError("no_auth", "Session expirée — reconnecte-toi.", res.status);
  }
  if (!res.ok) {
    let payload: { error?: string; currentPlan?: string } = {};
    try {
      payload = (await res.json()) as typeof payload;
    } catch {
      /* leave empty */
    }
    const code = payload.error ?? "";
    switch (code) {
      case "already_paid":
        throw new BillingError(
          "already_paid",
          `Tu as déjà l'accès Pro (${payload.currentPlan}). Pas de double-paiement.`,
          res.status,
        );
      case "price_not_configured":
        throw new BillingError(
          "not_configured",
          "Paiement non configuré côté serveur. Réessaie plus tard.",
          res.status,
        );
      case "no_guarantee":
        throw new BillingError(
          "no_guarantee",
          "Ce plan n'inclut pas la garantie résultat. Pas de remboursement.",
          res.status,
        );
      case "already_requested":
        throw new BillingError(
          "already_requested",
          "Une demande de remboursement est déjà en cours.",
          res.status,
        );
      case "window_expired":
        throw new BillingError(
          "window_expired",
          "La fenêtre de remboursement (180 jours) est passée.",
          res.status,
        );
      default:
        if (res.status >= 500) {
          throw new BillingError(
            "upstream",
            `Service de paiement indisponible (${res.status}).`,
            res.status,
          );
        }
        throw new BillingError(
          "client",
          `Requête invalide (${res.status}).`,
          res.status,
        );
    }
  }

  return (await res.json()) as T;
}
