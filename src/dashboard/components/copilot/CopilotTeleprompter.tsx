import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  register as registerGlobalShortcut,
  unregister as unregisterGlobalShortcut,
} from '@tauri-apps/plugin-global-shortcut';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../../store';
import {
  matchSpokenToScript,
  tokeniseSpoken,
} from '../../lib/teleprompterMatch';

/**
 * Parse the scaffold-format Claude answer into structured pieces.
 *
 * The Rust LLM prompt (D3) demands Claude return EXACTLY this layout:
 *
 *     **TL;DR:** <one sentence>
 *
 *     - <bullet 1>
 *     - <bullet 2>
 *     - <bullet 3> ...
 *
 *     **Closing line:** <one sentence>
 *
 * We parse permissively so the renderer can stream — at token #5 of
 * the response, only `**TL;DR:**` exists; at token #50, the first two
 * bullets are partial; at #200 the full structure is settled. Every
 * field defaults to null/empty so the renderer never crashes on a
 * half-built response.
 *
 * Heuristics:
 *   - TL;DR line ends at the first newline after the label OR at the
 *     start of the first bullet (`\n-`), whichever comes first.
 *   - Bullets are lines starting with `-` or `*` (after optional
 *     indent). Trailing `-` characters in mid-prose are NOT bullets;
 *     we require start-of-line.
 *   - Closing line ends at end-of-string (final field).
 *   - Bold markers (`**`) are stripped from the values — we apply our
 *     own typography in the renderer.
 */
type Scaffold = {
  tldr: string | null;
  bullets: string[];
  closing: string | null;
  /** True if the response started with the scaffold header. Used to
   *  decide whether to use the structured renderer vs legacy prose. */
  isScaffold: boolean;
};

function parseScaffold(text: string): Scaffold {
  if (!text) {
    return { tldr: null, bullets: [], closing: null, isScaffold: false };
  }
  const tldrMatch = text.match(/\*\*TL;DR:\*\*\s*([^\n]*)/i);
  const closingMatch = text.match(/\*\*Closing line:\*\*\s*([\s\S]*?)$/i);
  const bulletMatches = Array.from(
    text.matchAll(/^[\s]*[-*][\s]+(.+?)(?=\n[\s]*[-*]|\n\s*\n|\n\*\*|$)/gms),
  );
  const isScaffold = /\*\*TL;DR:\*\*/i.test(text);
  return {
    tldr: tldrMatch?.[1]?.trim().replace(/\*\*/g, '') || null,
    bullets: bulletMatches
      .map((m) => m[1].trim().replace(/\*\*/g, '').replace(/\n+/g, ' '))
      .filter((b) => b.length > 0),
    closing:
      closingMatch?.[1]?.trim().replace(/\*\*/g, '').replace(/\n+/g, ' ') ||
      null,
    isScaffold,
  };
}

/**
 * CopilotTeleprompter — Moody-style notch teleprompter (Phase 3) +
 * pace-aware word highlight (Phase 4a) + hotkeys (Phase 4a polish).
 *
 * Reads the current Copilot answer from the store and renders it at
 * the top of the viewport, near the MacBook notch. Words light up
 * one at a time at a configurable WPM; the pace adapts to punctuation
 * (commas slow it down, periods + line breaks add a breath) so the
 * highlight feels like a thoughtful reader rather than a metronome.
 *
 * Phase 4b will replace the timer source with on-device ASR
 * (Moonshine + banded Levenshtein) so the cursor truly tracks the
 * candidate's voice. The token + cursor model used here is already
 * the right shape for that swap.
 *
 * # Hotkeys
 *
 * The candidate is in Zoom/Teams during a live session and CAN'T use
 * bare modifier-free shortcuts — `Space` would mute their mic, `←/→`
 * would seek the call's recording. We bind everything under `⌥`
 * (Option) which neither Zoom nor Teams use for their main actions.
 * The Career OS dashboard window has to be focused (CMD-Tab back if
 * the user is in the video call), but a stealthy quick flip is part
 * of the workflow already.
 *
 *   ⌥ Space   — pause / resume auto-advance
 *   ⌥ ←       — step cursor back one word
 *   ⌥ →       — step cursor forward one word
 *   ⌥ ↑       — speed up (+10 WPM, clamped 80-260)
 *   ⌥ ↓       — slow down (−10 WPM)
 *   ⌥ R       — restart cursor at first word
 *
 * # Tunables
 *
 *   WPM_DEFAULT — 150 wpm reads as relaxed-conversational. The
 *     candidate's own pace lives between 120 (consulting case
 *     interview, paced reasoning) and 180 (tech / IB, punchier).
 *   PUNCTUATION_HOLDS_MS — extra delay on top of the base interval
 *     when the cursor crosses one of these tokens. Mirrors the way
 *     a human reader breathes through commas / periods / line
 *     breaks. Tuned by feel — too long and the cursor stalls,
 *     too short and the answer reads as monotone.
 *   STREAM_BUFFER_WORDS — never let the cursor catch up to the
 *     trailing edge of the LLM stream; leave a buffer so the
 *     candidate isn't speaking the literal token that just arrived.
 *   POST_FINAL_HOLD_MS — once the LLM finishes streaming, hold the
 *     cursor at its current position for this long before resuming.
 */
const WPM_MIN = 80;
const WPM_MAX = 260;
// Bumped from 150 → 180 after the user-reported lag ("I finish
// phrases before the prompter can continue"). 180 wpm is closer to
// the actual speaking pace of MBB / IB candidates under interview
// pressure (literature says 160-200 wpm for fluent English /
// French monologue, faster than the relaxed-conversational 130-150
// the original default targeted). The Phase 4b ASR matcher still
// overrides this when it has a confident word match — the WPM
// timer is now the silence fallback only.
const WPM_DEFAULT = 180;
const WPM_STEP = 10;
const STREAM_BUFFER_WORDS = 2;
const POST_FINAL_HOLD_MS = 800;
const STATUS_FADE_MS = 1800;

/** Phase 4b: how long the cursor must go without a user-transcript-
 *  driven advance before the legacy WPM timer takes over. 2s mirrors
 *  the natural inter-sentence silence a thoughtful speaker leaves —
 *  shorter and the timer fights the matcher on every breath, longer
 *  and the cursor visibly stalls when the candidate goes off-script. */
const ASR_SILENCE_FALLBACK_MS = 2_000;

/** Per-token "hold" added on top of the base WPM interval when the
 *  cursor crosses certain punctuation. The amounts are tuned to feel
 *  like natural breath points — a comma is a quick beat, a period
 *  ends a thought, a newline opens a fresh idea. */
const PUNCTUATION_HOLDS_MS = {
  comma: 140,
  semicolon: 220,
  period: 280,
  newline: 420,
  /** Any other character — no extra hold. */
  none: 0,
} as const;

interface Token {
  kind: 'word' | 'space';
  value: string;
  /** Only set on word tokens. The extra millisecond hold to apply
   *  AFTER this word is "passed" by the cursor, derived from the
   *  punctuation/whitespace that follows it. */
  trailingHoldMs?: number;
}

/** Split text into word / space tokens. We also pre-compute each
 *  word's `trailingHoldMs` from the punctuation that follows it
 *  (immediate ., ,, ;, or any \n inside the following whitespace).
 *  This keeps the advance loop O(1) per tick. */
function tokenize(text: string): Token[] {
  if (!text) return [];
  const out: Token[] = [];
  const re = /(\s+)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) {
      const word = text.slice(last, m.index!);
      out.push({ kind: 'word', value: word });
    }
    out.push({ kind: 'space', value: m[0] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) {
    out.push({ kind: 'word', value: text.slice(last) });
  }
  // Compute trailingHoldMs for each word based on its terminal
  // character + the whitespace that follows it.
  for (let i = 0; i < out.length; i += 1) {
    const t = out[i];
    if (t.kind !== 'word') continue;
    let hold: number = PUNCTUATION_HOLDS_MS.none;
    const last = t.value.slice(-1);
    if (last === ',') hold = PUNCTUATION_HOLDS_MS.comma;
    else if (last === ';' || last === ':') hold = PUNCTUATION_HOLDS_MS.semicolon;
    else if (last === '.' || last === '!' || last === '?') hold = PUNCTUATION_HOLDS_MS.period;
    // A newline in the next whitespace token gets the biggest hold.
    const next = out[i + 1];
    if (next?.kind === 'space' && next.value.includes('\n')) {
      hold = Math.max(hold, PUNCTUATION_HOLDS_MS.newline);
    }
    t.trailingHoldMs = hold;
  }
  return out;
}

export default function CopilotTeleprompter() {
  const sessions = useAppStore((s) => s.copilotSessions);
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const pendingAnswer = useAppStore((s) => s.pendingAnswer);
  const status = useAppStore((s) => s.copilotStatus);
  // Phase 4b: candidate's voice ASR — drives the cursor matcher.
  const userTranscriptPartial = useAppStore((s) => s.userTranscriptPartial);
  const userTranscriptFinal = useAppStore((s) => s.userTranscriptFinal);
  const userTranscriptTick = useAppStore((s) => s.userTranscriptTick);

  const session =
    sessions.find((s) => s.id === activeSessionId) ?? sessions[0] ?? null;
  const lastAnswer = session?.answers[session.answers.length - 1] ?? null;
  const text = pendingAnswer || lastAnswer?.text || '';
  const isStreaming = status === 'thinking' && pendingAnswer.length > 0;

  const tokens = useMemo(() => tokenize(text), [text]);
  // Kept for the legacy timer-driven pace advance (`useEffect` below)
  // which still walks the prose tokens for per-word punctuation holds.
  // In scaffold mode the matcher drives the cursor; this fallback only
  // kicks in if the matcher hasn't moved the cursor for > 2 s.
  const wordTokens = useMemo(
    () => tokens.filter((t) => t.kind === 'word'),
    [tokens],
  );

  // D1 (2026-05-17): structured scaffold view. When Claude returns the
  // scaffold format (TL;DR + bullets + Closing line — enforced by the
  // D3 system-prompt rule in llm.rs), we render that structured shape
  // instead of word-by-word prose. Empty answer + non-scaffold legacy
  // answers fall back to the word-by-word renderer below. Memoised so
  // the parse only re-runs when `text` actually changes.
  const scaffold = useMemo(() => parseScaffold(text), [text]);

  // 2026-05-17: SOURCE OF TRUTH for the cursor.
  //
  // In scaffold mode the rendered words are the TL;DR content + each
  // bullet + the closing line — NOT the raw markdown (no `**`, no
  // bullet hyphens, no `TL;DR:` label). The cursor needs to index
  // those rendered words exactly, otherwise the highlight + auto-
  // scroll target the wrong span (or nothing at all). Compute a flat
  // array of `{ text, wordIdx, section, sectionWordIdx }` so we can
  // both feed the matcher and render with consistent data-word-index
  // attributes.
  //
  // In prose mode this stays equivalent to the legacy tokens.filter
  // (kind === 'word') so the matcher input and word count are
  // unchanged.
  type ContentWord = {
    word: string;
    wordIdx: number;
    section: 'tldr' | 'bullet' | 'closing' | 'prose';
    bulletIdx?: number;
  };
  const contentWords: ContentWord[] = useMemo(() => {
    if (!scaffold.isScaffold) {
      return tokens
        .filter((t) => t.kind === 'word')
        .map((t, i) => ({ word: t.value, wordIdx: i, section: 'prose' }));
    }
    const out: ContentWord[] = [];
    const push = (
      txt: string,
      section: ContentWord['section'],
      bulletIdx?: number,
    ) => {
      txt
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 0)
        .forEach((w) => {
          out.push({
            word: w,
            wordIdx: out.length,
            section,
            bulletIdx,
          });
        });
    };
    if (scaffold.tldr) push(scaffold.tldr, 'tldr');
    scaffold.bullets.forEach((b, i) => push(b, 'bullet', i));
    if (scaffold.closing) push(scaffold.closing, 'closing');
    return out;
  }, [scaffold, tokens]);

  const totalWords = contentWords.length;

  // Phase 4b: pre-normalised script tokens — the matcher operates on
  // lowercased, punctuation-stripped strings on both sides. Now built
  // from `contentWords` so prose AND scaffold use the same indexing
  // basis as the rendered DOM — guarantees the matcher's cursor
  // result lines up 1:1 with the data-word-index attributes the
  // auto-scroll effect targets.
  const scriptTokens = useMemo(
    () => tokeniseSpoken(contentWords.map((c) => c.word).join(' ')),
    [contentWords],
  );

  const [cursor, setCursor] = useState(0);
  const [wpm, setWpm] = useState(WPM_DEFAULT);
  const [paused, setPaused] = useState(false);
  const [statusVisible, setStatusVisible] = useState(false);

  // Reset cursor when a fresh answer starts (text shrinks below
  // its previous length, e.g. new question or pitch generation).
  const lastTextLenRef = useRef(text.length);
  useEffect(() => {
    if (text.length < lastTextLenRef.current) {
      setCursor(0);
    }
    lastTextLenRef.current = text.length;
  }, [text]);

  // Streaming cap — don't outrun the trailing edge of the LLM
  // stream. While streaming, cap advance at totalWords − buffer.
  const advanceCeiling = isStreaming
    ? Math.max(0, totalWords - STREAM_BUFFER_WORDS)
    : totalWords;

  // Hold a beat once streaming finishes so the candidate can take
  // a natural pause at end-of-answer.
  const finishedAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isStreaming && text.length > 0) {
      finishedAtRef.current = Date.now();
    } else {
      finishedAtRef.current = null;
    }
  }, [isStreaming, text.length]);

  // Phase 4b: track when the last user-transcript-driven advance
  // landed. The timer fallback below consults this — if the matcher
  // moved the cursor within ASR_SILENCE_FALLBACK_MS, the timer
  // yields. When the candidate is silent (or goes off-script and the
  // matcher can't find a confident anchor for >2s), the timer kicks
  // back in so the cursor doesn't visibly freeze.
  const lastAsrAdvanceAtRef = useRef<number>(0);

  // Phase 4b: matcher — runs on every user-transcript update.
  // Tokenises the spoken stream (cumulative final + latest partial),
  // calls the banded-Levenshtein matcher against the script, and
  // advances the cursor when it returns a forward-only hit.
  //
  // We rebuild the spoken-tokens array on every update because the
  // matcher only ever uses its tail (last ~4 words); slicing here
  // would mean re-implementing the same heuristic in two places.
  useEffect(() => {
    if (totalWords === 0) return;
    if (scriptTokens.length === 0) return;
    // Spoken stream = everything the candidate has said so far this
    // session (cumulative final) + the in-flight partial. The
    // matcher will only use the trailing N words anyway.
    const spoken = tokeniseSpoken(
      userTranscriptFinal && userTranscriptPartial
        ? `${userTranscriptFinal} ${userTranscriptPartial}`
        : userTranscriptFinal || userTranscriptPartial,
    );
    if (spoken.length === 0) return;
    setCursor((prev) => {
      const candidate = matchSpokenToScript(spoken, scriptTokens, prev);
      if (candidate === null) return prev;
      // Only advance — never rewind via the matcher. A user can
      // still rewind via ⌥ ←. Cap at the streaming ceiling so we
      // don't outrun Claude's trailing tokens.
      const next = Math.min(candidate, advanceCeiling);
      if (next > prev) {
        lastAsrAdvanceAtRef.current = Date.now();
        return next;
      }
      // Same or lower — keep the cursor put (matcher confidence
      // wasn't enough to move forward; let the next event try).
      return prev;
    });
  }, [
    userTranscriptTick,
    userTranscriptPartial,
    userTranscriptFinal,
    scriptTokens,
    totalWords,
    advanceCeiling,
  ]);

  // Pace-aware auto-advance — Phase 4a, now demoted to FALLBACK.
  // The interval re-arms after every tick so we can apply
  // punctuation-based extra holds without a separate timer or queue.
  //
  // Phase 4b behaviour: each tick checks whether the matcher has
  // moved the cursor recently (within ASR_SILENCE_FALLBACK_MS). If
  // it has, the timer NO-OPS for one beat — the matcher is in the
  // driver's seat. If the matcher has been silent for longer than
  // the threshold (candidate paused / went off-script), the timer
  // advances one word like before. Net effect: the timer is the
  // safety net that prevents the cursor from freezing on silence.
  useEffect(() => {
    if (totalWords === 0 || paused) return undefined;
    let cancelled = false;
    let timer: number | undefined;

    const baseMs = Math.round((60 * 1000) / Math.max(1, wpm));

    const tick = () => {
      if (cancelled) return;
      setCursor((prev) => {
        if (prev >= advanceCeiling) {
          // Cursor at the cap. Re-check in 120 ms so we resume
          // promptly when more text streams in or the stream ends.
          timer = window.setTimeout(tick, 120);
          return prev;
        }
        const fa = finishedAtRef.current;
        if (fa !== null && Date.now() - fa < POST_FINAL_HOLD_MS) {
          timer = window.setTimeout(tick, POST_FINAL_HOLD_MS);
          return prev;
        }
        // Phase 4b: yield to the ASR matcher if it advanced the
        // cursor recently. Re-check on the next base interval — we
        // want the timer ready to step in the instant the user goes
        // silent, not waste a full WPM beat on the silence detection.
        const sinceAsr = Date.now() - lastAsrAdvanceAtRef.current;
        if (
          lastAsrAdvanceAtRef.current > 0 &&
          sinceAsr < ASR_SILENCE_FALLBACK_MS
        ) {
          timer = window.setTimeout(tick, baseMs);
          return prev;
        }
        // Compute the delay AFTER this word: base interval plus
        // whatever punctuation hold the current word carries.
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

  // Surface the WPM / pause indicator briefly any time the user
  // changes pace, then fade it out. The candidate doesn't need a
  // permanent dashboard — just a flash to confirm the action.
  useEffect(() => {
    setStatusVisible(true);
    const id = window.setTimeout(() => setStatusVisible(false), STATUS_FADE_MS);
    return () => window.clearTimeout(id);
  }, [wpm, paused]);

  // Hotkeys. Option (alt) modifier across the board so we don't
  // collide with Zoom/Teams keyboard shortcuts.
  const bumpWpm = useCallback((delta: number) => {
    setWpm((prev) => {
      const next = prev + delta;
      if (next < WPM_MIN) return WPM_MIN;
      if (next > WPM_MAX) return WPM_MAX;
      return next;
    });
  }, []);
  const sessionActive = activeSessionId !== null && status !== 'idle';
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

  // Global shortcuts (Tauri plugin) — same ⌥-modified keys as the
  // local handler, but registered with the OS so they fire even when
  // Career OS doesn't have focus. THAT is the actual use case during
  // a real interview: the candidate is staring at Zoom/Teams, can't
  // alt-tab back without raising suspicion, and needs to pause /
  // step / change pace from inside the call.
  //
  // First-time use: macOS prompts for Input Monitoring permission.
  // The user grants it once in System Settings → Privacy & Security
  // and never sees the prompt again. If they decline we keep the
  // local-window handler above as a fallback.
  //
  // Closures over React state are stale by definition (the registered
  // callback lives outside React's render cycle). We mirror the few
  // values the callbacks need into refs so the latest state is
  // always read.
  const ceilingRef = useRef(advanceCeiling);
  ceilingRef.current = advanceCeiling;
  useEffect(() => {
    if (!sessionActive) return undefined;
    // Tauri accelerator strings. `Alt` is macOS Option. Key codes
    // match the `KeyboardEvent.code` family — `Space`, arrows, `KeyR`.
    const bindings: Array<[string, () => void]> = [
      ['Alt+Space', () => setPaused((p) => !p)],
      ['Alt+Left', () => setCursor((c) => Math.max(0, c - 1))],
      ['Alt+Right', () =>
        setCursor((c) => Math.min(ceilingRef.current, c + 1))],
      ['Alt+Up', () => bumpWpm(WPM_STEP)],
      ['Alt+Down', () => bumpWpm(-WPM_STEP)],
      ['Alt+KeyR', () => setCursor(0)],
      // T5 (2026-05-17): manual "Answer now" shortcut. Forces Claude
      // to generate against whatever's currently buffered (or just a
      // bare intent if the buffer is empty). Bypasses the T1 word-count
      // gate and the T2 already-generating gate; T3 still aborts the
      // previous in-flight stream. The Rust `force_answer` command
      // sends through the oneshot channel that `run_session` watches
      // via `tokio::select!`.
      [
        'CmdOrCtrl+Shift+KeyA',
        () => {
          invoke('force_answer', { intent: '' }).catch((err) => {
            // eslint-disable-next-line no-console
            console.warn('[teleprompter] force_answer failed:', err);
          });
        },
      ],
    ];
    const accelerators = bindings.map(([acc]) => acc);
    // Best-effort register. If the plugin throws (permission denied,
    // shortcut already registered by another app, etc.) we swallow
    // the error — the local-window handler above still works while
    // Career OS is focused.
    bindings.forEach(([acc, handler]) => {
      registerGlobalShortcut(acc, handler).catch((err) => {
        // eslint-disable-next-line no-console
        console.warn(`[teleprompter] failed to register ${acc}:`, err);
      });
    });
    return () => {
      accelerators.forEach((acc) => {
        unregisterGlobalShortcut(acc).catch(() => {
          /* unregister is best-effort */
        });
      });
    };
  }, [sessionActive, bumpWpm]);

  // Lazy auto-scroll: only scroll when the cursor LEAVES the visible
  // region, not on every word advance. `scrollIntoView({block:
  // 'center'})` on each cursor change yanks the page a few px every
  // word — at 3 wpm-ticks/sec it makes the whole text shimmy under
  // the candidate's eye, which is the opposite of what a teleprompter
  // is supposed to do (let you READ).
  //
  // New behaviour: compare the current word's bounding box to the
  // container's. Only scroll when the word is in the bottom ~25% of
  // the visible area (so we keep some "next line" peek) — and even
  // then, jump only to the top of the next "page" rather than
  // re-centring.
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
    // How far down the visible area is the current word? 0 = top
    // edge, 1 = bottom edge.
    const relativeY =
      (targetRect.top - containerRect.top) / containerRect.height;
    // Only scroll when the cursor is past 75% of the way down OR
    // somehow ended up off-screen above. The intermediate range
    // (0-75%) is "comfortable reading" and triggers NO scroll.
    if (relativeY > 0.75 || relativeY < 0) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [cursor]);

  if (!sessionActive || !text.trim()) return null;

  // Words remaining count — surfaced in the status badge so the
  // candidate has a rough sense of how long the answer is.
  const remaining = Math.max(0, totalWords - cursor);

  let wordSeq = 0;
  return (
    <div className="cp-teleprompter" role="region" aria-label="Copilot teleprompter">
      <div className="cp-teleprompter__capsule">
        <div ref={bodyRef} className="cp-teleprompter__body">
          {scaffold.isScaffold ? (
            // D1 scaffold view — TL;DR + bullets + closing line.
            // 2026-05-17: rendered word-by-word with `data-word-index`
            // attributes that line up 1:1 with the matcher cursor.
            // The lazy auto-scroll effect (below) targets
            // `data-word-index="${cursor}"` to keep the current word
            // in the comfortable reading zone. Each word gets a
            // past/current/future class so the candidate sees exactly
            // where they are in the script.
            (() => {
              // Slice the flat contentWords array per section so we
              // can render each part inside its own DOM container
              // (TL;DR pill row, <ul>, Closing pill row) while keeping
              // the global wordIdx stable.
              const tldrWords = contentWords.filter((c) => c.section === 'tldr');
              const closingWords = contentWords.filter(
                (c) => c.section === 'closing',
              );
              const bulletGroups = scaffold.bullets.map((_, bi) =>
                contentWords.filter(
                  (c) => c.section === 'bullet' && c.bulletIdx === bi,
                ),
              );
              const renderWord = (cw: ContentWord) => {
                let cls = 'cp-teleprompter__word';
                if (cw.wordIdx < cursor) cls += ' cp-teleprompter__word--past';
                else if (cw.wordIdx === cursor)
                  cls += ' cp-teleprompter__word--current';
                else cls += ' cp-teleprompter__word--future';
                return (
                  <span
                    key={cw.wordIdx}
                    className={cls}
                    data-word-index={cw.wordIdx}
                  >
                    {cw.word}
                    {' '}
                  </span>
                );
              };
              return (
                <div className="cp-teleprompter__scaffold">
                  {tldrWords.length > 0 && (
                    <div className="cp-teleprompter__scaffold-tldr">
                      <span className="cp-teleprompter__scaffold-label">
                        TL;DR
                      </span>
                      <span className="cp-teleprompter__scaffold-line">
                        {tldrWords.map(renderWord)}
                      </span>
                    </div>
                  )}
                  {bulletGroups.length > 0 && (
                    <ul className="cp-teleprompter__scaffold-bullets">
                      {bulletGroups.map((words, bi) => (
                        <li
                          key={bi}
                          className="cp-teleprompter__scaffold-bullet"
                        >
                          {words.map(renderWord)}
                        </li>
                      ))}
                    </ul>
                  )}
                  {closingWords.length > 0 && (
                    <div className="cp-teleprompter__scaffold-closing">
                      <span className="cp-teleprompter__scaffold-label">
                        Closing
                      </span>
                      <span className="cp-teleprompter__scaffold-line">
                        {closingWords.map(renderWord)}
                      </span>
                    </div>
                  )}
                  {isStreaming && (
                    <span
                      className="cp-teleprompter__cursor"
                      aria-hidden="true"
                    />
                  )}
                </div>
              );
            })()
          ) : (
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
          )}
        </div>
      </div>

      {/* Status badge — surfaces the current WPM + pause state +
          words remaining + (when paused) a hint at the resume
          hotkey. Fades in on change, fades out after STATUS_FADE_MS.
          `aria-hidden` because screen readers would announce every
          tick; the cursor itself is the accessible signal of
          progress.

          The hotkey hint matters more than it looks: the candidate
          is in a Zoom call, can't see a help menu, has zero context
          for "what does ⌥ Space do". Surfacing the binding the
          moment they hit pause is the difference between "did
          something happen?" and "I know exactly how to unpause". */}
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

      {/* Wave 2 / T6 (2026-05-17): quick action chips. Each calls
          `force_answer` with a prefilled `intent` string that the Rust
          side prepends to the buffered interviewer transcript (see
          `src-tauri/src/lib.rs::force_answer`). Bypasses the T1
          word-count gate + T2 already-generating gate but respects T3
          abort — so spamming chips cancels the previous answer cleanly
          instead of stacking. Only shown when a live session is active. */}
      {sessionActive && (
        <div className="cp-teleprompter__chips" aria-label="Quick actions">
          <button
            type="button"
            className="cp-teleprompter__chip"
            title="⌘⇧A · Force Claude to answer now with the current buffered transcript"
            onClick={() => {
              invoke('force_answer', { intent: '' }).catch((err) => {
                // eslint-disable-next-line no-console
                console.warn('[chips] force_answer (now) failed:', err);
              });
            }}
          >
            Answer now
          </button>
          <button
            type="button"
            className="cp-teleprompter__chip"
            title="Compress the previous answer to 2 bullets + a synthesis line"
            onClick={() => {
              invoke('force_answer', {
                intent:
                  'Recap the previous answer in 2 short bullets + one synthesis line. Same scaffold format.',
              }).catch((err) => {
                // eslint-disable-next-line no-console
                console.warn('[chips] force_answer (recap) failed:', err);
              });
            }}
          >
            Recap
          </button>
          <button
            type="button"
            className="cp-teleprompter__chip"
            title="Push back on the interviewer's last claim with a respectful counter-argument"
            onClick={() => {
              invoke('force_answer', {
                intent:
                  "The interviewer just challenged the previous point. Push back respectfully but firmly: pick the strongest counter and defend with one concrete example from the CV. Keep the scaffold format.",
              }).catch((err) => {
                // eslint-disable-next-line no-console
                console.warn('[chips] force_answer (counter) failed:', err);
              });
            }}
          >
            Counter
          </button>
          <button
            type="button"
            className="cp-teleprompter__chip"
            title="Drill down on the single specific point the interviewer flagged"
            onClick={() => {
              invoke('force_answer', {
                intent:
                  'The interviewer wants more detail on the LAST specific point. Drill down on that ONE point with 3 concrete sub-bullets — numbers, names, mechanism. Skip the TL;DR (already given). Just bullets + closing.',
              }).catch((err) => {
                // eslint-disable-next-line no-console
                console.warn('[chips] force_answer (probe) failed:', err);
              });
            }}
          >
            Probe
          </button>
        </div>
      )}
    </div>
  );
}
