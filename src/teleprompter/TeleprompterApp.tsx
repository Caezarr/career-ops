import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import {
  register as registerGlobalShortcut,
  unregister as unregisterGlobalShortcut,
} from '@tauri-apps/plugin-global-shortcut';
import {
  matchSpokenToScript,
  tokeniseSpoken,
} from '../dashboard/lib/teleprompterMatch';
import '../dashboard/styles/copilot-teleprompter.css';

/**
 * Career OS teleprompter — dedicated Tauri window root.
 *
 * Loaded via `index.html#teleprompter` (see `src/main.tsx` router).
 * The matching Tauri window is declared in `tauri.conf.json` with:
 *   - transparent: true
 *   - decorations: false
 *   - alwaysOnTop: true
 *   - skipTaskbar: true
 *   - contentProtected: true (Phase 1 stealth)
 *   - focus: false (never steals focus from Zoom)
 *   - visible: false (the dashboard shows it on session start)
 *
 * The dashboard side is the source of truth for `pendingAnswer` /
 * `lastAnswer` / status. It pushes a `TeleprompterState` snapshot
 * via `invoke('push_teleprompter_state', …)` whenever those change;
 * this window subscribes to the resulting `teleprompter-state`
 * Tauri event and rebuilds its local UI from the snapshot.
 *
 * Everything below mirrors the in-dashboard `CopilotTeleprompter`
 * component (pace-aware advance, punctuation holds, Option-modifier
 * hotkeys, status badge). Kept as a separate file rather than a
 * shared component because the data plumbing is fundamentally
 * different — in-dashboard reads Zustand, this reads Tauri events.
 * The visual layer is identical so the two render the same way
 * once they have a `{ text, isStreaming, sessionActive }` triple
 * to work with.
 */

const WPM_MIN = 80;
const WPM_MAX = 260;
// Bumped 150 → 180 — see the matching constant + comment in
// `CopilotTeleprompter.tsx`. The two windows must stay aligned
// or the candidate gets two different paces depending on which
// renderer is on screen.
const WPM_DEFAULT = 180;
const WPM_STEP = 10;
const STREAM_BUFFER_WORDS = 2;
const POST_FINAL_HOLD_MS = 800;
const STATUS_FADE_MS = 1800;

/** Phase 4b: how long the cursor must go without a user-transcript-
 *  driven advance before the legacy WPM timer takes over. Mirror of
 *  the constant in `CopilotTeleprompter.tsx` — the two windows behave
 *  identically by design. */
const ASR_SILENCE_FALLBACK_MS = 2_000;

const PUNCTUATION_HOLDS_MS = {
  comma: 140,
  semicolon: 220,
  period: 280,
  newline: 420,
  none: 0,
} as const;

interface Token {
  kind: 'word' | 'space';
  value: string;
  trailingHoldMs?: number;
}

function tokenize(text: string): Token[] {
  if (!text) return [];
  const out: Token[] = [];
  const re = /(\s+)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) {
      out.push({ kind: 'word', value: text.slice(last, m.index!) });
    }
    out.push({ kind: 'space', value: m[0] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) {
    out.push({ kind: 'word', value: text.slice(last) });
  }
  for (let i = 0; i < out.length; i += 1) {
    const t = out[i];
    if (t.kind !== 'word') continue;
    let hold: number = PUNCTUATION_HOLDS_MS.none;
    const lastChar = t.value.slice(-1);
    if (lastChar === ',') hold = PUNCTUATION_HOLDS_MS.comma;
    else if (lastChar === ';' || lastChar === ':') hold = PUNCTUATION_HOLDS_MS.semicolon;
    else if (lastChar === '.' || lastChar === '!' || lastChar === '?') hold = PUNCTUATION_HOLDS_MS.period;
    const next = out[i + 1];
    if (next?.kind === 'space' && next.value.includes('\n')) {
      hold = Math.max(hold, PUNCTUATION_HOLDS_MS.newline);
    }
    t.trailingHoldMs = hold;
  }
  return out;
}

interface TeleprompterPayload {
  text: string;
  isStreaming: boolean;
  sessionActive: boolean;
  /** Phase 4b: cumulative user-voice transcript (final + partial,
   *  pre-joined on the dashboard side). Empty string when Phase 4b
   *  isn't active for this session — the standalone window then
   *  falls back to Phase 4a timer-only advance. */
  userPartial: string;
}

export default function TeleprompterApp() {
  // Local mirror of the dashboard's relevant state, hydrated via
  // Tauri events from `push_teleprompter_state`. Initial values
  // are the "empty session" state — the dashboard pushes the real
  // values as soon as a session starts.
  const [payload, setPayload] = useState<TeleprompterPayload>({
    text: '',
    isStreaming: false,
    sessionActive: false,
    userPartial: '',
  });

  useEffect(() => {
    let unlisten: undefined | (() => void);
    listen<TeleprompterPayload>('teleprompter-state', (e) => {
      // Defensive defaults — if the dashboard ever ships a partial
      // payload during a refactor, the teleprompter still renders
      // something sane instead of crashing.
      setPayload({
        text: typeof e.payload.text === 'string' ? e.payload.text : '',
        isStreaming: !!e.payload.isStreaming,
        sessionActive: !!e.payload.sessionActive,
        userPartial:
          typeof e.payload.userPartial === 'string' ? e.payload.userPartial : '',
      });
    })
      .then((u) => {
        unlisten = u;
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[teleprompter] listen failed:', err);
      });
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const { text, isStreaming, sessionActive, userPartial } = payload;

  // Tokenize the answer + compute the word-only subsequence for
  // the cursor. Same logic as the in-dashboard component.
  const tokens = useMemo(() => tokenize(text), [text]);
  const wordTokens = useMemo(
    () => tokens.filter((t) => t.kind === 'word'),
    [tokens],
  );
  const totalWords = wordTokens.length;

  // Phase 4b: pre-normalised script tokens for the matcher.
  const scriptTokens = useMemo(() => tokeniseSpoken(text), [text]);

  const [cursor, setCursor] = useState(0);
  const [wpm, setWpm] = useState(WPM_DEFAULT);
  const [paused, setPaused] = useState(false);
  const [statusVisible, setStatusVisible] = useState(false);

  // Reset cursor when the answer text restarts from scratch
  // (new question, new pitch, etc).
  const lastTextLenRef = useRef(text.length);
  useEffect(() => {
    if (text.length < lastTextLenRef.current) {
      setCursor(0);
    }
    lastTextLenRef.current = text.length;
  }, [text]);

  const advanceCeiling = isStreaming
    ? Math.max(0, totalWords - STREAM_BUFFER_WORDS)
    : totalWords;

  const finishedAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isStreaming && text.length > 0) {
      finishedAtRef.current = Date.now();
    } else {
      finishedAtRef.current = null;
    }
  }, [isStreaming, text.length]);

  // Phase 4b: track when the matcher last advanced the cursor so
  // the timer below can yield while the user is actively speaking.
  const lastAsrAdvanceAtRef = useRef<number>(0);

  // Phase 4b: matcher — drives the cursor from the candidate's
  // voice via banded Levenshtein. Same algorithm as
  // `CopilotTeleprompter.tsx`; the only delta is the input source
  // (Tauri event payload here vs Zustand selector in-dashboard).
  useEffect(() => {
    if (totalWords === 0) return;
    if (scriptTokens.length === 0) return;
    if (!userPartial) return;
    const spoken = tokeniseSpoken(userPartial);
    if (spoken.length === 0) return;
    setCursor((prev) => {
      const candidate = matchSpokenToScript(spoken, scriptTokens, prev);
      if (candidate === null) return prev;
      const next = Math.min(candidate, advanceCeiling);
      if (next > prev) {
        lastAsrAdvanceAtRef.current = Date.now();
        return next;
      }
      return prev;
    });
  }, [userPartial, scriptTokens, totalWords, advanceCeiling]);

  // Phase 4a timer — now a fallback. See the matching effect in
  // `CopilotTeleprompter.tsx` for the full rationale; this is a
  // verbatim port for the standalone window.
  useEffect(() => {
    if (totalWords === 0 || paused) return undefined;
    let cancelled = false;
    let timer: number | undefined;
    const baseMs = Math.round((60 * 1000) / Math.max(1, wpm));
    const tick = () => {
      if (cancelled) return;
      setCursor((prev) => {
        if (prev >= advanceCeiling) {
          timer = window.setTimeout(tick, 120);
          return prev;
        }
        const fa = finishedAtRef.current;
        if (fa !== null && Date.now() - fa < POST_FINAL_HOLD_MS) {
          timer = window.setTimeout(tick, POST_FINAL_HOLD_MS);
          return prev;
        }
        // Phase 4b: yield to ASR if it advanced the cursor recently.
        const sinceAsr = Date.now() - lastAsrAdvanceAtRef.current;
        if (
          lastAsrAdvanceAtRef.current > 0 &&
          sinceAsr < ASR_SILENCE_FALLBACK_MS
        ) {
          timer = window.setTimeout(tick, baseMs);
          return prev;
        }
        const tok = wordTokens[prev];
        const hold = tok?.trailingHoldMs ?? 0;
        timer = window.setTimeout(tick, baseMs + hold);
        return prev + 1;
      });
    };
    timer = window.setTimeout(tick, baseMs);
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [totalWords, advanceCeiling, wpm, paused, wordTokens]);

  // Status badge fade.
  useEffect(() => {
    setStatusVisible(true);
    const id = window.setTimeout(() => setStatusVisible(false), STATUS_FADE_MS);
    return () => window.clearTimeout(id);
  }, [wpm, paused]);

  const bumpWpm = useCallback((delta: number) => {
    setWpm((prev) => {
      const next = prev + delta;
      if (next < WPM_MIN) return WPM_MIN;
      if (next > WPM_MAX) return WPM_MAX;
      return next;
    });
  }, []);

  // Local-window hotkeys (only fire if the teleprompter window has
  // focus, which is rarely the case in a real interview — the user
  // is in Zoom). The global shortcuts below are the production
  // path; this is a focus-mode fallback.
  useEffect(() => {
    if (!sessionActive) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      switch (e.key) {
        case ' ':
        case 'Space':
          e.preventDefault();
          setPaused((p) => !p);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setCursor((c) => Math.max(0, c - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setCursor((c) => Math.min(advanceCeiling, c + 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          bumpWpm(WPM_STEP);
          break;
        case 'ArrowDown':
          e.preventDefault();
          bumpWpm(-WPM_STEP);
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          setCursor(0);
          break;
        default:
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sessionActive, advanceCeiling, bumpWpm]);

  // Global shortcuts (Tauri plugin) — fire even when this window
  // doesn't have focus (= when the user is in Zoom). The dashboard
  // also registers the same set; whichever window registers FIRST
  // owns them. We register here too so that even if the dashboard
  // isn't running for some reason, the teleprompter still responds.
  // Duplicate registration is rejected with an error, which the
  // catch swallows.
  const ceilingRef = useRef(advanceCeiling);
  ceilingRef.current = advanceCeiling;
  useEffect(() => {
    if (!sessionActive) return undefined;
    const bindings: Array<[string, () => void]> = [
      ['Alt+Space', () => setPaused((p) => !p)],
      ['Alt+Left', () => setCursor((c) => Math.max(0, c - 1))],
      ['Alt+Right', () =>
        setCursor((c) => Math.min(ceilingRef.current, c + 1))],
      ['Alt+Up', () => bumpWpm(WPM_STEP)],
      ['Alt+Down', () => bumpWpm(-WPM_STEP)],
      ['Alt+KeyR', () => setCursor(0)],
    ];
    const accelerators = bindings.map(([acc]) => acc);
    bindings.forEach(([acc, handler]) => {
      registerGlobalShortcut(acc, handler).catch(() => {
        /* already registered by another window — fine */
      });
    });
    return () => {
      accelerators.forEach((acc) => {
        unregisterGlobalShortcut(acc).catch(() => {
          /* best-effort */
        });
      });
    };
  }, [sessionActive, bumpWpm]);

  // Lazy auto-scroll — see the equivalent comment in
  // `CopilotTeleprompter.tsx` for the full rationale. Short version:
  // re-centring on every word advance makes the page shimmy at the
  // candidate's reading speed, which destroys the teleprompter UX.
  // Only scroll when the cursor crosses 75% of the visible height OR
  // somehow ended up off-screen above (e.g. after a manual ⌥ ← chain).
  const bodyRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const target = el.querySelector<HTMLElement>(
      `[data-word-index="${cursor}"]`,
    );
    if (!target) return;
    const containerRect = el.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const relativeY =
      (targetRect.top - containerRect.top) / containerRect.height;
    if (relativeY > 0.75 || relativeY < 0) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [cursor]);

  // Defensive: if the dashboard is asking us to hide, do so by
  // rendering nothing. (The actual window-visibility flip happens
  // via `set_teleprompter_visible` from the Rust side; this is a
  // belt-and-braces guard in case the event arrives before the
  // window hide does.)
  if (!sessionActive || !text.trim()) return null;

  // Acknowledge `invoke` is technically unused for now — kept on
  // the import in case a future hotkey wants to fire a backend
  // command (e.g. ⌥ Q to stop the session from the prompter).
  void invoke;

  const remaining = Math.max(0, totalWords - cursor);
  let wordSeq = 0;
  return (
    <div className="cp-teleprompter" role="region" aria-label="Copilot teleprompter">
      <div className="cp-teleprompter__capsule">
        <div ref={bodyRef} className="cp-teleprompter__body">
          <p className="cp-teleprompter__text">
            {tokens.map((t, i) => {
              if (t.kind === 'space') {
                return <span key={i}>{t.value}</span>;
              }
              const idx = wordSeq;
              wordSeq += 1;
              let cls = 'cp-teleprompter__word';
              if (idx < cursor) cls += ' cp-teleprompter__word--past';
              else if (idx === cursor) cls += ' cp-teleprompter__word--current';
              else cls += ' cp-teleprompter__word--future';
              return (
                <span key={i} className={cls} data-word-index={idx}>
                  {t.value}
                </span>
              );
            })}
            {isStreaming && (
              <span className="cp-teleprompter__cursor" aria-hidden="true" />
            )}
          </p>
        </div>
      </div>
      <div
        className={`cp-teleprompter__status${statusVisible ? ' cp-teleprompter__status--visible' : ''}`}
        aria-hidden="true"
      >
        <span className="cp-teleprompter__status-pill">
          {paused ? 'Paused · ⌥ Space to resume' : `${wpm} wpm · ⌥ ↑↓`}
        </span>
        <span className="cp-teleprompter__status-pill cp-teleprompter__status-pill--subtle">
          {remaining} words left
        </span>
      </div>
    </div>
  );
}
