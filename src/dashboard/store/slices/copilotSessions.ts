import type { StateCreator } from 'zustand';

/** Live status reported by the Rust backend. Mirrors the Status union
 *  in src/copilot/CopilotApp.tsx so a future shared module can just
 *  re-export this type. */
export type CopilotStatus =
  | 'idle'
  | 'listening'
  | 'recording'
  | 'thinking'
  | 'ready'
  | 'error';

export type CopilotMode = 'qa' | 'pitch';

/** Speaker tag for transcript bubbles. */
export type CopilotSpeaker = 'recruiter' | 'you' | 'system';

/** A single utterance captured during a session. We persist everything
 *  the backend emits so users can review past interviews — that's the
 *  main reason this slice exists. */
export interface CopilotTranscriptItem {
  id: string;
  /** When the bubble landed (unix ms). */
  at: number;
  speaker: CopilotSpeaker;
  text: string;
  /** Optional human label for the speaker (e.g. recruiter name). */
  speakerLabel?: string;
}

/** A streamed answer + the score chips Claude returned. Kept on the
 *  session so the user can scroll back through past Q&A pairs. */
export interface CopilotAnswerEntry {
  id: string;
  /** Unix ms of the first token. */
  at: number;
  /** Final answer text after streaming completed. */
  text: string;
  /** Mode this answer was generated under. */
  mode: CopilotMode;
  /** Linked transcript bubble id (the question it answered). */
  questionTranscriptId?: string;
}

/** A full Copilot session — one interview, one Sprint, etc. */
export interface CopilotSession {
  id: string;
  startedAt: number;
  /** Set when the user clicks Stop or the session errors out. */
  endedAt: number | null;
  mode: CopilotMode;
  /** Display metadata — pulled from the linked job at start, and frozen
   *  on the session record so renaming a job later doesn't rewrite
   *  history. Both still optional to support sessions started without
   *  a job context. */
  company?: string;
  role?: string;
  /** ID of the linked Job (jobs slice). Lets the detail view jump back
   *  to the original posting. */
  jobId?: string;
  /** ID of the CV variant fed to Claude as context. */
  cvId?: string;
  transcript: CopilotTranscriptItem[];
  answers: CopilotAnswerEntry[];
}

/** State + actions for the Copilot session machinery. The hook
 *  `useCopilotSession()` is the only thing that should call the
 *  mutating actions — UI components subscribe read-only. */
export interface CopilotSessionsSlice {
  /** All sessions ever, most-recent-first. */
  copilotSessions: CopilotSession[];
  /** Id of the live session, if any. Null when idle. */
  activeSessionId: string | null;
  /** Latest backend status. */
  copilotStatus: CopilotStatus;
  /** Latest live transcript chunk that hasn't been committed to the
   *  session yet. The backend emits replacement strings (not deltas)
   *  while the user is still speaking, so we hold the in-flight text
   *  here and flush it to `transcript` on a finalisation signal
   *  (status transition or new question).
   *
   *  Internally split into two segments by `pendingTranscriptPartialStart`:
   *    - chars [0, partialStart)             → finalised turns (AAI
   *      committed them — `turn_is_formatted: true`). Frozen until
   *      commit/reset.
   *    - chars [partialStart, length)        → current in-flight
   *      partial (replaced on every new partial event).
   *
   *  The display layer reads `pendingTranscript` as one string; only
   *  the reducer cares about the split. */
  pendingTranscript: string;
  /** Index in `pendingTranscript` where the current partial begins.
   *  Everything before this index is finalised (frozen). */
  pendingTranscriptPartialStart: number;
  /** Latest streaming answer text, accumulated from `answer-token`
   *  events. Cleared when a new question arrives. */
  pendingAnswer: string;
  /** Phase 4b: the most recent **partial** user-voice transcript chunk
   *  (the candidate's mic, transcribed by the second AAI stream).
   *  Replaced on every partial event. Cleared on session end. Drives
   *  the teleprompter cursor's banded-Levenshtein matcher together
   *  with `userTranscriptFinal`. */
  userTranscriptPartial: string;
  /** Phase 4b: the cumulative **finalised** user-voice transcript —
   *  one continuous string built by appending every finalised turn
   *  the second AAI stream emits. Cleared on session end. The
   *  matcher reads `userTranscriptFinal + ' ' + userTranscriptPartial`
   *  to anchor the cursor against everything the candidate has said
   *  so far. */
  userTranscriptFinal: string;
  /** Phase 4b: monotonic counter — bumped on every user-transcript
   *  event so React effects can run the matcher even when the text
   *  payload didn't change (e.g. AAI emits the same partial twice).
   *  Without this the effect dependency array would dedupe the
   *  cursor advance and the candidate would feel a stutter. */
  userTranscriptTick: number;
  /** Last error message surfaced by the backend, if any. */
  copilotError: string | null;

  // ── Actions ────────────────────────────────────────────────────
  /** Begin a new session and return its id. */
  startCopilotSession: (input: {
    mode: CopilotMode;
    company?: string;
    role?: string;
    jobId?: string;
    cvId?: string;
  }) => string;
  /** End the active session (sets endedAt and clears activeSessionId). */
  endCopilotSession: () => void;
  /** Apply a transcript event from the backend.
   *
   *  - `final: false` (partial): replaces only the trailing partial
   *    portion of `pendingTranscript`. The accumulated finalised
   *    prefix stays untouched.
   *  - `final: true`  (formatted turn): appends to the finalised
   *    prefix, clears the partial portion. Advances `partialStart`.
   *
   *  Pre-fix this was `setPendingTranscript(text)` which blew away
   *  the whole buffer on every event — fine for single-turn questions,
   *  catastrophic for multi-pause ones (the user would see the
   *  transcript "delete" itself between turns of a long question). */
  applyTranscriptDelta: (delta: { text: string; final: boolean }) => void;
  /** Phase 4b: ingest a user-voice transcript event from the second
   *  AAI stream. Partials replace `userTranscriptPartial`; finals
   *  append to `userTranscriptFinal` (with a leading space if the
   *  cumulative buffer is non-empty) and clear `userTranscriptPartial`.
   *  Always bumps `userTranscriptTick` so the matcher effect re-runs. */
  applyUserTranscriptDelta: (delta: { text: string; final: boolean }) => void;
  /** Phase 4b: wipe both the partial and finalised user-voice
   *  transcripts. Called on session start AND end so the matcher
   *  starts each interview from a clean slate. */
  resetUserTranscript: () => void;
  /** Append a streamed answer token to the in-flight answer. */
  appendPendingAnswerToken: (token: string) => void;
  /** Reset the in-flight answer (e.g. when a new question begins). */
  clearPendingAnswer: () => void;
  /** Commit the pending transcript as a recruiter bubble on the
   *  active session. No-op if no active session. */
  commitPendingTranscript: (opts?: { speakerLabel?: string }) => void;
  /** Commit the pending answer as an entry on the active session. */
  commitPendingAnswer: (opts?: { questionTranscriptId?: string }) => void;
  /** Push a system-emitted bubble (e.g. errors, "Pitch generated"). */
  pushCopilotSystemBubble: (text: string) => void;
  /** Update the latest backend status. */
  setCopilotStatus: (status: CopilotStatus) => void;
  /** Set or clear the latest backend error. */
  setCopilotError: (err: string | null) => void;
  /** Wipe a session by id (e.g. "discard this run"). */
  deleteCopilotSession: (id: string) => void;
  /** Clear all session history (useful from danger zone). */
  clearCopilotSessions: () => void;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const createCopilotSessionsSlice: StateCreator<CopilotSessionsSlice> = (
  set,
  get,
) => ({
  copilotSessions: [],
  activeSessionId: null,
  copilotStatus: 'idle',
  pendingTranscript: '',
  pendingTranscriptPartialStart: 0,
  pendingAnswer: '',
  userTranscriptPartial: '',
  userTranscriptFinal: '',
  userTranscriptTick: 0,
  copilotError: null,

  startCopilotSession: ({ mode, company, role, jobId, cvId }) => {
    const id = newId('cs');
    const session: CopilotSession = {
      id,
      startedAt: Date.now(),
      endedAt: null,
      mode,
      company,
      role,
      jobId,
      cvId,
      transcript: [],
      answers: [],
    };
    set((s) => ({
      copilotSessions: [session, ...s.copilotSessions],
      activeSessionId: id,
      pendingTranscript: '',
      pendingTranscriptPartialStart: 0,
      pendingAnswer: '',
      // Phase 4b: fresh session = fresh user-voice ASR buffer.
      userTranscriptPartial: '',
      userTranscriptFinal: '',
      userTranscriptTick: 0,
      copilotError: null,
    }));
    return id;
  },

  endCopilotSession: () => {
    const id = get().activeSessionId;
    if (!id) return;
    set((s) => ({
      copilotSessions: s.copilotSessions.map((sess) =>
        sess.id === id ? { ...sess, endedAt: Date.now() } : sess,
      ),
      activeSessionId: null,
      pendingTranscript: '',
      pendingTranscriptPartialStart: 0,
      pendingAnswer: '',
      // Phase 4b: clear ASR buffers so a stale partial doesn't bleed
      // into the next session's matcher.
      userTranscriptPartial: '',
      userTranscriptFinal: '',
      userTranscriptTick: 0,
    }));
  },

  applyTranscriptDelta: ({ text, final }) => {
    // Trim trailing whitespace but keep internal spacing — the
    // accumulated transcript is what the user will read, not a
    // wire-format stream.
    const trimmed = text.trim();
    if (!trimmed) return;
    set((s) => {
      const finalized = s.pendingTranscript.slice(0, s.pendingTranscriptPartialStart);
      // Join finalised + new chunk with a space, but only if the
      // finalised section is non-empty (avoid a leading space).
      const joiner = finalized.length > 0 ? ' ' : '';
      const newDisplay = finalized + joiner + trimmed;
      if (final) {
        // Promote the whole new display into the finalised prefix.
        return {
          pendingTranscript: newDisplay,
          pendingTranscriptPartialStart: newDisplay.length,
        };
      }
      // Partial: leave the finalised prefix where it was; the
      // trailing portion is just a draft.
      return { pendingTranscript: newDisplay };
    });
  },
  applyUserTranscriptDelta: ({ text, final }) => {
    // Phase 4b: ingest the second AAI stream's events. Same partial /
    // final split as the recruiter side, but written to a dedicated
    // pair of buffers + bumps a tick counter so React effects can
    // run the cursor matcher even when the text payload is identical
    // to the previous frame (AAI re-emits stable partials regularly).
    const trimmed = text.trim();
    set((s) => {
      const tick = s.userTranscriptTick + 1;
      if (!trimmed) {
        // Empty payload — only bump the tick so a clearing event
        // still notifies subscribers (e.g. AAI sometimes sends empty
        // transcripts on connection state changes).
        return { userTranscriptTick: tick };
      }
      if (final) {
        const joiner = s.userTranscriptFinal.length > 0 ? ' ' : '';
        return {
          userTranscriptFinal: s.userTranscriptFinal + joiner + trimmed,
          userTranscriptPartial: '',
          userTranscriptTick: tick,
        };
      }
      return { userTranscriptPartial: trimmed, userTranscriptTick: tick };
    });
  },
  resetUserTranscript: () =>
    set({
      userTranscriptPartial: '',
      userTranscriptFinal: '',
      userTranscriptTick: 0,
    }),
  appendPendingAnswerToken: (token) =>
    set((s) => ({ pendingAnswer: s.pendingAnswer + token })),
  clearPendingAnswer: () => set({ pendingAnswer: '' }),

  commitPendingTranscript: ({ speakerLabel } = {}) => {
    const { activeSessionId, pendingTranscript } = get();
    const text = pendingTranscript.trim();
    if (!activeSessionId || !text) return;
    const item: CopilotTranscriptItem = {
      id: newId('tr'),
      at: Date.now(),
      speaker: 'recruiter',
      text,
      speakerLabel,
    };
    set((s) => ({
      copilotSessions: s.copilotSessions.map((sess) =>
        sess.id === activeSessionId
          ? { ...sess, transcript: [...sess.transcript, item] }
          : sess,
      ),
      pendingTranscript: '',
      pendingTranscriptPartialStart: 0,
    }));
  },

  commitPendingAnswer: ({ questionTranscriptId } = {}) => {
    const { activeSessionId, pendingAnswer } = get();
    const text = pendingAnswer.trim();
    if (!activeSessionId || !text) return;
    // Find the active session to learn its mode.
    const sess = get().copilotSessions.find((s) => s.id === activeSessionId);
    if (!sess) return;
    const entry: CopilotAnswerEntry = {
      id: newId('an'),
      at: Date.now(),
      text,
      mode: sess.mode,
      questionTranscriptId,
    };
    set((s) => ({
      copilotSessions: s.copilotSessions.map((x) =>
        x.id === activeSessionId
          ? { ...x, answers: [...x.answers, entry] }
          : x,
      ),
      pendingAnswer: '',
    }));
  },

  pushCopilotSystemBubble: (text) => {
    const id = get().activeSessionId;
    if (!id) return;
    const item: CopilotTranscriptItem = {
      id: newId('sys'),
      at: Date.now(),
      speaker: 'system',
      text,
    };
    set((s) => ({
      copilotSessions: s.copilotSessions.map((sess) =>
        sess.id === id ? { ...sess, transcript: [...sess.transcript, item] } : sess,
      ),
    }));
  },

  setCopilotStatus: (copilotStatus) => set({ copilotStatus }),
  setCopilotError: (copilotError) => set({ copilotError }),

  deleteCopilotSession: (id) =>
    set((s) => ({
      copilotSessions: s.copilotSessions.filter((sess) => sess.id !== id),
      activeSessionId: s.activeSessionId === id ? null : s.activeSessionId,
    })),
  clearCopilotSessions: () =>
    set({ copilotSessions: [], activeSessionId: null }),
});
