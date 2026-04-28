const TABS = ['CV Manager', 'ATS Analyzer', 'Optimization History'] as const;
export type CVTab = (typeof TABS)[number];

interface CVTabsProps {
  active: CVTab;
  onChange: (tab: CVTab) => void;
}

export default function CVTabs({ active, onChange }: CVTabsProps) {
  return (
    <div className="cv__tabs" role="tablist" aria-label="CV sections">
      {TABS.map((tab) => {
        const isActive = active === tab;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`cv__tab${isActive ? ' cv__tab--active' : ''}`}
            onClick={() => onChange(tab)}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}
