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
  /** Optional metadata to make sessions browseable. We pull these
   *  from whatever the user had in focus when they hit Start; they
   *  can still be edited / annotated after the session. */
  company?: string;
  role?: string;
  jobId?: string;
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
   *  (status transition or new question). */
  pendingTranscript: string;
  /** Latest streaming answer text, accumulated from `answer-token`
   *  events. Cleared when a new question arrives. */
  pendingAnswer: string;
  /** Last error message surfaced by the backend, if any. */
  copilotError: string | null;

  // ── Actions ────────────────────────────────────────────────────
  /** Begin a new session and return its id. */
  startCopilotSession: (input: {
    mode: CopilotMode;
    company?: string;
    role?: string;
    jobId?: string;
  }) => string;
  /** End the active session (sets endedAt and clears activeSessionId). */
  endCopilotSession: () => void;
  /** Update the in-flight transcript chunk (replacement, not append). */
  setPendingTranscript: (text: string) => void;
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
  pendingAnswer: '',
  copilotError: null,

  startCopilotSession: ({ mode, company, role, jobId }) => {
    const id = newId('cs');
    const session: CopilotSession = {
      id,
      startedAt: Date.now(),
      endedAt: null,
      mode,
      company,
      role,
      jobId,
      transcript: [],
      answers: [],
    };
    set((s) => ({
      copilotSessions: [session, ...s.copilotSessions],
      activeSessionId: id,
      pendingTranscript: '',
      pendingAnswer: '',
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
      pendingAnswer: '',
    }));
  },

  setPendingTranscript: (text) => set({ pendingTranscript: text }),
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
