import { useState } from 'react';
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
import type { JobFilters } from '../../store';

const FILTER_OPTIONS: Record<keyof JobFilters, string[]> = {
  location: [
    'Any',
    'Paris, France',
    'London, UK',
    'Berlin, DE',
    'Remote (EU)',
  ],
  salary: [
    'Any',
    '€60k - €80k',
    '€80k - €120k',
    '€120k - €160k',
    '€160k+',
  ],
  seniority: ['Any', 'Junior', 'Mid', 'Senior', 'Staff', 'VP+'],
  sector: ['Any', 'Fintech', 'Health', 'AI/ML', 'Consulting', 'PE/VC'],
  stage: [
    'Any',
    'Pre-seed',
    'Series A',
    'Series B+',
    'Public',
  ],
  remote: ['Any', 'On-site', 'Hybrid', 'Remote', 'Hybrid + Remote'],
};

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
  const toast = useToast();

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
