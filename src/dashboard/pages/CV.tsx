import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import CVHeader from '../components/cv/CVHeader';
import CVStats from '../components/cv/CVStats';
import CVTabs, { type CVTab } from '../components/cv/CVTabs';
import CVManagerView from '../components/cv/CVManagerView';
import CVRightPanel from '../components/cv/CVRightPanel';

export default function CV() {
  const [activeTab, setActiveTab] = useState<CVTab>('CV Manager');

  return (
    <div className="dashboard dashboard--cv">
      <Sidebar />

      <main className="dashboard__main">
        <TopBar />
        <div className="dashboard__main-scroll">
          <div className="cv-page">
            <CVHeader />
            <CVStats />
            <CVTabs active={activeTab} onChange={setActiveTab} />
            {activeTab === 'CV Manager' && <CVManagerView />}
            {activeTab !== 'CV Manager' && (
              <div className="cv-page__placeholder" aria-live="polite" />
            )}
          </div>
        </div>
      </main>

      <aside className="right-panel right-panel--cv" aria-label="CV preview and analysis">
        <CVRightPanel />
      </aside>
    </div>
  );
}
