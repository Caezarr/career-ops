import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useToast,
} from "../../primitives";
import { useAppStore, type Job } from "../../store";
import { useNavigation } from "../../navigation";

interface ApplyModalProps {
  open: boolean;
  onClose: () => void;
  job: Job | null;
}

/** Lightweight Apply modal — used from the Jobs page. Fewer fields than
 *  NewApplicationModal because the Job is pre-selected.
 */
export default function ApplyModal({ open, onClose, job }: ApplyModalProps) {
  const toast = useToast();
  const { navigate } = useNavigation();
  const cvs = useAppStore((s) => s.cvs);
  const defaultCvId = useAppStore((s) => s.defaultCvId);
  const createApplication = useAppStore((s) => s.createApplication);
  const setSelectedApplication = useAppStore((s) => s.setSelectedApplication);

  const [cvId, setCvId] = useState<string | null>(defaultCvId ?? null);
  const [coverLetter, setCoverLetter] = useState("");

  useEffect(() => {
    if (open) {
      setCvId(defaultCvId ?? null);
      setCoverLetter("");
    }
  }, [open, defaultCvId]);

  const selectedCv = cvs.find((c) => c.id === cvId);

  function handleSubmit() {
    if (!job) return;

    // Sprint 4 (audit Reality BLOCKING #6): pass every Job-side
    // enrichment through to the Application so the detail panel
    // shows real salary / workMode / source URL instead of "—".
    // The previous version dropped `coverLetter` (the smoking gun
    // was the trailing `void coverLetter` to silence the unused
    // warning) and ignored every JT-scraped field.
    const salaryStr =
      job.salaryMin > 0 || job.salaryMax > 0
        ? `${job.salaryCurrency}${Math.round(job.salaryMin / 1000)}k - ${
            job.salaryCurrency
          }${Math.round(job.salaryMax / 1000)}k`
        : undefined;

    const app = createApplication({
      jobId: job.id,
      cvId: cvId ?? undefined,
      stage: "applied",
      company: job.company,
      role: job.role,
      match: job.match,
      salary: salaryStr,
      workMode: job.workMode,
      sourceUrl: job.source?.sourceUrl,
      coverLetter: coverLetter.trim() || undefined,
    });
    toast({
      title: "Application created",
      description: `${job.company} · ${job.role}`,
      type: "success",
      action: {
        label: "View",
        onClick: () => {
          setSelectedApplication(app.id);
          navigate("applications");
        },
      },
    });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      ariaLabel={`Apply to ${job?.company ?? "company"}`}
    >
      <ModalHeader
        title={job ? `Apply to ${job.company}` : "Apply"}
        subtitle={job ? job.role : undefined}
        onClose={onClose}
      />
      <ModalBody>
        <div style={{ display: "grid", gap: 14 }}>
          <label className="ds-form-row">
            <span className="ds-form-label">CV variant</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="ds-select-trigger">
                  <span>{selectedCv?.name ?? "Choose CV"}</span>
                  <ChevronDown size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {cvs.map((cv) => (
                  <DropdownMenuItem
                    key={cv.id}
                    onSelect={() => setCvId(cv.id)}
                  >
                    {cv.name}
                    {cv.isDefault && (
                      <span className="ds-form-hint" style={{ marginLeft: 8 }}>
                        default
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </label>

          <label className="ds-form-row">
            <span className="ds-form-label">Cover letter (optional)</span>
            <textarea
              className="ds-input ds-input--textarea"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Why you're a great fit…"
              rows={5}
            />
          </label>
        </div>
      </ModalBody>
      <ModalFooter>
        <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="ds-btn ds-btn--primary"
          onClick={handleSubmit}
          disabled={!job}
        >
          Submit application
        </button>
      </ModalFooter>
    </Modal>
  );
}
