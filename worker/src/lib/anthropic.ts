/**
 * Thin Anthropic client for server-managed AI endpoints.
 *
 * The Worker holds the only Anthropic API key (set via
 * `wrangler secret put ANTHROPIC_API_KEY`). Routes call into
 * `askCompletion` to get plain-text completions; structured
 * output (tool use) lives in a separate helper when we add it.
 *
 * Hard guardrails baked into every call:
 *   - `max_tokens` is required + small (caller-controlled, but
 *     each route passes its own cap)
 *   - We never forward client-supplied model names; the route
 *     picks the model
 *   - Anthropic 4xx/5xx surface as `AnthropicError` so the route
 *     can map them to a 502 / 503 cleanly.
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

export class AnthropicError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AnthropicError";
  }
}

export interface AskCompletionArgs {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  maxTokens: number;
}

export async function askCompletion(args: AskCompletionArgs): Promise<string> {
  if (!args.apiKey) {
    throw new AnthropicError("Anthropic key not configured on server", 500);
  }

  const body = {
    model: args.model,
    max_tokens: args.maxTokens,
    system: args.system,
    messages: [{ role: "user", content: args.user }],
  };

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": args.apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new AnthropicError(
      `Anthropic ${res.status}: ${text.slice(0, 300)}`,
      res.status,
    );
  }

  const json = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const blocks = Array.isArray(json.content) ? json.content : [];
  const text = blocks
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text!)
    .join("");

  if (!text) {
    throw new AnthropicError("Anthropic returned no text content", 502);
  }
  return text;
}
