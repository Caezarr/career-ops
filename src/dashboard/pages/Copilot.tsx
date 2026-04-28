import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import InterviewInProgress from '../components/copilot/InterviewInProgress';
import NextUpCard from '../components/copilot/NextUpCard';
import PrepStreakCard from '../components/copilot/PrepStreakCard';
import RecentActivity from '../components/copilot/RecentActivity';
import EmbeddedCopilotPanel from '../components/copilot/EmbeddedCopilotPanel';

export default function Copilot() {
  return (
    <div className="dashboard dashboard--copilot">
      <Sidebar />

      <main className="dashboard__main">
        <TopBar />
        <div className="dashboard__main-scroll">
          <div className="copilot-page">
            <span className="copilot-page__breadcrumb">Prep</span>

            <div className="copilot-page__grid">
              <div className="copilot-page__left">
                <InterviewInProgress />
                <div className="copilot-summary-row">
                  <NextUpCard />
                  <PrepStreakCard />
                </div>
                <RecentActivity />
              </div>

              <div className="copilot-page__right">
                <EmbeddedCopilotPanel />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
