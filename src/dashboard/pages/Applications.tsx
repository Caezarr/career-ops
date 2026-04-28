import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import ApplicationsHeader from '../components/applications/ApplicationsHeader';
import ApplicationsStats from '../components/applications/ApplicationsStats';
import TabFilters from '../components/applications/TabFilters';
import ApplicationsTable from '../components/applications/ApplicationsTable';
import ApplicationDetail from '../components/applications/ApplicationDetail';

export default function Applications() {
  return (
    <div className="dashboard dashboard--applications">
      <Sidebar />

      <main className="dashboard__main">
        <TopBar />
        <div className="dashboard__main-scroll">
          <div className="applications">
            <ApplicationsHeader />
            <ApplicationsStats />
            <TabFilters />
            <ApplicationsTable />
          </div>
        </div>
      </main>

      <aside className="right-panel right-panel--applications" aria-label="Application detail">
        <ApplicationDetail />
      </aside>
    </div>
  );
}
