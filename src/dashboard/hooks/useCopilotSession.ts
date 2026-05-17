import { useCallback, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { useAppStore } from '../store';
import {
  readCopilotConfig,
  type CopilotConfigSnapshot,
} from './useAnthropicKey';
import type {
  CopilotMode,
  CopilotStatus,
} from '../store/slices/copilotSessions';

/**
 * Two hooks compose the Copilot session machinery:
 *
 *   - `useCopilotEventBridge()` registers Tauri event listeners and
 *     mutates the slice. Mount it ONCE at the root of the dashboard
 *     window (we add an invisible <CopilotEventBridge /> in
 *     DashboardApp). Mounting twice = duplicate events = corrupt
 *     transcript / answer state.
 *
 *   - `useCopilotControls()` exposes the imperative actions any
 *     component can call (`start`, `stop`, `singleShot`,
 *     `generatePitch`). Pure factory — no subscriptions.
 *
 * Persistence + status transitions live in the bridge so the slice is
 * the single source of truth. The bridge auto-commits the in-flight
 * transcript on `recording → thinking` and the in-flight answer on
 * `thinking → ready|listening|error`.
 */

// 2026-05-17: module-level singleton flag prevents double-subscription
// of the Tauri event listeners under React 18 StrictMode (dev-only
// double-mount of every useEffect). The previous design relied on the
// `cancelled` closure variable + the listen() Promise resolution to
// unregister, but listen() is async and so is the underlying Tauri
// register-listener call. Window between cleanup and Promise resolution
// leaves BOTH listeners registered on the Rust side, doubling every
// answer-token / transcript / status event. Observed bug: every Claude
// answer rendered with each chunk duplicated ("**TL;DR:** Je**TL;DR:**
// Je me concentre…"). The singleton fixes it at the source: only the
// first mount actually subscribes.
let bridgeActive = false;

// ─── Event bridge — listens to Tauri events, mutates the slice ─────
export function useCopilotEventBridge() {
  const setStatus = useAppStore((s) => s.setCopilotStatus);
  const setError = useAppStore((s) => s.setCopilotError);
  const applyTranscriptDelta = useAppStore((s) => s.applyTranscriptDelta);
  const applyUserTranscriptDelta = useAppStore((s) => s.applyUserTranscriptDelta);
  const appendPendingAnswerToken = useAppStore((s) => s.appendPendingAnswerToken);
  const clearPendingAnswer = useAppStore((s) => s.clearPendingAnswer);
  const commitPendingTranscript = useAppStore((s) => s.commitPendingTranscript);
  const commitPendingAnswer = useAppStore((s) => s.commitPendingAnswer);

  const prevStatusRef = useRef<CopilotStatus>('idle');
  const lastCommittedTranscriptIdRef = useRef<string | null>(null);

  // Wave 2 (2026-05-17): SQLite-backed conversation persistence.
  // Holds the active `copilot_conversation.id` for the duration of the
  // session. Created on first interviewer-utterance / user-final and
  // reused for every subsequent persist call until the session ends.
  // Fire-and-forget pattern: every `invoke()` is .catch()'d so a DB
  // hiccup never tanks the live UI. The full conversation history
  // lives on disk and reloads on next launch via hydrateConversations.
  const conversationIdRef = useRef<string | null>(null);
  const ensureConversation = async (): Promise<string | null> => {
    if (conversationIdRef.current) return conversationIdRef.current;
    try {
      const id = await invoke<{ id: string }>(
        'db_copilot_create_conversation',
        {
          input: {
            title:
              'Session ' +
              new Date().toLocaleString('fr-FR', {
                dateStyle: 'short',
                timeStyle: 'short',
              }),
            company: null,
            role: null,
          },
        },
      ).then((c) => c.id);
      conversationIdRef.current = id;
      return id;
    } catch (err) {
      console.warn('[persist] create conversation failed:', err);
      return null;
    }
  };
  const persistMessage = (
    role: 'interviewer' | 'candidate' | 'copilot' | 'system',
    content: string,
    metadata?: Record<string, unknown>,
  ) => {
    if (!content.trim()) return;
    ensureConversation().then((id) => {
      if (!id) return;
      invoke('db_copilot_append_message', {
        input: {
          conversationId: id,
          role,
          content,
          attachments: null,
          metadata: metadata ?? null,
        },
      }).catch((err) => {
        console.warn('[persist] append message failed:', err);
      });
    });
  };

  useEffect(() => {
    // Singleton guard — see `bridgeActive` declaration above. If the
    // bridge is already mounted (e.g. StrictMode's second pass) we
    // skip the subscriptions entirely. The cleanup below releases the
    // flag so a real unmount + re-mount (HMR, navigation) still works.
    if (bridgeActive) {
      return () => {};
    }
    bridgeActive = true;

    const cleanups: UnlistenFn[] = [];
    let cancelled = false;

    function track(p: Promise<UnlistenFn>) {
      p.then((un) => {
        if (cancelled) un();
        else cleanups.push(un);
      }).catch(() => {});
    }

    track(
      listen<CopilotStatus>('status', (e) => {
        const next = e.payload;
        const prev = prevStatusRef.current;

        // listening → thinking : recruiter finished speaking (debouncer
        // fired after 2s silence on a finalised turn), commit the
        // in-flight transcript so the bubble lands. Rust never emits
        // a "recording" status — that was a stale pre-pivot name; the
        // actual sequence from session.rs is listening → thinking →
        // listening on a Claude turn.
        if (prev === 'listening' && next === 'thinking') {
          const sessions = useAppStore.getState().copilotSessions;
          const active = useAppStore.getState().activeSessionId;
          const sess = sessions.find((s) => s.id === active);
          const previousLastId =
            sess?.transcript[sess.transcript.length - 1]?.id ?? null;
          commitPendingTranscript();
          const after = useAppStore
            .getState()
            .copilotSessions.find((s) => s.id === active);
          const newLastId =
            after?.transcript[after.transcript.length - 1]?.id ?? null;
          if (newLastId && newLastId !== previousLastId) {
            lastCommittedTranscriptIdRef.current = newLastId;
          }
        }

        // thinking → (ready|listening) : answer finished streaming,
        // attach it to the session linked to the just-committed
        // transcript bubble.
        if (prev === 'thinking' && (next === 'ready' || next === 'listening')) {
          const finalAnswer =
            useAppStore.getState().pendingAnswer.trim();
          commitPendingAnswer({
            questionTranscriptId:
              lastCommittedTranscriptIdRef.current ?? undefined,
          });
          // Wave 2: persist the Claude answer to SQLite.
          if (finalAnswer) {
            persistMessage('copilot', finalAnswer);
          }
        }

        // Errors should also flush partial output.
        if (prev === 'thinking' && next === 'error') {
          commitPendingAnswer({
            questionTranscriptId:
              lastCommittedTranscriptIdRef.current ?? undefined,
          });
        }

        // Wave 2: when the session transitions BACK to idle, reset
        // the conversation id so the next session starts a new
        // copilot_conversation row.
        if (prev !== 'idle' && next === 'idle') {
          conversationIdRef.current = null;
        }

        prevStatusRef.current = next;
        setStatus(next);
      }),
    );

    track(
      listen<{ text: string; final: boolean }>('transcript', (e) => {
        // Legacy event — kept for the BYOK one-shot `start_capture`
        // flow. The Sprint 1 live-session path no longer fires this;
        // it emits `interviewer-utterance` instead (one event per VAD
        // silence boundary, post-STT).
        applyTranscriptDelta(e.payload);
        clearPendingAnswer();
      }),
    );

    // Sprint 1.3 (2026-05-17): the interviewer transcript pipeline is
    // now VAD → HTTP STT (see `src-tauri/src/vad.rs` + `src-tauri/src/stt.rs`),
    // which emits ONE `interviewer-utterance` event per utterance
    // (silence boundary) instead of the legacy per-partial `transcript`
    // stream. The shape grew a `ts` and a `duration_ms` field for UI
    // badges; text routing is otherwise identical — apply as a
    // `final: true` delta (every utterance is self-contained, no
    // partials to merge).
    track(
      listen<{ text: string; ts: number; duration_ms: number }>(
        'interviewer-utterance',
        (e) => {
          applyTranscriptDelta({ text: e.payload.text, final: true });
          clearPendingAnswer();
          // Wave 2: persist the interviewer utterance to SQLite.
          persistMessage('interviewer', e.payload.text, {
            duration_ms: e.payload.duration_ms,
            ts: e.payload.ts,
          });
        },
      ),
    );

    // Phase 4b: candidate's voice (mic), transcribed by the second
    // AAI stream. Routes to a dedicated pair of buffers — partial +
    // cumulative finalised — that the teleprompter cursor matcher
    // consumes. Deliberately NOT touching pendingTranscript /
    // pendingAnswer here: the user's own voice must not look like a
    // new interviewer question to the rest of the pipeline.
    track(
      listen<{ text: string; final: boolean }>('user-transcript', (e) => {
        applyUserTranscriptDelta(e.payload);
        // Wave 2: persist only FINAL candidate utterances to SQLite.
        // Partials would flood the DB with ~5 writes/sec — keep them
        // in-memory only for the cursor matcher.
        if (e.payload.final) {
          persistMessage('candidate', e.payload.text);
        }
      }),
    );

    track(
      listen<string>('answer-token', (e) => {
        appendPendingAnswerToken(e.payload);
      }),
    );

    // D2 (2026-05-17): each new Claude generation emits
    // `answer-stream-start` from the Rust debouncer / force-fire
    // branch (T3 in session.rs). Wipe the previous answer text before
    // the first token of the new stream arrives so the teleprompter
    // doesn't briefly show "old answer + new tokens appended". Matches
    // Pluely's cancel-and-restart pattern from `useSystemAudio.ts`.
    track(
      listen<void>('answer-stream-start', () => {
        clearPendingAnswer();
      }),
    );

    track(
      listen<string>('error', (e) => {
        setError(e.payload);
      }),
    );

    return () => {
      cancelled = true;
      cleanups.forEach((c) => c());
      bridgeActive = false;
    };
  }, [
    setStatus,
    setError,
    applyTranscriptDelta,
    applyUserTranscriptDelta,
    appendPendingAnswerToken,
    clearPendingAnswer,
    commitPendingTranscript,
    commitPendingAnswer,
  ]);
}

// ─── Teleprompter bridge (Phase 5) ──────────────────────────────────
//
// Pushes a `TeleprompterState` snapshot to the standalone teleprompter
// window every time `pendingAnswer` / `status` / `activeSessionId`
// changes, AND shows/hides the window on session start/stop.
//
// Why a separate hook rather than baking this into useCopilotControls?
//   - The state changes we react to (pendingAnswer streaming tokens
//     in particular) fire HUNDREDS of times per second. We want the
//     subscription to be narrow + the work per tick trivial.
//   - The window-visibility commands are session-lifecycle, not per-
//     token. Decoupling lets us debounce/throttle the high-frequency
//     pushes without affecting the lifecycle calls.
//
// Side-effect-only — returns null. Mount once at the dashboard root.
export function useTeleprompterBridge(): void {
  // The hook stays on the dashboard side (label "main") — only the
  // main webview owns the Zustand store. The teleprompter window
  // hydrates its own local copy from the events we push below.
  const pendingAnswer = useAppStore((s) => s.pendingAnswer);
  const sessions = useAppStore((s) => s.copilotSessions);
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const status = useAppStore((s) => s.copilotStatus);
  // Phase 4b: snapshot the latest user-voice ASR text so the
  // standalone teleprompter window can run the same banded-Levenshtein
  // cursor matcher as the in-dashboard component. We push the
  // PARTIAL + FINAL joined into a single string — the standalone
  // window doesn't care about the split (the matcher already
  // tokenises + only uses the tail of the spoken stream).
  const userTranscriptPartial = useAppStore((s) => s.userTranscriptPartial);
  const userTranscriptFinal = useAppStore((s) => s.userTranscriptFinal);
  const userTranscriptTick = useAppStore((s) => s.userTranscriptTick);

  const session = activeSessionId
    ? sessions.find((s) => s.id === activeSessionId) ?? null
    : sessions[0] ?? null;
  const lastAnswerText = session?.answers[session.answers.length - 1]?.text ?? '';
  const text = pendingAnswer || lastAnswerText;
  const isStreaming = status === 'thinking' && pendingAnswer.length > 0;
  const sessionActive = activeSessionId !== null && status !== 'idle';
  const userPartial =
    userTranscriptFinal && userTranscriptPartial
      ? `${userTranscriptFinal} ${userTranscriptPartial}`
      : userTranscriptFinal || userTranscriptPartial;

  // Push the snapshot every time the derived triple changes. The
  // Rust command is `emit_to`-only — fire-and-forget, sub-ms.
  // Phase 4b: we also fire on every `userTranscriptTick` bump so the
  // standalone window's matcher gets a chance to advance the cursor
  // even when the text payload stayed the same (AAI re-emits stable
  // partials).
  useEffect(() => {
    invoke('push_teleprompter_state', {
      state: { text, isStreaming, sessionActive, userPartial },
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[teleprompter] push state failed:', err);
    });
  }, [text, isStreaming, sessionActive, userPartial, userTranscriptTick]);

  // Show / hide the dedicated window on session lifecycle. Only
  // depends on `sessionActive` — not on the answer state — so we
  // don't churn the window on every token.
  useEffect(() => {
    invoke('set_teleprompter_visible', { visible: sessionActive }).catch(
      (err) => {
        // eslint-disable-next-line no-console
        console.warn('[teleprompter] visibility toggle failed:', err);
      },
    );
  }, [sessionActive]);
}

// ─── Controls — imperative actions exposed to UI components ────────
export function useCopilotControls() {
  const setStatus = useAppStore((s) => s.setCopilotStatus);
  const setError = useAppStore((s) => s.setCopilotError);
  const startCopilotSession = useAppStore((s) => s.startCopilotSession);
  const endCopilotSession = useAppStore((s) => s.endCopilotSession);
  const commitPendingAnswer = useAppStore((s) => s.commitPendingAnswer);

  // Idempotency guard for start(). The Tauri `start_session` command
  // is destructive on re-entry: it cancels any existing session via
  // `s.stop_signal.take().send(())` then starts a fresh pipeline.
  // Combine that with React StrictMode's dev-mode double-mount (or
  // a user double-clicking the Start button), and you get:
  //   - invoke #1 → spawns audio-tap + AAI streams (session A)
  //   - invoke #2 → cancels session A, spawns session B
  //   - session A emits "session ended" → React flips status to idle
  //   - session B is running but the UI shows idle → confusing
  // The user reported exactly this pattern: ~1.7s after Start, the
  // button reverted to "Start session" with no transcript activity,
  // and the Rust logs showed two audio-tap inits (one per invoke).
  //
  // This ref short-circuits any second call to start() while a first
  // is in flight. Released in both the success and error paths.
  const startingRef = useRef(false);

  /** Build a CaptureConfig with optional job/CV context overrides.
   *  When `cvText`/`jdText` are provided (e.g. from a linked Job /
   *  CV), they win over the legacy `ic-config.cv` / `ic-config.jd`
   *  blobs — Career OS knows the user's REAL context (which job
   *  they're interviewing for, which CV they sent) and shouldn't fall
   *  back to whatever was last typed in the overlay. */
  const buildConfig = useCallback(
    (
      mode: CopilotMode,
      opts?: {
        snap?: CopilotConfigSnapshot;
        cvText?: string;
        jdText?: string;
      },
    ) => {
      const cfg = opts?.snap ?? readCopilotConfig();
      const cv = opts?.cvText?.trim() || cfg.cv;
      const jd = opts?.jdText?.trim() || cfg.jd;
      // Audio device labels on macOS go through cpal which keys on the
      // device's display name. We carry the legacy `audio_device`
      // string from `ic-config` — Settings → Audio will persist labels
      // alongside the WebAudio IDs in a follow-up.
      return {
        anthropicKey: cfg.anthropicKey,
        openaiKey: cfg.openaiKey,
        cv,
        jd,
        persona: cfg.persona,
        durationSecs: 6,
        audioDevice: cfg.audioDevice,
        loopbackDevice: cfg.loopbackDevice,
        model: cfg.model,
        assemblyaiKey: cfg.assemblyaiKey,
        appMode: mode,
      };
    },
    [],
  );

  const start = useCallback(
    async (opts: {
      mode: CopilotMode;
      /** Optional job link — JD text and company/role default to this
       *  job's fields. */
      jobId?: string;
      /** Optional CV variant — parsed text fed to Claude as context. */
      cvId?: string;
    }) => {
      // Idempotency: bail if a start() is already running. See
      // `startingRef` declaration for full rationale (StrictMode +
      // destructive-re-entry on the Rust side).
      if (startingRef.current) {
        // eslint-disable-next-line no-console
        console.warn('[copilot] start() ignored — a session start is already in flight');
        return false;
      }
      startingRef.current = true;
      const cfg = readCopilotConfig();
      // Pre-pivot BYOK gate removed: Career OS hosts the Anthropic
      // credit on the Worker. Auth is enforced server-side via the
      // user's JWT (token fetch below). If the JWT is missing or
      // expired the AAI-token call fails — surfaced as a banner.
      // Comment in EmbeddedCopilotPanel.tsx already documented this
      // post-pivot intent; the code just hadn't caught up.
      setError(null);

      // Fetch a fresh AssemblyAI streaming token from the Worker.
      // The real merchant key never leaves Cloudflare; this gives us
      // a 60-second one-shot token (extendable to 600s for long
      // sessions). The token replaces `cfg.assemblyaiKey` in the
      // CaptureConfig handed to Rust — session.rs appends it as
      // `?token=…` on the AssemblyAI v3 WebSocket URL.
      let assemblyaiToken: string;
      // Phase 4b: a SECOND token dedicated to the candidate's mic
      // (drives the teleprompter cursor via banded Levenshtein). The
      // Worker rate-limits transcription tokens per-day (not per-
      // session), so two calls per `start()` is fine — the daily
      // budget (120) still covers 60 sessions, well above the
      // expected ceiling for a single user.
      //
      // The second fetch is BEST-EFFORT: if it fails (rate-limited,
      // network blip, etc.) we log a warning and pass an empty
      // string — Rust silently drops the second WS spawn and the
      // teleprompter falls back to the Phase 4a timer.
      let userVoiceAssemblyaiToken = '';
      try {
        const { getAssemblyAiToken } = await import('../lib/copilotToken');
        // 5 minutes — long enough that a normal interview session
        // (avg ~15min, max ~50min) doesn't need a mid-stream
        // refresh. AssemblyAI keeps the WebSocket open even after
        // token expiry as long as the stream was established.
        const tokenResp = await getAssemblyAiToken(300);
        assemblyaiToken = tokenResp.token;
        try {
          const userTokenResp = await getAssemblyAiToken(300);
          userVoiceAssemblyaiToken = userTokenResp.token;
        } catch (userTokenErr) {
          // Don't fail session start — Phase 4a timer fallback still
          // works. Surfacing as a console.warn keeps the failure
          // visible to devs without breaking the user flow.
          // eslint-disable-next-line no-console
          console.warn(
            '[copilot] user-voice transcription token unavailable, ' +
              'teleprompter will fall back to Phase 4a timer:',
            userTokenErr,
          );
        }
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : 'Transcription token unavailable. Try again in a moment.';
        setError(msg);
        startingRef.current = false;
        return false;
      }

      // Resolve the linked job + CV from the live store. If picker
      // values aren't passed, fall back to the persisted picker
      // selection (Settings → Copilot picker), then to the user's
      // default CV.
      const state = useAppStore.getState();
      const jobId = opts.jobId ?? state.copilotPickerJobId ?? undefined;
      const cvId =
        opts.cvId ?? state.copilotPickerCvId ?? state.defaultCvId ?? state.cvs[0]?.id;
      const job = jobId ? state.jobs.find((j) => j.id === jobId) : undefined;
      const cv = cvId ? state.cvs.find((c) => c.id === cvId) : undefined;
      const company = job?.company;
      const role = job?.role;
      const jdText = job?.jdText;
      const cvText = cv?.parsedText;

      // Hot-reload / crash safety: if a session is still flagged
      // active, close it before starting a new one.
      const existingActive = state.activeSessionId;
      if (existingActive) endCopilotSession();
      startCopilotSession({
        mode: opts.mode,
        company,
        role,
        jobId,
        cvId,
      });
      try {
        // Override `assemblyaiKey` with the freshly-minted server
        // token. buildConfig still reads the legacy BYOK field for
        // backwards-compat — we explicitly clobber it here.
        //
        // Phase 4b: `userVoiceAssemblyaiToken` is forwarded as a
        // camelCase field — serde's `rename_all = "camelCase"` on
        // CaptureConfig maps it to `user_voice_assemblyai_token` on
        // the Rust side. Empty string disables the second AAI
        // stream entirely (Rust treats empty as "no Phase 4b").
        const config = {
          ...buildConfig(opts.mode, { snap: cfg, cvText, jdText }),
          assemblyaiKey: assemblyaiToken,
          userVoiceAssemblyaiToken,
        };
        await invoke('start_session', { config });
        // Flip the app to macOS `Accessory` activation: Dock icon
        // disappears, CMD+Tab skips us, Mission Control hides us.
        // Best-effort — a failure here doesn't abort the session.
        await invoke('set_stealth_mode', { enabled: true }).catch((err) => {
          console.warn('[copilot] stealth mode enable failed:', err);
        });
        setStatus('listening');
        startingRef.current = false;
        return true;
      } catch (e) {
        setError(String(e));
        setStatus('error');
        startingRef.current = false;
        return false;
      }
    },
    [buildConfig, endCopilotSession, setError, setStatus, startCopilotSession],
  );

  const stop = useCallback(async () => {
    try {
      await invoke('stop_session');
      // Restore Regular activation policy so the user can find Career
      // OS in the Dock / CMD+Tab again. Best-effort like the enable.
      await invoke('set_stealth_mode', { enabled: false }).catch((err) => {
        console.warn('[copilot] stealth mode disable failed:', err);
      });
      // Flush any in-flight content before closing the session — we
      // don't want a partial answer to disappear because the user
      // hit Stop mid-stream.
      commitPendingAnswer();
      endCopilotSession();
      setStatus('idle');
    } catch (e) {
      setError(String(e));
      setStatus('error');
    }
  }, [commitPendingAnswer, endCopilotSession, setError, setStatus]);

  /** Resolve the linked job + CV the same way as `start()`. Used by
   *  singleShot / generatePitch when no session is open yet. */
  const resolveLinkedContext = useCallback(() => {
    const state = useAppStore.getState();
    const active = state.copilotSessions.find(
      (s) => s.id === state.activeSessionId,
    );
    // If we already have an active session, reuse its linkage so we
    // don't override mid-stream.
    const jobId = active?.jobId ?? state.copilotPickerJobId ?? undefined;
    const cvId =
      active?.cvId ??
      state.copilotPickerCvId ??
      state.defaultCvId ??
      state.cvs[0]?.id;
    const job = jobId ? state.jobs.find((j) => j.id === jobId) : undefined;
    const cv = cvId ? state.cvs.find((c) => c.id === cvId) : undefined;
    return {
      jobId,
      cvId,
      company: job?.company,
      role: job?.role,
      jdText: job?.jdText,
      cvText: cv?.parsedText,
    };
  }, []);

  const singleShot = useCallback(
    async (mode: CopilotMode = 'qa') => {
      const cfg = readCopilotConfig();
      // BYOK gate removed (post-pivot, server-managed). See `start()`
      // for full rationale.
      setError(null);
      const ctx = resolveLinkedContext();
      // Single-shot: a 6-second capture that produces one Q&A. We
      // create a session if none is open so the bubble persists in
      // history, but we don't auto-close — the status transition
      // (thinking → ready) flushes the answer on its own; the user
      // ends the session explicitly.
      if (!useAppStore.getState().activeSessionId) {
        startCopilotSession({
          mode,
          jobId: ctx.jobId,
          cvId: ctx.cvId,
          company: ctx.company,
          role: ctx.role,
        });
      }
      try {
        await invoke('start_capture', {
          config: buildConfig(mode, {
            snap: cfg,
            cvText: ctx.cvText,
            jdText: ctx.jdText,
          }),
        });
      } catch (e) {
        setError(String(e));
        setStatus('error');
      }
    },
    [buildConfig, resolveLinkedContext, setError, setStatus, startCopilotSession],
  );

  const generatePitch = useCallback(
    async (instructions = '') => {
      const cfg = readCopilotConfig();
      // BYOK gate removed (post-pivot, server-managed). See `start()`
      // for full rationale.
      setError(null);
      const ctx = resolveLinkedContext();
      if (!useAppStore.getState().activeSessionId) {
        startCopilotSession({
          mode: 'pitch',
          jobId: ctx.jobId,
          cvId: ctx.cvId,
          company: ctx.company,
          role: ctx.role,
        });
      }
      try {
        await invoke('generate_pitch', {
          config: buildConfig('pitch', {
            snap: cfg,
            cvText: ctx.cvText,
            jdText: ctx.jdText,
          }),
          instructions,
        });
      } catch (e) {
        setError(String(e));
        setStatus('error');
      }
    },
    [buildConfig, resolveLinkedContext, setError, setStatus, startCopilotSession],
  );

  return { start, stop, singleShot, generatePitch };
}
