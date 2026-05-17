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

// ── Sprint 1.2 (2026-05-17) — POST /v1/copilot/stt ───────────────────────────
//
// Per-utterance STT for the new VAD-segmented audio pipeline. Replaces
// the continuous AAI v3 streaming WebSocket for the INTERVIEWER side
// (the user side keeps streaming for the teleprompter cursor matcher).
//
// Flow:
//   1. Desktop client VAD-segments the system audio (SCK / Core Audio
//      Tap) into one WAV per utterance (~3-8s typical).
//   2. POSTs the WAV here as `multipart/form-data` with `wav` + optional
//      `language`.
//   3. We upload to AAI's batch endpoint, create a transcript job, poll
//      until done, return the text.
//
// Cost vs continuous streaming: per-utterance latency is ~0.5-2s
// vs ~250ms partials, but the dashboard renders 30-60x fewer events,
// the React main thread stays responsive, and AAI bills by audio
// minutes either way. See `.planning/WORKER_TODO_STT.md` for the full
// design rationale.
copilotRoutes.post("/stt", requireAuth, async (c) => {
  const auth = c.get("auth");
  if (!c.env.ASSEMBLYAI_API_KEY) {
    return c.json(
      {
        error: "not_configured",
        message: "ASSEMBLYAI_API_KEY missing on the server.",
      },
      500,
    );
  }

  // Rate-limit: 400 utterances/day per user. Tight enough to cap a
  // runaway client, loose enough that a 30-min session (~100-150
  // utterances) × 2-3 sessions/day stays under the bar.
  const limit = await checkAndBumpAiUsage(
    c.env.DB,
    auth.sub,
    RATE_LIMITS.copilotStt,
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
          "Plafond quotidien de transcriptions Copilot atteint. Réessaye demain.",
        resetAt: limit.resetAt,
      },
      429,
    );
  }

  // Parse multipart. Hono's `formData()` handles the Cloudflare Workers
  // Request stream; an explicit try/catch lets us surface a clean 400
  // instead of the framework's 500 on malformed bodies.
  let form: FormData;
  try {
    form = await c.req.formData();
  } catch (e) {
    return c.json(
      { error: "invalid_multipart", message: String(e) },
      400,
    );
  }
  // Cloudflare Workers' FormData type narrows `get()` results
  // narrowly in TS. We assert the broader DOM-compatible shape so the
  // narrowing below produces a usable Blob instead of `never`.
  const wavField = form.get("wav") as Blob | string | null;
  if (wavField === null || typeof wavField === "string") {
    return c.json({ error: "missing_wav_field" }, 400);
  }
  const wav = wavField;
  if (wav.size === 0) return c.json({ error: "empty_wav" }, 400);
  // 30s @ 48kHz mono 16-bit ≈ 2.9 MB. 10 MB is the abuse cap — bigger
  // payloads almost certainly mean the VAD's 30s safety cut didn't
  // fire, which suggests a client bug.
  if (wav.size > 10 * 1024 * 1024) {
    return c.json({ error: "wav_too_large", size: wav.size }, 413);
  }
  const langRaw = (form.get("language") ?? "auto").toString().toLowerCase();
  const language: "fr" | "en" | "auto" =
    langRaw === "fr" || langRaw === "en" ? langRaw : "auto";

  // ── Step 1: upload audio to AAI ─────────────────────────────────────
  let uploadResp: Response;
  try {
    uploadResp = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        Authorization: c.env.ASSEMBLYAI_API_KEY,
        "content-type": "application/octet-stream",
      },
      body: wav,
    });
  } catch (e) {
    console.error("aai upload fetch failed", e);
    return c.json({ error: "upstream_failed", step: "upload" }, 502);
  }
  if (!uploadResp.ok) {
    const txt = await uploadResp.text().catch(() => "");
    console.error(
      `aai upload http ${uploadResp.status}: ${txt.slice(0, 200)}`,
    );
    return c.json(
      {
        error: "upstream_failed",
        step: "upload",
        status: uploadResp.status,
      },
      502,
    );
  }
  const uploadJson = (await uploadResp.json()) as { upload_url?: string };
  if (!uploadJson.upload_url) {
    return c.json(
      { error: "upstream_invalid_response", step: "upload" },
      502,
    );
  }

  // ── Step 2: create transcript job ───────────────────────────────────
  // 2026-05-17: AAI changed the batch API. The field is now
  // `speech_models` (PLURAL, array) instead of `speech_model` (singular
  // string), and it must contain one of: "universal-3-pro" | "universal-2".
  // Older docs referenced "best" / "nano" / "slam-1" which AAI now
  // rejects with HTTP 400:
  //   "\"speech_models\" must be a non-empty list containing one or
  //    more of: \"universal-3-pro\", \"universal-2\""
  // We use `universal-2` — broad FR + EN coverage, ~50% cheaper than
  // universal-3-pro per minute, latency comparable. Upgrade to
  // universal-3-pro per-session if a paying tier asks for top quality.
  const createBody: Record<string, unknown> = {
    audio_url: uploadJson.upload_url,
    speech_models: ["universal-2"],
    punctuate: true,
    format_text: true,
  };
  if (language === "auto") createBody.language_detection = true;
  else createBody.language_code = language;

  let createResp: Response;
  try {
    createResp = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        Authorization: c.env.ASSEMBLYAI_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify(createBody),
    });
  } catch (e) {
    console.error("aai create fetch failed", e);
    return c.json({ error: "upstream_failed", step: "create" }, 502);
  }
  if (!createResp.ok) {
    const txt = await createResp.text().catch(() => "");
    // Log the full AAI error body to the Worker console (visible via
    // `wrangler tail`) but DO NOT echo it back to the client. AAI
    // error payloads can leak internal state we shouldn't expose.
    console.error(
      `aai create http ${createResp.status}: ${txt.slice(0, 500)}`,
    );
    return c.json(
      {
        error: "upstream_failed",
        step: "create",
        status: createResp.status,
      },
      502,
    );
  }
  const createJson = (await createResp.json()) as { id?: string };
  if (!createJson.id) {
    return c.json(
      { error: "upstream_invalid_response", step: "create" },
      502,
    );
  }
  const jobId = createJson.id;

  // ── Step 3: poll until done ─────────────────────────────────────────
  // AAI batch latency: 0.5-2s on ≤5s clips, up to 5s on 30s clips.
  // 25s cap (50 polls × 500ms) covers the tail with margin; on timeout
  // the desktop client drops the utterance and the user retries on the
  // next one. Better than blocking the candidate during a live call.
  const POLL_INTERVAL_MS = 500;
  const MAX_POLLS = 50;
  const statusUrl = `https://api.assemblyai.com/v2/transcript/${jobId}`;
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    let pollResp: Response;
    try {
      pollResp = await fetch(statusUrl, {
        headers: { Authorization: c.env.ASSEMBLYAI_API_KEY },
      });
    } catch (e) {
      console.error(`aai poll fetch failed (attempt ${i})`, e);
      continue;
    }
    if (!pollResp.ok) {
      const txt = await pollResp.text().catch(() => "");
      console.error(
        `aai poll http ${pollResp.status} (attempt ${i}): ${txt.slice(0, 200)}`,
      );
      continue;
    }
    const j = (await pollResp.json()) as {
      status?: string;
      text?: string;
      language_code?: string;
      audio_duration?: number;
      error?: string;
    };
    if (j.status === "completed") {
      return c.json({
        text: j.text ?? "",
        language: j.language_code ?? language,
        duration_seconds: j.audio_duration ?? 0,
      });
    }
    if (j.status === "error") {
      console.error(`aai job ${jobId} errored: ${j.error}`);
      return c.json(
        {
          error: "transcription_failed",
          message: j.error ?? "unknown",
        },
        502,
      );
    }
    // queued | processing → keep polling
  }

  return c.json(
    {
      error: "transcription_timeout",
      message: `AAI did not complete within ${(MAX_POLLS * POLL_INTERVAL_MS) / 1000}s`,
      jobId,
    },
    504,
  );
});
