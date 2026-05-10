/**
 * Shared HTTP client for the server-managed AI endpoints
 * (/v1/ai/* on the Worker).
 *
 * Every call:
 *   - reads the magic-link JWT from the Keychain
 *   - POSTs JSON to the Worker
 *   - surfaces typed errors so callers can branch on `kind`
 *     without parsing strings
 *
 * Errors come in 4 flavours (see `AiClientError.kind`):
 *   - "no_auth"      — user isn't signed in (no JWT)
 *   - "rate_limited" — daily quota exhausted
 *   - "upstream"     — Worker/Anthropic 5xx
 *   - "network"      — fetch threw (offline, Worker down)
 *   - "client"       — 4xx that wasn't 401/429 (bad input)
 */
import { API_BASE_URL, readJwt } from "./auth";

export type AiClientErrorKind =
  | "no_auth"
  | "rate_limited"
  | "upstream"
  | "network"
  | "client";

export class AiClientError extends Error {
  constructor(
    public readonly kind: AiClientErrorKind,
    message: string,
    public readonly status: number = 0,
    /** When `kind === "rate_limited"`, unix-seconds until reset. */
    public readonly resetAt: number | null = null,
  ) {
    super(message);
    this.name = "AiClientError";
  }
}

/** POST a JSON body to /v1/ai/<path>, return the typed response.
 *  Throws AiClientError on any non-200 path. */
export async function postAi<TResponse, TBody = Record<string, unknown>>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  const jwt = await readJwt();
  if (!jwt) {
    throw new AiClientError(
      "no_auth",
      "Connecte-toi pour utiliser cette fonctionnalité.",
    );
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/v1/ai/${path.replace(/^\//, "")}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new AiClientError(
      "network",
      `Service IA injoignable (${API_BASE_URL}). Vérifie ta connexion.`,
      0,
    );
  }

  if (res.status === 401 || res.status === 403) {
    throw new AiClientError(
      "no_auth",
      "Session expirée — reconnecte-toi.",
      res.status,
    );
  }

  if (res.status === 429) {
    let resetAt: number | null = null;
    let message = "Limite quotidienne atteinte. Réessaye demain.";
    try {
      const data = (await res.json()) as { resetAt?: number; message?: string };
      if (typeof data.resetAt === "number") resetAt = data.resetAt;
      if (typeof data.message === "string") message = data.message;
    } catch {
      /* leave default */
    }
    throw new AiClientError("rate_limited", message, 429, resetAt);
  }

  if (res.status >= 500) {
    throw new AiClientError(
      "upstream",
      `Service IA indisponible (${res.status}). Réessaye plus tard.`,
      res.status,
    );
  }

  if (!res.ok) {
    let message = `Requête invalide (${res.status}).`;
    try {
      const data = (await res.json()) as { message?: string };
      if (typeof data.message === "string") message = data.message;
    } catch {
      /* leave default */
    }
    throw new AiClientError("client", message, res.status);
  }

  return (await res.json()) as TResponse;
}
