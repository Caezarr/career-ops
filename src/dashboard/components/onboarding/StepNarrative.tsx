import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, AlertCircle } from "lucide-react";

/** Sprint 6 — Career Narrative step. Captures the free-form
 *  context that drives `profile.md`: 4 reflective prompts, all
 *  skippable. The four raw answers are then sent to Claude (via
 *  the parent's `polishProfileMarkdown` call in `finish()`) which
 *  reformulates them into a structured Markdown narrative.
 *
 *  Voice-to-text: webkitSpeechRecognition is wired per prompt.
 *  macOS gates the mic + speech-recognition behind two TCC
 *  prompts; the strings live in `src-tauri/Info.plist`
 *  (`NSMicrophoneUsageDescription`, `NSSpeechRecognitionUsage-
 *  Description`) — without those, WKWebView swallows
 *  `recognition.start()` silently. The error block surfaced by
 *  this component (state `recognitionError`) reflects the actual
 *  reason from the API so the user knows whether to deny the
 *  prompt is the issue, or something else.
 *
 *  The parent (`Onboarding.tsx`) owns the 4 string answers and
 *  builds the Markdown blob in `finish()`. We don't persist the
 *  raw Q&A — only the assembled `profileMarkdown` lives in
 *  `user.profileMarkdown`. */

const PROMPTS: { id: NarrativeKey; label: string; placeholder: string }[] = [
  {
    id: "story",
    label: "Ton parcours en 2-3 phrases",
    placeholder:
      "Ex: Diplômée HEC en 2024, j'ai 2 ans d'expérience en strategy chez BCG. Je vise un MBB ou un fonds VC pour 2027.",
  },
  {
    id: "wins",
    label: "Une expérience qui t'a marqué (chiffrée si possible)",
    placeholder:
      "Ex: J'ai mené un projet de transformation digitale pour un retailer top 10 — 12M€ d'economies sur 18 mois.",
  },
  {
    id: "lesson",
    label: "Un échec et ce que tu en as tiré",
    placeholder:
      "Ex: J'ai sous-estimé l'engagement stakeholder sur un projet IT — j'ai appris à passer 30% du temps en alignement avant de spec.",
  },
  {
    id: "north_star",
    label: "Ce que tu cherches vraiment dans ton prochain poste",
    placeholder:
      "Ex: Une équipe data-driven, un VP qui mentore, et un sujet à fort impact sociétal (climate, healthtech).",
  },
];

export type NarrativeKey = "story" | "wins" | "lesson" | "north_star";
export type NarrativeAnswers = Record<NarrativeKey, string>;

interface Props {
  answers: NarrativeAnswers;
  setAnswers: (next: NarrativeAnswers) => void;
}

// ── SpeechRecognition typing (no built-in TS def for the
//    vendor-prefixed global) ───────────────────────────────────────

interface MinimalSpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((ev: { results: SpeechRecognitionResultList }) => void) | null;
  onend: (() => void) | null;
  onerror: ((ev: { error?: string; message?: string }) => void) | null;
}
type SpeechRecognitionConstructor = new () => MinimalSpeechRecognition;

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return ((w.SpeechRecognition ||
    w.webkitSpeechRecognition) as SpeechRecognitionConstructor | undefined) ?? null;
}

/** Translate the SpeechRecognition error.code into a French
 *  message the user can act on. Most common path on first launch
 *  is `not-allowed` (refused TCC prompt). */
function explainSttError(code: string | undefined): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Permission micro refusée. Vérifie Réglages Système → Confidentialité & sécurité → Microphone et autorise Career OS.";
    case "no-speech":
      return "Aucune parole détectée. Réessaye en parlant plus près du micro.";
    case "audio-capture":
      return "Aucun micro disponible. Branche un micro ou autorise l'accès dans Réglages Système.";
    case "network":
      return "Connexion réseau requise pour la reconnaissance vocale Apple. Réessaye.";
    case "aborted":
      // Voluntary stop — don't surface as error.
      return "";
    default:
      return code ? `Erreur de dictée (${code}). Tape ta réponse.` : "Erreur de dictée. Tape ta réponse.";
  }
}

export default function StepNarrative({ answers, setAnswers }: Props) {
  const [recordingKey, setRecordingKey] = useState<NarrativeKey | null>(null);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);

  // Sticky reference to current answers for stale-closure
  // protection inside the result handler (which fires async on
  // every interim phrase).
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const speechSupported = useMemo(() => Boolean(getSpeechRecognitionCtor()), []);

  function setOne(key: NarrativeKey, value: string) {
    setAnswers({ ...answersRef.current, [key]: value });
  }

  function startRecording(key: NarrativeKey) {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    setRecognitionError(null);

    // Stop any running session first — Safari handles two
    // concurrent mic streams poorly.
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* noop */
      }
    }

    const rec = new Ctor();
    rec.lang = "fr-FR";
    rec.continuous = true;
    rec.interimResults = true;
    let buffer = answersRef.current[key] ?? "";

    rec.onresult = (ev) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) {
          final += r[0].transcript;
        } else {
          interim += r[0].transcript;
        }
      }
      const next = (buffer + " " + final).trim();
      setOne(key, interim ? `${next} ${interim}` : next);
      if (final) buffer = next;
    };

    rec.onend = () => {
      setRecordingKey(null);
      recognitionRef.current = null;
    };
    rec.onerror = (ev) => {
      // eslint-disable-next-line no-console
      console.warn("[narrative] STT error:", ev);
      const msg = explainSttError(ev.error);
      if (msg) setRecognitionError(msg);
      setRecordingKey(null);
      recognitionRef.current = null;
    };

    try {
      rec.start();
      recognitionRef.current = rec;
      setRecordingKey(key);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[narrative] SpeechRecognition.start failed:", e);
      setRecognitionError(
        "Impossible de démarrer la dictée. Tape ta réponse.",
      );
    }
  }

  function stopRecording() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* noop */
      }
    }
    setRecordingKey(null);
  }

  // Stop the mic when the step unmounts (user advances the wizard).
  useEffect(() => {
    return () => stopRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="onboarding__step onboarding__step--compact">
      <h1 className="onboarding__title">Raconte-toi</h1>
      <p className="onboarding__subtitle">
        On structure ensuite tes réponses avec Claude pour générer un
        narratif réutilisable par les CVs tirés et le Copilot. Tout est
        facultatif — vise 2-3 phrases par question.
      </p>

      {recognitionError && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 8,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
            color: "#fca5a5",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          <AlertCircle size={14} strokeWidth={2} style={{ marginTop: 2, flexShrink: 0 }} />
          <span>{recognitionError}</span>
        </div>
      )}

      {PROMPTS.map((p) => {
        const recording = recordingKey === p.id;
        return (
          <div className="onboarding__field" key={p.id}>
            <label
              className="onboarding__label"
              htmlFor={`narrative-${p.id}`}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <span style={{ flex: 1 }}>{p.label}</span>
              {speechSupported && (
                <button
                  type="button"
                  onClick={() =>
                    recording ? stopRecording() : startRecording(p.id)
                  }
                  aria-pressed={recording}
                  aria-label={
                    recording
                      ? `Stop dictée pour ${p.label}`
                      : `Dicter pour ${p.label}`
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 8px",
                    fontSize: 11,
                    fontWeight: 500,
                    textTransform: "none",
                    letterSpacing: 0,
                    border: "1px solid var(--border)",
                    borderRadius: 999,
                    background: recording
                      ? "color-mix(in oklab, var(--indigo) 18%, var(--bg))"
                      : "var(--bg)",
                    color: recording ? "var(--indigo)" : "var(--text-2)",
                    cursor: "pointer",
                  }}
                >
                  {recording ? (
                    <>
                      <MicOff size={11} strokeWidth={2.2} />
                      <span>Stop</span>
                    </>
                  ) : (
                    <>
                      <Mic size={11} strokeWidth={2.2} />
                      <span>Dicter</span>
                    </>
                  )}
                </button>
              )}
            </label>
            <textarea
              id={`narrative-${p.id}`}
              className="onboarding__input onboarding__textarea"
              value={answers[p.id]}
              onChange={(e) => setOne(p.id, e.target.value)}
              placeholder={p.placeholder}
              rows={3}
              style={{
                height: "auto",
                minHeight: 72,
                padding: "10px 12px",
                resize: "vertical",
                lineHeight: 1.5,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

/** Build a structured Markdown blob from the 4 answers. Used as
 *  a fallback when the LLM polish path is unavailable (no Worker
 *  reachable, no auth, network failure). Empty answers are omitted
 *  so a partial fill still produces a clean profile.md. */
export function buildProfileMarkdown(answers: NarrativeAnswers): string {
  const sections: string[] = [];
  if (answers.story.trim()) {
    sections.push(`# Quick story\n${answers.story.trim()}`);
  }
  if (answers.wins.trim()) {
    sections.push(`# Highlights\n${answers.wins.trim()}`);
  }
  if (answers.lesson.trim()) {
    sections.push(`# Anecdotes & lessons\n${answers.lesson.trim()}`);
  }
  if (answers.north_star.trim()) {
    sections.push(`# What I'm looking for next\n${answers.north_star.trim()}`);
  }
  return sections.join("\n\n");
}
