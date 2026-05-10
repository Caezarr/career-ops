/**
 * Loops Transactional client — single function, sends the magic-link
 * email. Loops handles the template rendering server-side; we only
 * pass the data variables.
 *
 * The transactional template MUST have these variables in the
 * Loops dashboard, otherwise the API rejects the call:
 *   - magicLink
 *   - email
 *
 * Failure path: bubble up a typed error so the route can map it to
 * a clean response. We don't include the user's email or the token
 * in the error message — those land in Cloudflare logs and we want
 * the request body to stay scrub-safe.
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

export async function sendMagicLinkEmail(args: {
  apiKey: string;
  templateId: string;
  email: string;
  magicLink: string;
}): Promise<void> {
  const { apiKey, templateId, email, magicLink } = args;

  const resp = await fetch(LOOPS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      transactionalId: templateId,
      email,
      dataVariables: {
        magicLink,
        email,
      },
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
