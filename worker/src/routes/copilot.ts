/**
 * Copilot routes — server-managed AssemblyAI realtime transcription.
 *
 * Pattern: token-broker. The merchant AssemblyAI key lives only in
 * Worker secrets (`ASSEMBLYAI_API_KEY`). When the desktop app starts
 * a Copilot session, it calls `POST /v1/copilot/transcription-token`
 * with its JWT, we exchange that for a short-lived AssemblyAI token
 * via their `/v3/token` endpoint, and hand the temp token back. The
 * desktop then connects to `wss://streaming.assemblyai.com/v3/ws?token=…`
 * directly — low latency, no audio proxy through Cloudflare needed.
 *
 * Why not proxy the WebSocket entirely? Two reasons:
 *   1. AssemblyAI realtime is sensitive to per-frame latency. Routing
 *      audio through CF Workers adds 50-150ms per direction.
 *   2. CF Workers WebSocket time counts against billing; a 30-min
 *      interview = ~3M Worker-CPU-seconds. Token-broker = ~1 fetch
 *      per session start.
 *
 * Endpoints:
 *   POST /v1/copilot/transcription-token
 *     Auth required (JWT). Body: optional `expiresInSeconds` (default
 *     60, max 600). Returns `{ token, expiresAt }`.
 */
import { Hono } from "hono";
import { requireAuth, type AuthVars } from "../middleware/requireAuth";
import { checkAndBumpAiUsage, RATE_LIMITS } from "../lib/rateLimit";
import type { Env } from "../types";

export const copilotRoutes = new Hono<{ Bindings: Env; Variables: AuthVars }>();

// ─── POST /v1/copilot/transcription-token ─────────────────────────────────
copilotRoutes.post("/transcription-token", requireAuth, async (c) => {
  const auth = c.get("auth");
  if (!c.env.ASSEMBLYAI_API_KEY) {
    return c.json(
      { error: "not_configured", message: "ASSEMBLYAI_API_KEY missing on the server." },
      500,
    );
  }

  // Optional body — caller can ask for a longer-lived token (e.g.
  // 5 minutes) for long interview sessions. Default is 60s so
  // accidentally-leaked tokens have a short blast radius.
  let expiresInSeconds = 60;
  try {
    const body = (await c.req.json().catch(() => ({}))) as { expiresInSeconds?: number };
    if (typeof body.expiresInSeconds === "number") {
      expiresInSeconds = Math.max(30, Math.min(600, Math.floor(body.expiresInSeconds)));
    }
  } catch {
    /* no body — use default */
  }

  // Rate-limit per user. The bucket counts token requests, not the
  // actual stream minutes (AssemblyAI bills us on the streaming time
  // anyway). 120/day is enough for ~20h of interviews / user.
  const limit = await checkAndBumpAiUsage(
    c.env.DB,
    auth.sub,
    RATE_LIMITS.transcriptionToken,
  );
  if (!limit.allowed) {
    c.header(
      "Retry-After",
      String(limit.resetAt - Math.floor(Date.now() / 1000)),
    );
    return c.json(
      {
        error: "rate_limited",
        message:
          "Plafond quotidien de sessions Copilot atteint. Réessaye demain.",
        resetAt: limit.resetAt,
      },
      429,
    );
  }

  // Call AssemblyAI to mint the temporary streaming token.
  // Streaming v3 contract (https://www.assemblyai.com/docs/api-reference/streaming-api/generate-streaming-token):
  //   GET /v3/token?expires_in_seconds=N
  //   Authorization: <raw_api_key>   (NO Bearer prefix)
  // We were POSTing JSON like the v2 realtime endpoint did — that
  // path 405s on v3, surfaced to the client as a 502 from this Worker.
  const tokenUrl =
    `https://streaming.assemblyai.com/v3/token?expires_in_seconds=${expiresInSeconds}`;
  let resp: Response;
  try {
    resp = await fetch(tokenUrl, {
      method: "GET",
      headers: {
        Authorization: c.env.ASSEMBLYAI_API_KEY,
      },
    });
  } catch (e) {
    console.error("aai token fetch failed", e);
    return c.json({ error: "upstream_failed" }, 502);
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    console.error(
      `aai token http ${resp.status} for user=${auth.sub}: ${text.slice(0, 200)}`,
    );
    return c.json(
      { error: "upstream_failed", status: resp.status },
      502,
    );
  }

  const data = (await resp.json()) as { token?: string };
  if (!data.token) {
    console.error("aai token response missing 'token' field");
    return c.json({ error: "upstream_invalid_response" }, 502);
  }

  return c.json({
    token: data.token,
    expiresAt: Math.floor(Date.now() / 1000) + expiresInSeconds,
    remaining: limit.remaining,
  });
});

// ─── POST /v1/copilot/answer-stream ───────────────────────────────────────
//
// Thin proxy that lets the desktop app stream Claude responses without
// ever holding the merchant Anthropic key. The desktop sends the
// already-built `messages` array (and `system` prompt) — we forward
// it to api.anthropic.com with our server-side `ANTHROPIC_API_KEY`,
// then stream the SSE body straight back. The Rust client (`llm.rs::
// stream_claude`) keeps the exact same line-by-line `data: …` parser
// it had against Anthropic — switching the URL + auth is the only
// client-side delta.
//
// Why proxy raw SSE rather than transform on the edge? Two reasons:
//   1. Anthropic's SSE format (content_block_delta + text_delta events)
//      is stable and well-understood by `llm.rs`. Reshaping it would
//      mean keeping both ends in sync forever; passing through avoids
//      a coordination surface.
//   2. Cloudflare Workers stream bodies natively (`new Response(body)`
//      with no buffering), so the latency overhead is ~one TLS hop.
//
// Body contract (matches what `stream_claude` builds today):
//   {
//     "model":      "claude-sonnet-4-5",
//     "max_tokens": 320,
//     "stream":     true,
//     "system":     "<system prompt>",
//     "messages":   [{ "role": "user", "content": "..." }, ...]
//   }
//
// The `stream: true` flag is forced server-side regardless of input so
// the contract stays one-way (no buffer-the-whole-response mode).
copilotRoutes.post("/answer-stream", requireAuth, async (c) => {
  const auth = c.get("auth");
  if (!c.env.ANTHROPIC_API_KEY) {
    return c.json(
      { error: "not_configured", message: "ANTHROPIC_API_KEY missing on the server." },
      500,
    );
  }

  // Rate-limit per user. The Copilot fires one of these per recruiter
  // turn, so a busy 30-min interview can hit ~30-50 calls. We cap at
  // 200/day which covers any honest use (the spend ceiling is set by
  // max_tokens × this count × Anthropic price).
  const limit = await checkAndBumpAiUsage(
    c.env.DB,
    auth.sub,
    { kind: "copilot-answer-stream", limit: 200 },
  );
  if (!limit.allowed) {
    c.header(
      "Retry-After",
      String(limit.resetAt - Math.floor(Date.now() / 1000)),
    );
    return c.json(
      {
        error: "rate_limited",
        message:
          "Plafond quotidien d'appels Copilot atteint. Réessaye demain.",
        resetAt: limit.resetAt,
      },
      429,
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await c.req.json()) as Record<string, unknown>;
  } catch {
    return c.json({ error: "invalid_body" }, 400);
  }
  // Force-stream — the protocol expects SSE. Belt-and-braces against
  // a client that forgets to set it.
  body.stream = true;

  let upstream: Response;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": c.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error("anthropic stream fetch failed", e);
    return c.json({ error: "upstream_failed" }, 502);
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    console.error(
      `anthropic stream http ${upstream.status} for user=${auth.sub}: ${text.slice(0, 500)}`,
    );
    return c.json(
      {
        error: "upstream_failed",
        status: upstream.status,
        // Surface the upstream body to the desktop so the user (or
        // log dump) can tell whether the model name is stale vs. our
        // key is wrong vs. content policy etc. Truncated to 500 chars
        // to keep the response small.
        upstream: text.slice(0, 500),
      },
      502,
    );
  }

  // Pass-through stream. `c.body()` would buffer in Hono; we return a
  // raw Response so the SSE chunks reach the desktop as fast as they
  // arrive from Anthropic.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      "x-copilot-remaining": String(limit.remaining),
    },
  });
});
