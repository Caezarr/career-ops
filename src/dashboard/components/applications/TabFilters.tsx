import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const TABS = ['All', 'Active', 'Interviews', 'Archived'] as const;
type Tab = (typeof TABS)[number];

export default function TabFilters() {
  const [active, setActive] = useState<Tab>('All');

  return (
    <div className="applications__filters">
      <div className="applications__tabs" role="tablist" aria-label="Application status">
        {TABS.map((tab) => {
          const isActive = active === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`applications__tab${isActive ? ' applications__tab--active' : ''}`}
              onClick={() => setActive(tab)}
            >
              {tab}
            </button>
          );
        })}
      </div>

      <div className="applications__dropdowns">
        <button type="button" className="applications__dropdown applications__dropdown--narrow">
          <span>All roles</span>
          <ChevronDown size={16} className="applications__dropdown-icon" />
        </button>
        <button type="button" className="applications__dropdown applications__dropdown--wide">
          <span>Sort: Last activity</span>
          <ChevronDown size={16} className="applications__dropdown-icon" />
        </button>
      </div>
    </div>
  );
}
