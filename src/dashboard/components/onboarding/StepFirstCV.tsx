import { useRef, useState, type DragEvent } from "react";
import { UploadCloud, FileText, Check } from "lucide-react";
import { useAppStore } from "../../store";
import { ingestPdfFile } from "../../lib/pdf";

/** Step 3 — drag-and-drop a PDF, or skip. On drop we invoke the
 *  existing `parse_cv_pdf` Tauri command via `ingestPdfFile`, then
 *  push the result through `createCV` so the rest of the app sees a
 *  real default CV from the moment the wizard finishes. */
export default function StepFirstCV() {
  const createCV = useAppStore((s) => s.createCV);
  const cvs = useAppStore((s) => s.cvs);
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [success, setSuccess] = useState<{ name: string; words: number } | null>(
    null,
  );

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
