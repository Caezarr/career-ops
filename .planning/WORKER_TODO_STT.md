# WORKER_TODO — Sprint 1.2 STT route

> Sandbox blocked the agent from writing files inside `worker/` and at
> the repo root during the Sprint 1.2 run (the writable working
> directories were limited to `src-tauri/`, `remotion/`, `.planning/`,
> and `/tmp`). Parking this spec inside `.planning/` so it lands with
> the rest of the project notes; move it to `WORKER_TODO.md` at the
> repo root when convenient.
>
> The Rust client side (`src-tauri/src/stt.rs::transcribe_wav`) is
> fully wired and will call this endpoint as soon as it is added to
> the Worker and deployed.

## What needs to ship

Append a new handler to `worker/src/routes/copilot.ts` (the
`copilotRoutes` Hono router that already mounts the existing
`/transcription-token` and `/answer-stream` routes). Nothing else
needs to change — `app.route("/v1/copilot", copilotRoutes)` in
`worker/src/index.ts` already wires the prefix, and the
`ASSEMBLYAI_API_KEY` secret is already declared in
`worker/src/types.ts` (line 51).

## Route contract

```
POST /v1/copilot/stt
Authorization: Bearer <user-jwt>
Content-Type: multipart/form-data

Fields:
  wav       (required, audio/wav)   VAD-segmented utterance. mono 16-bit
                                    PCM, source rate (typically 48 kHz
                                    from SCK). Max 10 MB (≈ 30 s).
  language  (optional, string)      "fr" | "en" | "auto" (default "auto").

Response 200:
  {
    "text":             string,
    "language":         string,
    "duration_seconds": number
  }

Errors:
  400  missing_wav_field | empty_wav | invalid_multipart
  401  invalid_token (handled by requireAuth middleware)
  413  wav_too_large
  429  rate_limited (Retry-After header set)
  502  upstream_failed (step: upload | create) | transcription_failed
  504  transcription_timeout
```

## Drop-in handler

```ts
copilotRoutes.post("/stt", requireAuth, async (c) => {
  const auth = c.get("auth");
  if (!c.env.ASSEMBLYAI_API_KEY) {
    return c.json(
      { error: "not_configured", message: "ASSEMBLYAI_API_KEY missing on the server." },
      500,
    );
  }

  // Quota — 400 calls/user/day. ≈150 utterances per 30-min session
  // × 2-3 sessions/day = plenty of head-room.
  const limit = await checkAndBumpAiUsage(c.env.DB, auth.sub, {
    kind: "copilot-stt",
    limit: 400,
  });
  if (!limit.allowed) {
    c.header("Retry-After", String(limit.resetAt - Math.floor(Date.now() / 1000)));
    return c.json(
      {
        error: "rate_limited",
        message: "Plafond quotidien de transcriptions Copilot atteint. Réessaye demain.",
        resetAt: limit.resetAt,
      },
      429,
    );
  }

  // Parse multipart.
  let form: FormData;
  try { form = await c.req.formData(); }
  catch (e) { return c.json({ error: "invalid_multipart", message: String(e) }, 400); }
  const wavField = form.get("wav");
  if (!(wavField instanceof File) && !(wavField instanceof Blob)) {
    return c.json({ error: "missing_wav_field" }, 400);
  }
  const wav = wavField as Blob;
  if (wav.size === 0) return c.json({ error: "empty_wav" }, 400);
  // 30 s @ 48 kHz mono 16-bit ≈ 2.9 MB. 10 MB is the abuse cap.
  if (wav.size > 10 * 1024 * 1024) {
    return c.json({ error: "wav_too_large", size: wav.size }, 413);
  }
  const langRaw = (form.get("language") ?? "auto").toString().toLowerCase();
  const language = (langRaw === "fr" || langRaw === "en") ? langRaw : "auto";

  // Step 1: upload to AAI.
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
    console.error(`aai upload http ${uploadResp.status}: ${txt.slice(0, 200)}`);
    return c.json(
      { error: "upstream_failed", step: "upload", status: uploadResp.status },
      502,
    );
  }
  const uploadJson = (await uploadResp.json()) as { upload_url?: string };
  if (!uploadJson.upload_url) {
    return c.json({ error: "upstream_invalid_response", step: "upload" }, 502);
  }

  // Step 2: create transcript job.
  const createBody: Record<string, unknown> = {
    audio_url: uploadJson.upload_url,
    speech_model: "universal",
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
    console.error(`aai create http ${createResp.status}: ${txt.slice(0, 200)}`);
    return c.json(
      { error: "upstream_failed", step: "create", status: createResp.status },
      502,
    );
  }
  const createJson = (await createResp.json()) as { id?: string };
  if (!createJson.id) {
    return c.json({ error: "upstream_invalid_response", step: "create" }, 502);
  }
  const jobId = createJson.id;

  // Step 3: poll until done (25 s cap = 50 polls × 500 ms).
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
      console.error(`aai poll http ${pollResp.status} (attempt ${i}): ${txt.slice(0, 200)}`);
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
        { error: "transcription_failed", message: j.error ?? "unknown" },
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
```

## Why these choices

- **Reuse `ASSEMBLYAI_API_KEY`** — already declared in `worker/src/types.ts`
  and used by `/transcription-token`. One secret, one billing surface.
- **`speech_model: "universal"`** — matches the FR+EN coverage of the
  WebSocket path (`universal-streaming-multilingual`). Career OS users
  swap languages mid-conversation in MBB / IB / FAANG interviews.
- **`language_detection: true` when `language === "auto"`** — caller
  picks; we don't force a side when they don't tell us.
- **400/day rate limit** — bounded enough to cap a runaway client,
  loose enough that an honest 30-min session never hits the wall.
- **25 s polling cap** — AAI batch latency on ≤ 5 s clips is 0.5-2 s,
  up to 5 s on 30 s clips. 25 s covers the tail with margin; surface
  504 so the client can drop the utterance rather than block.

## Deployment checklist

- [ ] Append the handler to `worker/src/routes/copilot.ts`
- [ ] `cd worker && pnpm run build && pnpm wrangler deploy`
- [ ] Smoke test:
      `curl -F wav=@sample.wav -F language=auto \
            -H "Authorization: Bearer $JWT" \
            https://api.careeros.fr/v1/copilot/stt`
- [ ] Delete this file once the route is live.
