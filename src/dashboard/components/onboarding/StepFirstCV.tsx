import { useRef, useState, type DragEvent } from "react";
import { UploadCloud, FileText, Check, Sparkles } from "lucide-react";
import { useAppStore } from "../../store";
import {
  ingestPdfFile,
  extractCvProfile,
  type CvExtractedProfile,
} from "../../lib/pdf";

/** Step 4 — drag-and-drop a PDF, or skip. Two things happen on drop:
 *
 *   1. `ingestPdfFile` → existing `parse_cv_pdf` command pulls the
 *      raw text and creates a default CV in the user's library.
 *   2. `extractCvProfile` → new `parse_cv_profile` command runs
 *      regex/heuristics over the same text and pre-fills the user's
 *      contact block (email / phone / LinkedIn / GitHub / portfolio
 *      + best-effort name).
 *
 *  The auto-fill is **non-destructive**: we only write fields the
 *  user hasn't already typed via StepIdentity / Settings. So a user
 *  who edited Settings → Profile, hit "Re-run onboarding", and
 *  uploads a CV doesn't see their values clobbered.
 *
 *  Failure of (2) is silent — the regex extractor matches "0 of 6"
 *  for some CVs and that's fine; we still ship the CV import. */
export default function StepFirstCV() {
  const createCV = useAppStore((s) => s.createCV);
  const cvs = useAppStore((s) => s.cvs);
  const user = useAppStore((s) => s.user);
  const updateUser = useAppStore((s) => s.updateUser);
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [success, setSuccess] = useState<{ name: string; words: number } | null>(
    null,
  );
  /** Field labels that were filled from the CV. Drives the
   *  "Auto-rempli depuis ton CV" recap card so the user sees what
   *  was set on their behalf. */
  const [autoFilledLabels, setAutoFilledLabels] = useState<string[]>([]);

  async function ingest(file: File) {
    setError(null);
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("PDF uniquement.");
      return;
    }
    setParsing(true);
    try {
      const { parsedText, baseName, roleFocus } = await ingestPdfFile(file);
      const cv = createCV({
        name: baseName,
        roleFocus,
        atsScore: 0,
        parsedText,
      });
      const wordCount = parsedText.split(/\s+/).filter(Boolean).length;
      setSuccess({ name: cv.name, words: wordCount });

      // Best-effort profile extraction — failure is silent.
      try {
        const profile = await extractCvProfile(file);
        const labels = applyAutoFill(profile);
        setAutoFilledLabels(labels);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[onboarding] CV profile extraction failed:", e);
      }
    } catch (err) {
      const msg =
        typeof err === "string"
          ? err
          : (err as Error).message ?? "Erreur inconnue.";
      setError(`Impossible de lire le PDF — ${msg}`);
    } finally {
      setParsing(false);
    }
  }

  /** Merge extracted fields into `user` without overwriting values
   *  the user has already typed. Returns the human-readable labels
   *  that were actually applied so the UI can list them. */
  function applyAutoFill(profile: CvExtractedProfile): string[] {
    const patch: Record<string, string> = {};
    const filled: string[] = [];

    // Helper: only set if the current user field is empty/falsy.
    const fill = (key: keyof typeof user, value: string | undefined, label: string) => {
      if (!value) return;
      const existing = user[key];
      if (typeof existing === "string" && existing.trim()) return;
      patch[key as string] = value;
      filled.push(label);
    };

    fill("name", profile.name, "nom complet");
    fill("email", profile.email, "email");
    fill("phone", profile.phone, "téléphone");
    fill("linkedin", profile.linkedin, "LinkedIn");
    fill("github", profile.github, "GitHub");
    fill("portfolio", profile.portfolio, "portfolio");

    if (Object.keys(patch).length > 0) {
      updateUser(patch);
    }
    return filled;
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void ingest(file);
  }
  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(true);
  }
  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
  }

  // Already imported at least one CV (e.g. the user re-opened the wizard).
  const alreadyHasCv = cvs.length > 0 && !success;

  return (
    <div className="onboarding__step">
      <h1 className="onboarding__title">Importe ton CV</h1>
      <p className="onboarding__subtitle">
        On le parse en local. Aucun upload externe à ce stade.
      </p>

      {success ? (
        <>
          <div className="onboarding__upload onboarding__upload--success">
            <div className="onboarding__upload-icon" aria-hidden="true">
              <Check size={22} strokeWidth={2.5} />
            </div>
            <div>
              <div className="onboarding__upload-primary">
                {success.name} importé
              </div>
              <div className="onboarding__upload-secondary">
                {success.words} mots — défini comme CV par défaut.
              </div>
            </div>
          </div>

          {autoFilledLabels.length > 0 && (
            <div className="onboarding__autofill" role="status">
              <div className="onboarding__autofill-title">
                <Sparkles size={14} strokeWidth={2} />
                <span>
                  Auto-rempli depuis ton CV ({autoFilledLabels.length}{" "}
                  champ{autoFilledLabels.length > 1 ? "s" : ""})
                </span>
              </div>
              <ul className="onboarding__autofill-list">
                {autoFilledLabels.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  color: "var(--text-2)",
                }}
              >
                Tu pourras tout modifier dans Settings → Profil.
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div
            className={
              "onboarding__upload" +
              (dragging ? " onboarding__upload--dragging" : "") +
              (parsing ? " onboarding__upload--busy" : "")
            }
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDragEnter={onDragOver}
            onClick={() => !parsing && fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && !parsing) {
                e.preventDefault();
                fileRef.current?.click();
              }
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void ingest(f);
                e.target.value = "";
              }}
            />
            <div className="onboarding__upload-icon" aria-hidden="true">
              {parsing ? (
                <FileText size={22} strokeWidth={2} />
              ) : (
                <UploadCloud size={22} strokeWidth={2} />
              )}
            </div>
            <div>
              <div className="onboarding__upload-primary">
                {parsing ? "Lecture du PDF…" : "Dépose ton CV (PDF)"}
              </div>
              <div className="onboarding__upload-secondary">
                {parsing
                  ? "Extraction du texte en cours."
                  : "Ou clique pour parcourir tes fichiers."}
              </div>
            </div>
          </div>

          {error && <div className="onboarding__error">{error}</div>}

          {alreadyHasCv && (
            <div className="onboarding__hint">
              {cvs.length} CV déjà importé{cvs.length > 1 ? "s" : ""} — tu peux passer.
            </div>
          )}
        </>
      )}
    </div>
  );
}
