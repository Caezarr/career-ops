import { useEffect, useRef, type ChangeEvent, type KeyboardEvent } from "react";
import { Mic, MicOff, Square } from "lucide-react";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";

/**
 * Single narrative question — used by `StepNarrative` to render
 * one of the 5 sub-prompts. The component owns nothing about
 * order / sequencing — the parent passes index/total + the value
 * binding and decides what comes next.
 *
 * UI:
 *   - Header with "N / TOTAL" + the question title
 *   - Subtitle / placeholder hint
 *   - Textarea (the source of truth) + soft / hard char limits
 *   - Mic toggle: when listening, transcript + interim stream
 *     into the textarea below the user's manual edits
 *   - Cmd+Enter on textarea = onNext (skip-aware: parent handles
 *     whether empty answer is "skip" or "submit empty")
 */

export interface NarrativeQuestionProps {
  index: number;
  total: number;
  title: string;
  subtitle: string;
  value: string;
  onChange: (next: string) => void;
  onNext: () => void;
}

const SOFT_CAP = 500;
const HARD_CAP = 800;

export default function NarrativeQuestion({
  index,
  total,
  title,
  subtitle,
  value,
  onChange,
  onNext,
}: NarrativeQuestionProps) {
  const sr = useSpeechRecognition("fr-FR");
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // Stream the live transcript into the textarea while listening.
  // We only OVERWRITE when actively listening — once stopped, the
  // user is free to edit. `lastSyncedRef` tracks what we wrote so
  // we don't trample manual edits made during pauses.
  const lastSyncedRef = useRef<string>("");
  useEffect(() => {
    if (!sr.listening) return;
    const live = (sr.transcript + " " + sr.interim).replace(/\s+/g, " ").trim();
    if (!live) return;
    // Append the new portion of the live transcript to whatever the
    // user already had in the textarea before they hit "Dictate".
    const prefix = value.endsWith(lastSyncedRef.current)
      ? value.slice(0, value.length - lastSyncedRef.current.length)
      : value + " ";
    const next = (prefix + live).replace(/\s+/g, " ").trimStart();
    lastSyncedRef.current = live;
    onChange(next.length > HARD_CAP ? next.slice(0, HARD_CAP) : next);
    // We intentionally exclude `onChange` and `value` from deps —
    // depending on `value` would re-run on every keystroke which
    // races with the live stream. The dictate cycle is bounded by
    // start/stop, not keystroke cadence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sr.transcript, sr.interim, sr.listening]);

  // When dictation starts, snapshot what was already in the textarea
  // so subsequent live chunks append cleanly.
  useEffect(() => {
    if (sr.listening) {
      lastSyncedRef.current = "";
    }
  }, [sr.listening]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (sr.listening) sr.stop();
      onNext();
    }
  }

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value.slice(0, HARD_CAP);
    onChange(v);
  }

  function toggleMic() {
    if (sr.listening) {
      sr.stop();
    } else {
      sr.reset();
      lastSyncedRef.current = "";
      sr.start();
    }
  }

  const charCount = value.length;
  const overSoft = charCount > SOFT_CAP;
  const nearHard = charCount > HARD_CAP - 50;

  return (
    <div className="onboarding-narrative-q">
      <div className="onboarding-narrative-q__head">
        <span className="onboarding-narrative-q__counter">
          {index + 1} <span aria-hidden="true">/ {total}</span>
        </span>
        <h2 className="onboarding-narrative-q__title">{title}</h2>
        <p className="onboarding-narrative-q__subtitle">{subtitle}</p>
      </div>

      <div className="onboarding-narrative-q__field">
        <textarea
          ref={taRef}
          className="onboarding-narrative-q__textarea"
          placeholder="Écris ici, ou clique sur le micro pour dicter."
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          aria-label={title}
        />

        <div className="onboarding-narrative-q__controls">
          {sr.supported ? (
            <button
              type="button"
              className={
                "onboarding-narrative-q__mic" +
                (sr.listening ? " onboarding-narrative-q__mic--on" : "")
              }
              onClick={toggleMic}
              aria-pressed={sr.listening}
              aria-label={sr.listening ? "Arrêter la dictée" : "Dicter à la place d'écrire"}
            >
              {sr.listening ? (
                <>
                  <span className="onboarding-narrative-q__mic-pulse" aria-hidden="true" />
                  <Square size={14} strokeWidth={2.5} fill="currentColor" />
                  <span>En écoute…</span>
                </>
              ) : (
                <>
                  <Mic size={14} strokeWidth={2} />
                  <span>Dicter</span>
                </>
              )}
            </button>
          ) : (
            <span
              className="onboarding-narrative-q__mic-disabled"
              title="Dictée vocale indisponible — macOS 13+ requis."
            >
              <MicOff size={14} strokeWidth={2} />
              <span>Dictée indisponible</span>
            </span>
          )}

          <span
            className={
              "onboarding-narrative-q__count" +
              (overSoft ? " onboarding-narrative-q__count--warn" : "") +
              (nearHard ? " onboarding-narrative-q__count--hot" : "")
            }
            aria-live="polite"
          >
            {charCount} <span aria-hidden="true">/ {SOFT_CAP}</span>
          </span>
        </div>

        {sr.error && (
          <p className="onboarding-narrative-q__error" role="status">
            {sr.error === "not-allowed"
              ? "Permission micro refusée. Active-la dans Préférences Système → Sécurité."
              : `Dictée: ${sr.error}`}
          </p>
        )}
      </div>

      <p className="onboarding-narrative-q__hint">
        Astuce : ⌘ + Entrée pour passer à la question suivante.
      </p>
    </div>
  );
}
