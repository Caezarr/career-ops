/**
 * Loops Transactional client — generic `sendLoopsEmail` + thin
 * `sendMagicLinkEmail` wrapper (the original use-case).
 *
 * Loops handles template rendering server-side; we pass:
 *   - `templateId` (Loops "Transactional ID")
 *   - `email` (recipient)
 *   - `dataVariables` (template merge tags)
 *
 * Each template variable used in `dataVariables` MUST exist in the
 * Loops dashboard template, otherwise the API rejects the call.
 *
 * Failure path: bubble up a typed error so the route can map it to
 * a clean response. We don't include the user's email or any token
 * in the error message — those land in Cloudflare logs and we keep
 * the request body scrub-safe.
 */

const LOOPS_ENDPOINT = "https://app.loops.so/api/v1/transactional";

export class LoopsError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "LoopsError";
  }
}

/** Generic Loops transactional send. Pass any string → primitive map
 *  for the template's merge tags; the route owns the contract. */
export async function sendLoopsEmail(args: {
  apiKey: string;
  templateId: string;
  email: string;
  dataVariables: Record<string, string | number | boolean | null>;
}): Promise<void> {
  const { apiKey, templateId, email, dataVariables } = args;

  const resp = await fetch(LOOPS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      transactionalId: templateId,
      email,
      dataVariables,
    }),
  });

  if (!resp.ok) {
    // Loops returns JSON like { success: false, message: "…" }.
    let body: string;
    try {
      const json = (await resp.json()) as { message?: string };
      body = json.message ?? "(no message)";
    } catch {
      body = await resp.text().catch(() => "(unreadable body)");
    }
    throw new LoopsError(resp.status, body);
  }
}

/** Magic-link email — auth-flow wrapper around `sendLoopsEmail`. */
export async function sendMagicLinkEmail(args: {
  apiKey: string;
  templateId: string;
  email: string;
  magicLink: string;
}): Promise<void> {
  return sendLoopsEmail({
    apiKey: args.apiKey,
    templateId: args.templateId,
    email: args.email,
    dataVariables: { magicLink: args.magicLink, email: args.email },
  });
}
