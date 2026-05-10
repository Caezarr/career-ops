import { useEffect, useRef, useState } from "react";

/**
 * Browser SpeechRecognition wrapper.
 *
 * Uses the standard Web Speech API (`SpeechRecognition` or
 * `webkitSpeechRecognition` in older WebKit). Works in the Tauri 2
 * webview on macOS 13+ without any backend cost — Apple ships the
 * recognition engine locally with the OS.
 *
 * Falls back gracefully when the API is unavailable (older WebKit,
 * Linux Tauri builds, etc.) — `supported` is false and `start` is
 * a no-op. The caller component should hide the mic button or show
 * an explanatory tooltip in that case.
 *
 * Returns the running transcript split in two:
 *   - `transcript` — the final, settled text. Append-only across
 *      one start/stop cycle. Cleared via `reset()`.
 *   - `interim` — the in-flight, possibly-revised tail. The browser
 *      replaces it as the user keeps speaking.
 *
 * Pattern in components:
 *   const sr = useSpeechRecognition("fr-FR");
 *   const live = (sr.transcript + " " + sr.interim).trim();
 *   <textarea value={value || live} onChange={...} />
 *   <button onClick={sr.listening ? sr.stop : sr.start}>...</button>
 */

// Minimal local types so we don't depend on lib.dom typings that
// vary across TS releases.
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    [index: number]: { transcript: string };
  }>;
}

interface SpeechRecognitionErrorEventLike {
  error?: string;
  message?: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((this: SpeechRecognitionLike, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionLike, ev: Event) => void) | null;
  onerror:
    | ((this: SpeechRecognitionLike, ev: SpeechRecognitionErrorEventLike) => void)
    | null;
  onresult:
    | ((this: SpeechRecognitionLike, ev: SpeechRecognitionEventLike) => void)
    | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

export interface SpeechRecognitionResult {
  /** True when the browser exposes a SpeechRecognition constructor. */
  supported: boolean;
  /** True between `start()` and the next `end`/`stop`/error event. */
  listening: boolean;
  /** Concatenated final transcripts since the last `reset`. */
  transcript: string;
  /** The browser's current interim guess (replaced on every chunk). */
  interim: string;
  /** Last error string if any. Cleared on `start`. */
  error: string | null;
  start: () => void;
  stop: () => void;
  /** Wipe the cumulative transcript. Does NOT stop a live session. */
  reset: () => void;
}

export function useSpeechRecognition(lang: string = "fr-FR"): SpeechRecognitionResult {
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const Ctor: SpeechRecognitionCtor | null =
    typeof window !== "undefined"
      ? window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
      : null;
  const supported = Ctor !== null;

  useEffect(() => {
    if (!Ctor) return;
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = lang;
    r.onresult = (ev) => {
      let interimText = "";
      let finalText = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const result = ev.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) finalText += text;
        else interimText += text;
      }
      if (finalText) {
        setTranscript((prev) => {
          const next = (prev + " " + finalText).replace(/\s+/g, " ").trim();
          return next;
        });
      }
      setInterim(interimText);
    };
    r.onend = () => {
      setListening(false);
      setInterim("");
    };
    r.onerror = (ev) => {
      setError(ev.error ?? ev.message ?? "speech-recognition error");
      setListening(false);
    };
    recRef.current = r;
    return () => {
      try {
        r.abort();
      } catch {
        /* already stopped */
      }
      recRef.current = null;
    };
  }, [Ctor, lang]);

  return {
    supported,
    listening,
    transcript,
    interim,
    error,
    start: () => {
      const r = recRef.current;
      if (!r || listening) return;
      try {
        setError(null);
        r.start();
        setListening(true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "start failed";
        setError(msg);
      }
    },
    stop: () => {
      const r = recRef.current;
      if (!r) return;
      try {
        r.stop();
      } catch {
        /* idempotent */
      }
      setListening(false);
    },
    reset: () => {
      setTranscript("");
      setInterim("");
    },
  };
}
