import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
import { useAppStore } from "../../store";
import type { ApplicationStage } from "../../store";
import { useNavigation } from "../../navigation";

const STAGE_OPTIONS: { value: ApplicationStage; label: string }[] = [
  { value: "sourced", label: "Sourced" },
  { value: "applied", label: "Applied" },
  { value: "phone_screen", label: "Phone screen" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
];

interface NewApplicationModalProps {
  open: boolean;
  onClose: () => void;
  /** Optional pre-selected stage (from Pipeline column "+ Add card"). */
  defaultStage?: ApplicationStage;
}

export default function NewApplicationModal({
  open,
  onClose,
  defaultStage,
}: NewApplicationModalProps) {
  const toast = useToast();
  const { navigate } = useNavigation();

  const cvs = useAppStore((s) => s.cvs);
  const defaultCvId = useAppStore((s) => s.defaultCvId);
  const createJob = useAppStore((s) => s.createJob);
  const createApplication = useAppStore((s) => s.createApplication);
  const setSelectedApplication = useAppStore((s) => s.setSelectedApplication);

  // Step state
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Job info
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [jdText, setJdText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  // Step 2: CV + cover letter
  const [cvId, setCvId] = useState<string | null>(defaultCvId ?? null);
  const [coverLetter, setCoverLetter] = useState("");

  // Step 3: Initial stage
  const [stage, setStage] = useState<ApplicationStage>(defaultStage ?? "applied");

  // Reset when modal opens.
  useEffect(() => {
    if (open) {
      setStep(1);
      setCompany("");
      setRole("");
      setLocation("");
      setSalaryRange("");
      setJdText("");
      setSourceUrl("");
      setCvId(defaultCvId ?? null);
      setCoverLetter("");
      setStage(defaultStage ?? "applied");
    }
  }, [open, defaultCvId, defaultStage]);

  const canAdvance1 = company.trim() && role.trim();
  const selectedCv = cvs.find((c) => c.id === cvId);
  const selectedStageLabel =
    STAGE_OPTIONS.find((s) => s.value === stage)?.label ?? "Applied";

  function parseSalary(raw: string): { min: number; max: number; currency: string } {
    const currency = raw.match(/[€$£]/)?.[0] ?? "€";
    const nums = Array.from(raw.matchAll(/(\d+)\s*k/gi)).map((m) => Number(m[1]) * 1000);
    return { min: nums[0] ?? 0, max: nums[1] ?? nums[0] ?? 0, currency };
  }

  function handleSubmit() {
    const { min, max, currency } = parseSalary(salaryRange);
    const job = createJob({
      role: role.trim(),
      company: company.trim(),
      location: location.trim() || "Remote",
      salaryMin: min,
      salaryMax: max,
      salaryCurrency: currency,
      jdText: jdText.trim() || undefined,
    });
    const app = createApplication({
      jobId: job.id,
      cvId: cvId ?? undefined,
      stage,
      company: job.company,
      role: job.role,
    });
    setSelectedApplication(app.id);
    toast.success("Application created", `${job.company} · ${job.role}`);
    navigate("applications");
    onClose();
    // Suppress unused warnings — sourceUrl/coverLetter would be saved server-side.
    void sourceUrl;
    void coverLetter;
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" ariaLabel="New application">
      <ModalHeader
        title="New application"
        subtitle={`Step ${step} of 3 · ${
          step === 1 ? "Job info" : step === 2 ? "Materials" : "Stage"
        }`}
        onClose={onClose}
      />
      <ModalBody>
        {step === 1 && (
          <div style={{ display: "grid", gap: 14 }}>
            <FormRow label="Company" required>
              <input
                className="ds-input"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Stripe"
                autoFocus
              />
            </FormRow>
            <FormRow label="Role" required>
              <input
                className="ds-input"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Strategy & Ops"
              />
            </FormRow>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <FormRow label="Location">
                <input
                  className="ds-input"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Paris, France"
                />
              </FormRow>
              <FormRow label="Salary range">
                <input
                  className="ds-input"
                  value={salaryRange}
                  onChange={(e) => setSalaryRange(e.target.value)}
                  placeholder="€90k - €120k"
                />
              </FormRow>
            </div>
            <FormRow label="Job description">
              <textarea
                className="ds-input ds-input--textarea"
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste the JD here…"
                rows={5}
              />
            </FormRow>
            <FormRow label="Source URL">
              <input
                className="ds-input"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://stripe.com/jobs/123"
              />
            </FormRow>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: "grid", gap: 14 }}>
            <FormRow label="CV variant">
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
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </FormRow>
            <FormRow label="Cover letter (optional)">
              <textarea
                className="ds-input ds-input--textarea"
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Dear hiring team…"
                rows={6}
              />
            </FormRow>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: "grid", gap: 14 }}>
            <FormRow label="Initial stage">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="ds-select-trigger">
                    <span>{selectedStageLabel}</span>
                    <ChevronDown size={14} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {STAGE_OPTIONS.map((opt) => (
                    <DropdownMenuItem
                      key={opt.value}
                      onSelect={() => setStage(opt.value)}
                    >
                      {opt.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </FormRow>
            <div className="ds-summary">
              <div className="ds-summary__row">
                <span className="ds-summary__label">Company</span>
                <span>{company || "—"}</span>
              </div>
              <div className="ds-summary__row">
                <span className="ds-summary__label">Role</span>
                <span>{role || "—"}</span>
              </div>
              <div className="ds-summary__row">
                <span className="ds-summary__label">CV</span>
                <span>{selectedCv?.name ?? "—"}</span>
              </div>
              <div className="ds-summary__row">
                <span className="ds-summary__label">Stage</span>
                <span>{selectedStageLabel}</span>
              </div>
            </div>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        {step > 1 ? (
          <button
            type="button"
            className="ds-btn ds-btn--secondary"
            onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
          >
            <ChevronLeft size={14} /> Back
          </button>
        ) : (
          <button
            type="button"
            className="ds-btn ds-btn--secondary"
            onClick={onClose}
          >
            Cancel
          </button>
        )}
        {step < 3 ? (
          <button
            type="button"
            className="ds-btn ds-btn--primary"
            disabled={step === 1 && !canAdvance1}
            onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
          >
            Next <ChevronRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            className="ds-btn ds-btn--primary"
            onClick={handleSubmit}
          >
            Create application
          </button>
        )}
      </ModalFooter>
    </Modal>
  );
}

function FormRow({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="ds-form-row">
      <span className="ds-form-label">
        {label}
        {required && <span className="ds-form-required">*</span>}
      </span>
      {children}
    </label>
  );
}
