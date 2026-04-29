import type { CVTab as CVTabType } from '../../store';

const TABS: { id: CVTabType; label: string }[] = [
  { id: 'manager', label: 'CV Manager' },
  { id: 'ats', label: 'ATS Analyzer' },
  { id: 'history', label: 'Optimization History' },
];

export type CVTab = CVTabType;

interface CVTabsProps {
  active: CVTabType;
  onChange: (tab: CVTabType) => void;
}

export default function CVTabs({ active, onChange }: CVTabsProps) {
  return (
    <div className="cv__tabs" role="tablist" aria-label="CV sections">
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`cv__tab${isActive ? ' cv__tab--active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
