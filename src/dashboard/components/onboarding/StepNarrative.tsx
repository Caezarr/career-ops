import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Sparkles } from "lucide-react";

/** Sprint 6 — Career Narrative step. Captures the free-form
 *  context that drives `profile.md`: 4 reflective prompts, all
 *  skippable. Voice-to-text is wired via the browser
 *  SpeechRecognition API (free, on-device on modern macOS) so the
 *  user can talk through long anecdotes instead of typing.
 *
 *  The parent (`Onboarding.tsx`) owns the 4 string answers and
 *  builds a Markdown blob in `finish()`. We don't persist the raw
 *  Q&A — only the assembled `profileMarkdown` lives in
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

// Type for the SpeechRecognition browser API (TypeScript doesn't
// ship a built-in def for it — webkit + standard are both gated
// to a vendor-prefixed global). We declare the minimum surface
// we use rather than pulling a full polyfill type.
interface MinimalSpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((ev: { results: SpeechRecognitionResultList }) => void) | null;
  onend: (() => void) | null;
  onerror: ((ev: unknown) => void) | null;
}
type SpeechRecognitionConstructor = new () => MinimalSpeechRecognition;

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return ((w.SpeechRecognition ||
    w.webkitSpeechRecognition) as SpeechRecognitionConstructor | undefined) ?? null;
}

export default function StepNarrative({ answers, setAnswers }: Props) {
  const [recordingKey, setRecordingKey] = useState<NarrativeKey | null>(null);
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);

  // Sticky reference to the answers that voice-to-text appends to —
  // stale-closure protection inside `onresult`.
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // SpeechRecognition only exists on Chromium-based browsers / WebKit
  // (Safari macOS 13+, Tauri's WKWebView). We hide the mic button on
  // platforms that don't support it rather than show a broken affordance.
  const speechSupported = useMemo(() => Boolean(getSpeechRecognitionCtor()), []);

  function setOne(key: NarrativeKey, value: string) {
    setAnswers({ ...answersRef.current, [key]: value });
  }

  function startRecording(key: NarrativeKey) {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    // Stop any running session first — avoids two concurrent mic
    // streams which Safari handles poorly.
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
      // Append final results to the persistent buffer; show interim
      // results live but not committed.
      const next = (buffer + " " + final).trim();
      setOne(key, interim ? `${next} ${interim}` : next);
      if (final) buffer = next;
    };

    rec.onend = () => {
      setRecordingKey(null);
      recognitionRef.current = null;
    };
    rec.onerror = () => {
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
        On utilise tes réponses pour personnaliser les CVs générés et le
        Copilot. Tout est facultatif — vise 2-3 phrases par question.
        {speechSupported && (
          <>
            {" "}
            <Sparkles
              size={12}
              strokeWidth={2}
              style={{ verticalAlign: "middle" }}
            />{" "}
            Tu peux dicter au lieu d&apos;écrire.
          </>
        )}
      </p>

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

/** Build a structured Markdown blob from the 4 answers. Empty
 *  answers are omitted (so a user who fills only "story" still
 *  gets a clean profile.md, not a wall of empty headings). The
 *  output mirrors the placeholder template in `ProfileCard` so a
 *  user re-editing in Settings sees a consistent shape. */
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
