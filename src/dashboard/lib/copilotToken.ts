/**
 * Copilot transcription token broker — client.
 *
 * Exchanges the user's JWT for a 60-second AssemblyAI streaming
 * token. The desktop session uses that token to connect directly
 * to wss://streaming.assemblyai.com/v3/ws.
 *
 * Pattern: token broker. The real AssemblyAI key never leaves the
 * Worker; this function only ever sees short-lived single-use
 * tokens with a tight blast radius.
 *
 * Errors map to `CopilotTokenError.kind`:
 *   - "no_auth"        — user isn't signed in (no JWT in Keychain)
 *   - "rate_limited"   — daily token budget exhausted (120/day)
 *   - "not_configured" — Worker is missing ASSEMBLYAI_API_KEY
 *   - "upstream"       — AssemblyAI rejected our request
 *   - "network"        — fetch threw
 */
import { API_BASE_URL, readJwt } from "./auth";

export type CopilotTokenErrorKind =
  | "no_auth"
  | "rate_limited"
  | "not_configured"
  | "upstream"
  | "network";

export class CopilotTokenError extends Error {
  constructor(
    public readonly kind: CopilotTokenErrorKind,
    message: string,
    public readonly status: number = 0,
    public readonly resetAt: number | null = null,
  ) {
    super(message);
    this.name = "CopilotTokenError";
  }
}

export interface CopilotTokenResponse {
  /** AssemblyAI temp token. Use as `?token=<value>` on the WebSocket URL. */
  token: string;
  /** Unix-seconds at which the token expires. */
  expiresAt: number;
  /** Daily tokens remaining for this user. UI can show "X sessions left today". */
  remaining: number;
}

/**
 * Fetch a fresh AssemblyAI streaming token. Default 60s validity.
 * For long interview sessions (> ~50 minutes), request a longer
 * lifetime — the Worker clamps to 600s max.
 */
export async function getAssemblyAiToken(
  expiresInSeconds = 60,
): Promise<CopilotTokenResponse> {
  const jwt = await readJwt();
  if (!jwt) {
    throw new CopilotTokenError(
      "no_auth",
      "Connecte-toi pour démarrer une session Copilot.",
    );
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/v1/copilot/transcription-token`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ expiresInSeconds }),
    });
  } catch {
    throw new CopilotTokenError(
      "network",
      `Service Copilot injoignable (${API_BASE_URL}). Vérifie ta connexion.`,
    );
  }

  if (res.status === 401 || res.status === 403) {
    throw new CopilotTokenError(
      "no_auth",
      "Session expirée — reconnecte-toi.",
      res.status,
    );
  }

  if (res.status === 429) {
    let resetAt: number | null = null;
    let message = "Plafond quotidien de sessions Copilot atteint. Réessaye demain.";
    try {
      const data = (await res.json()) as { resetAt?: number; message?: string };
      if (typeof data.resetAt === "number") resetAt = data.resetAt;
      if (typeof data.message === "string") message = data.message;
    } catch {
      /* keep default */
    }
    throw new CopilotTokenError("rate_limited", message, 429, resetAt);
  }

  if (!res.ok) {
    let payload: { error?: string } = {};
    try {
      payload = (await res.json()) as typeof payload;
    } catch {
      /* leave empty */
    }
    if (payload.error === "not_configured") {
      throw new CopilotTokenError(
        "not_configured",
        "Transcription non configurée côté serveur. Reviens dans un moment.",
        res.status,
      );
    }
    throw new CopilotTokenError(
      "upstream",
      `Génération du token impossible (${res.status}). Réessaye.`,
      res.status,
    );
  }

  return (await res.json()) as CopilotTokenResponse;
}
