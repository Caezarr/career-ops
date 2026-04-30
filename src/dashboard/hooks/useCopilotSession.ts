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

// ─── Event bridge — listens to Tauri events, mutates the slice ─────
export function useCopilotEventBridge() {
  const setStatus = useAppStore((s) => s.setCopilotStatus);
  const setError = useAppStore((s) => s.setCopilotError);
  const setPendingTranscript = useAppStore((s) => s.setPendingTranscript);
  const appendPendingAnswerToken = useAppStore((s) => s.appendPendingAnswerToken);
  const clearPendingAnswer = useAppStore((s) => s.clearPendingAnswer);
  const commitPendingTranscript = useAppStore((s) => s.commitPendingTranscript);
  const commitPendingAnswer = useAppStore((s) => s.commitPendingAnswer);

  const prevStatusRef = useRef<CopilotStatus>('idle');
  const lastCommittedTranscriptIdRef = useRef<string | null>(null);

  useEffect(() => {
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

        // recording → thinking : recruiter finished speaking, commit
        // the in-flight transcript so the bubble lands.
        if (prev === 'recording' && next === 'thinking') {
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
          commitPendingAnswer({
            questionTranscriptId:
              lastCommittedTranscriptIdRef.current ?? undefined,
          });
        }

        // Errors should also flush partial output.
        if (prev === 'thinking' && next === 'error') {
          commitPendingAnswer({
            questionTranscriptId:
              lastCommittedTranscriptIdRef.current ?? undefined,
          });
        }

        prevStatusRef.current = next;
        setStatus(next);
      }),
    );

    track(
      listen<string>('transcript', (e) => {
        // Backend emits the full replacement text for the current
        // utterance — treat it as the live pending value.
        setPendingTranscript(e.payload);
        // A new question wipes the previous in-flight answer.
        clearPendingAnswer();
      }),
    );

    track(
      listen<string>('answer-token', (e) => {
        appendPendingAnswerToken(e.payload);
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
    };
  }, [
    setStatus,
    setError,
    setPendingTranscript,
    appendPendingAnswerToken,
    clearPendingAnswer,
    commitPendingTranscript,
    commitPendingAnswer,
  ]);
}

// ─── Controls — imperative actions exposed to UI components ────────
export function useCopilotControls() {
  const setStatus = useAppStore((s) => s.setCopilotStatus);
  const setError = useAppStore((s) => s.setCopilotError);
  const startCopilotSession = useAppStore((s) => s.startCopilotSession);
  const endCopilotSession = useAppStore((s) => s.endCopilotSession);
  const commitPendingAnswer = useAppStore((s) => s.commitPendingAnswer);

  const buildConfig = useCallback(
    (mode: CopilotMode, snap?: CopilotConfigSnapshot) => {
      const cfg = snap ?? readCopilotConfig();
      // Audio device labels on macOS go through cpal which keys on the
      // device's display name. We carry the legacy `audio_device`
      // string from `ic-config` (set by the overlay's Settings) — once
      // we wire Settings → Audio to also persist labels we can prefer
      // those here.
      return {
        anthropicKey: cfg.anthropicKey,
        openaiKey: cfg.openaiKey,
        cv: cfg.cv,
        jd: cfg.jd,
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
      company?: string;
      role?: string;
      jobId?: string;
    }) => {
      const cfg = readCopilotConfig();
      if (!cfg.anthropicKey) {
        setError('Configure your Anthropic API key first.');
        return false;
      }
      setError(null);
      // Hot-reload / crash safety: if a session is still flagged
      // active, close it before starting a new one.
      const existingActive = useAppStore.getState().activeSessionId;
      if (existingActive) endCopilotSession();
      startCopilotSession({
        mode: opts.mode,
        company: opts.company,
        role: opts.role,
        jobId: opts.jobId,
      });
      try {
        await invoke('start_session', { config: buildConfig(opts.mode, cfg) });
        setStatus('listening');
        return true;
      } catch (e) {
        setError(String(e));
        setStatus('error');
        return false;
      }
    },
    [buildConfig, endCopilotSession, setError, setStatus, startCopilotSession],
  );

  const stop = useCallback(async () => {
    try {
      await invoke('stop_session');
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

  const singleShot = useCallback(
    async (mode: CopilotMode = 'qa') => {
      const cfg = readCopilotConfig();
      if (!cfg.anthropicKey) {
        setError('Configure your Anthropic API key first.');
        return;
      }
      setError(null);
      // Single-shot: a 6-second capture that produces one Q&A. We
      // create a session if none is open so the bubble persists in
      // history, but we don't auto-close — the status transition
      // (thinking → ready) flushes the answer on its own; the user
      // ends the session explicitly.
      if (!useAppStore.getState().activeSessionId) {
        startCopilotSession({ mode });
      }
      try {
        await invoke('start_capture', { config: buildConfig(mode, cfg) });
      } catch (e) {
        setError(String(e));
        setStatus('error');
      }
    },
    [buildConfig, setError, setStatus, startCopilotSession],
  );

  const generatePitch = useCallback(
    async (instructions = '') => {
      const cfg = readCopilotConfig();
      if (!cfg.anthropicKey) {
        setError('Configure your Anthropic API key first.');
        return;
      }
      setError(null);
      if (!useAppStore.getState().activeSessionId) {
        startCopilotSession({ mode: 'pitch' });
      }
      try {
        await invoke('generate_pitch', {
          config: buildConfig('pitch', cfg),
          instructions,
        });
      } catch (e) {
        setError(String(e));
        setStatus('error');
      }
    },
    [buildConfig, setError, setStatus, startCopilotSession],
  );

  return { start, stop, singleShot, generatePitch };
}
