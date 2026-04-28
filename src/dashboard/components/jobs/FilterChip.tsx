import { ChevronDown } from 'lucide-react';

interface FilterChipProps {
  label: string;
  value: string;
}

export default function FilterChip({ label, value }: FilterChipProps) {
  return (
    <button type="button" className="filter-chip">
      <span className="filter-chip__col">
        <span className="filter-chip__label">{label}</span>
        <span className="filter-chip__value">{value}</span>
      </span>
      <ChevronDown size={16} className="filter-chip__chevron" />
    </button>
  );
}
