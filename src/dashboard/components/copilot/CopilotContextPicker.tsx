import { Briefcase, IdCard, ChevronDown, AlertTriangle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../../primitives';
import { useAppStore } from '../../store';

/**
 * Compact two-row picker shown above the Start button when no session
 * is active. Drives the persisted `copilotPickerJobId` /
 * `copilotPickerCvId` so smart defaults survive a reload, and feeds
 * `useCopilotControls.start()` with the right linkage at click-time.
 *
 * Smart defaults applied here:
 *   - Job: most-recently-applied application's job, else the first job
 *   - CV: defaultCvId, else the first CV
 *
 * Both are nullable — the user can pick "No job linked" if they're
 * doing freeform practice. In that case the legacy `ic-config.cv` /
 * `ic-config.jd` blobs win, so the overlay's settings still apply.
 */
export default function CopilotContextPicker() {
  const jobs = useAppStore((s) => s.jobs);
  const cvs = useAppStore((s) => s.cvs);
  const applications = useAppStore((s) => s.applications);
  const defaultCvId = useAppStore((s) => s.defaultCvId);
  const pickerJobId = useAppStore((s) => s.copilotPickerJobId);
  const pickerCvId = useAppStore((s) => s.copilotPickerCvId);
  const setPickerJobId = useAppStore((s) => s.setCopilotPickerJobId);
  const setPickerCvId = useAppStore((s) => s.setCopilotPickerCvId);

  // Resolve the effective IDs with smart fallbacks. When the picker
  // value is null we treat it as "auto" and fall back to the most
  // sensible default.
  const fallbackJobId =
    applications.find((a) => !a.archived)?.jobId ?? jobs[0]?.id ?? null;
  const fallbackCvId = defaultCvId ?? cvs[0]?.id ?? null;

  const effectiveJobId = pickerJobId ?? fallbackJobId;
  const effectiveCvId = pickerCvId ?? fallbackCvId;

  const job = jobs.find((j) => j.id === effectiveJobId);
  const cv = cvs.find((c) => c.id === effectiveCvId);

  const jobLabel = job ? `${job.company} · ${job.role}` : 'No job linked';
  const cvLabel = cv ? cv.name : 'No CV selected';

  // Warn the user when a job has no parsed JD text and the CV has no
  // parsed text — the AI context will be thin without them.
  const missingJd = !!job && !job.jdText?.trim();
  const missingCv = !!cv && !cv.parsedText?.trim();
  const warn = missingJd || missingCv;

  return (
    <div className="cp-context-picker">
      <span className="cp-context-picker__lede">
        Career OS will use this job's JD and the picked CV as context for
        the live answers.
      </span>

      <div className="cp-context-picker__rows">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="cp-context-picker__row"
              aria-label="Pick the linked job"
              title="The recruiter's job posting"
            >
              <Briefcase size={14} strokeWidth={2} />
              <span className="cp-context-picker__row-label">Job</span>
              <span
                className={
                  'cp-context-picker__row-value' +
                  (job ? '' : ' cp-context-picker__row-value--muted')
                }
              >
                {jobLabel}
              </span>
              <ChevronDown size={12} strokeWidth={2} className="cp-context-picker__row-chev" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Linked job</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => setPickerJobId(null)}>
              No job linked
            </DropdownMenuItem>
            {jobs.length > 0 && <DropdownMenuSeparator />}
            {jobs.map((j) => (
              <DropdownMenuItem
                key={j.id}
                onSelect={() => setPickerJobId(j.id)}
              >
                {j.company} · {j.role}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="cp-context-picker__row"
              aria-label="Pick the linked CV"
              title="The CV variant Career OS will reference"
            >
              <IdCard size={14} strokeWidth={2} />
              <span className="cp-context-picker__row-label">CV</span>
              <span
                className={
                  'cp-context-picker__row-value' +
                  (cv ? '' : ' cp-context-picker__row-value--muted')
                }
              >
                {cvLabel}
              </span>
              <ChevronDown size={12} strokeWidth={2} className="cp-context-picker__row-chev" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Linked CV</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => setPickerCvId(null)}>
              No CV linked
            </DropdownMenuItem>
            {cvs.length > 0 && <DropdownMenuSeparator />}
            {cvs.map((c) => (
              <DropdownMenuItem
                key={c.id}
                onSelect={() => setPickerCvId(c.id)}
              >
                {c.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {warn && (
        <div className="cp-context-picker__warn">
          <AlertTriangle size={12} strokeWidth={2} />
          <span>
            {missingJd && missingCv
              ? "The selected job has no JD and the CV has no parsed text — Claude won't have job-specific context."
              : missingJd
              ? "Selected job has no JD text — Claude will only see the CV."
              : "Selected CV has no parsed text — re-upload the PDF for richer context."}
          </span>
        </div>
      )}
    </div>
  );
}
