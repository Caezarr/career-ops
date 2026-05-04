import { useMemo, useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import FilterChip from './FilterChip';
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
} from '../../primitives';
import { useAppStore } from '../../store';
import type { Job, JobFilters } from '../../store';

// Static fallbacks used when no jobs are loaded yet (or when a
// dimension can't be derived from the job data — sector / stage /
// seniority aren't on the ATS payloads, so they stay curated).
const STATIC_OPTIONS: Record<keyof JobFilters, string[]> = {
  location: ['Any'], // dynamic — see deriveOptions
  salary: ['Any', '€60k - €80k', '€80k - €120k', '€120k - €160k', '€160k+'],
  seniority: ['Any', 'Junior', 'Mid', 'Senior', 'Staff', 'VP+'],
  sector: ['Any', 'Fintech', 'Health', 'AI/ML', 'Consulting', 'PE/VC'],
  stage: ['Any', 'Pre-seed', 'Series A', 'Series B+', 'Public'],
  remote: ['Any'], // dynamic — see deriveOptions
};

/** Build the dropdown options for each filter dimension from the
 *  current set of jobs. Location and remote (workMode) are computed
 *  live so the user only sees values that actually appear in the
 *  feed. The other dimensions stay curated until we have richer
 *  metadata from the providers. */
function deriveOptions(jobs: Job[]): Record<keyof JobFilters, string[]> {
  // Locations — split combined values like "Paris / Remote (Paris)"
  // and trim. Cap to ~30 most-frequent for sanity.
  const locCounts = new Map<string, number>();
  for (const j of jobs) {
    if (!j.location) continue;
    for (const part of j.location.split(/\s*[,/|]\s*/)) {
      const key = part.trim();
      if (key.length > 0) locCounts.set(key, (locCounts.get(key) ?? 0) + 1);
    }
  }
  const locations = ['Any', ...Array.from(locCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([k]) => k)];

  const remoteSet = new Set<string>();
  for (const j of jobs) {
    if (j.workMode) remoteSet.add(normaliseRemote(j.workMode));
  }
  const remote = ['Any', ...Array.from(remoteSet).sort()];

  // Each of these dimensions is now derivable: seniority comes from
  // the role title (regex), sector + stage from the curated company
  // map. `setIngestedJobs` populates these per-job at sync time, so
  // we can just collect distinct values here.
  const seniority = uniqueValues(jobs, (j) => j.seniority);
  const sector = uniqueValues(jobs, (j) => j.sector);
  const stage = uniqueValues(jobs, (j) => j.companyStage);

  return {
    ...STATIC_OPTIONS,
    location: locations,
    remote: remote.length > 1 ? remote : ['Any', 'On-site', 'Hybrid', 'Remote'],
    seniority: seniority.length > 1 ? seniority : STATIC_OPTIONS.seniority,
    sector: sector.length > 1 ? sector : STATIC_OPTIONS.sector,
    stage: stage.length > 1 ? stage : STATIC_OPTIONS.stage,
  };
}

function uniqueValues<T>(jobs: T[], extract: (j: T) => string | undefined): string[] {
  const set = new Set<string>();
  for (const j of jobs) {
    const v = extract(j);
    if (v && v.trim()) set.add(v);
  }
  return ['Any', ...Array.from(set).sort()];
}

function normaliseRemote(s: string): string {
  const lower = s.toLowerCase();
  if (lower.includes('hybrid')) return 'Hybrid';
  if (lower.includes('remote')) return 'Remote';
  if (lower.includes('on-site') || lower.includes('onsite')) return 'On-site';
  return s;
}

const FILTER_DEFS: { key: keyof JobFilters; label: string }[] = [
  { key: 'location', label: 'Location' },
  { key: 'salary', label: 'Salary' },
  { key: 'seniority', label: 'Seniority' },
  { key: 'sector', label: 'Sector' },
  { key: 'stage', label: 'Company stage' },
  { key: 'remote', label: 'Remote' },
];

export default function FilterRow() {
  const filters = useAppStore((s) => s.jobsFilters);
  const setFilter = useAppStore((s) => s.setJobsFilter);
  const resetFilters = useAppStore((s) => s.resetJobsFilters);
  const jobs = useAppStore((s) => s.jobs);
  const toast = useToast();

  // Dropdowns reflect what's actually in the loaded job set —
  // re-computed when the user syncs new sources.
  const FILTER_OPTIONS = useMemo(() => deriveOptions(jobs), [jobs]);

  const [moreOpen, setMoreOpen] = useState(false);
  const [employmentType, setEmploymentType] = useState('Any');
  const [postedWithin, setPostedWithin] = useState('Any');
  const [excludeKeywords, setExcludeKeywords] = useState('');

  return (
    <div className="filter-row">
      {FILTER_DEFS.map((def) => (
        <FilterChip
          key={def.key}
          label={def.label}
          value={filters[def.key]}
          options={FILTER_OPTIONS[def.key]}
          onChange={(v) => setFilter(def.key, v)}
        />
      ))}
      <button
        type="button"
        className="filter-chip filter-chip--more"
        onClick={() => setMoreOpen(true)}
      >
        <SlidersHorizontal size={16} className="filter-chip__more-icon" />
        <span className="filter-chip__more-label">More filters</span>
      </button>

      <Modal
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        size="lg"
        ariaLabel="More filters"
      >
        <ModalHeader title="More filters" onClose={() => setMoreOpen(false)} />
        <ModalBody>
          <div className="ds-filters-grid">
            {FILTER_DEFS.map((def) => (
              <SelectRow
                key={def.key}
                label={def.label}
                value={filters[def.key]}
                options={FILTER_OPTIONS[def.key]}
                onChange={(v) => setFilter(def.key, v)}
              />
            ))}
            <SelectRow
              label="Employment type"
              value={employmentType}
              options={['Any', 'Full-time', 'Part-time', 'Contract', 'Internship']}
              onChange={setEmploymentType}
            />
            <SelectRow
              label="Posted within"
              value={postedWithin}
              options={['Any', '24 hours', '7 days', '30 days']}
              onChange={setPostedWithin}
            />
          </div>
          <label className="ds-form-row" style={{ marginTop: 14 }}>
            <span className="ds-form-label">Exclude keywords</span>
            <input
              className="ds-input"
              value={excludeKeywords}
              onChange={(e) => setExcludeKeywords(e.target.value)}
              placeholder="e.g. junior, intern"
            />
          </label>
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            className="ds-btn ds-btn--secondary"
            onClick={() => {
              resetFilters();
              setEmploymentType('Any');
              setPostedWithin('Any');
              setExcludeKeywords('');
              toast.info('Filters reset');
            }}
          >
            Reset
          </button>
          <button
            type="button"
            className="ds-btn ds-btn--primary"
            onClick={() => {
              setMoreOpen(false);
              toast.success('Filters applied');
            }}
          >
            Apply filters
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="ds-form-row">
      <span className="ds-form-label">{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="ds-select-trigger">
            <span>{value}</span>
            <ChevronDown size={14} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {options.map((opt) => (
            <DropdownMenuItem key={opt} onSelect={() => onChange(opt)}>
              {opt}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </label>
  );
}
