import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import CVHeader from '../components/cv/CVHeader';
import CVStats from '../components/cv/CVStats';
import CVTabs from '../components/cv/CVTabs';
import CVManagerView from '../components/cv/CVManagerView';
import CVATSView from '../components/cv/CVATSView';
import CVHistoryView from '../components/cv/CVHistoryView';
import CVRightPanel from '../components/cv/CVRightPanel';
import { useAppStore } from '../store';

export default function CV() {
  const cvTab = useAppStore((s) => s.cvTab);
  const setCvTab = useAppStore((s) => s.setCvTab);

  // Right-panel preview is only meaningful in CV Manager (and as visual
  // context in Optimization History). The ATS Analyzer is a comparator
  // view that needs the full width, so we drop the preview there.
  const showRightPanel = cvTab !== 'ats';

  return (
    <div className={`dashboard dashboard--cv${showRightPanel ? '' : ' dashboard--cv-full'}`}>
      <Sidebar />
      <TopBar />

      <main className="dashboard__main">
        <div className="dashboard__main-scroll">
          <div className="cv-page">
            <CVHeader />
            <CVStats />
            <CVTabs active={cvTab} onChange={setCvTab} />
            {cvTab === 'manager' && <CVManagerView />}
            {cvTab === 'ats' && <CVATSView />}
            {cvTab === 'history' && <CVHistoryView />}
          </div>
        </div>
      </main>

      {showRightPanel && (
        <aside className="right-panel right-panel--cv" aria-label="CV preview and analysis">
          <CVRightPanel />
        </aside>
      )}
    </div>
  );
}
