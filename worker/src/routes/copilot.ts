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
