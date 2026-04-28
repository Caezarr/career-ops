import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import JobsHeader from '../components/jobs/JobsHeader';
import AISearchBar from '../components/jobs/AISearchBar';
import FilterRow from '../components/jobs/FilterRow';
import JobList from '../components/jobs/JobList';
import JobDetail from '../components/jobs/JobDetail';

export default function Jobs() {
  return (
    <div className="dashboard dashboard--full">
      <Sidebar />
      <main className="dashboard__main">
        <TopBar />
        <div className="dashboard__main-scroll">
          <div className="jobs">
            <JobsHeader />
            <AISearchBar />
            <FilterRow />
            <div className="jobs__split">
              <JobList />
              <JobDetail />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
