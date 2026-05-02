import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import PrepHeader from '../components/prep/PrepHeader';
import PrepSearchRow from '../components/prep/PrepSearchRow';
import QuestionBank from '../components/prep/QuestionBank';
import RecommendedDrills from '../components/prep/RecommendedDrills';
import MockInterview from '../components/prep/MockInterview';
import ProgressCard from '../components/prep/ProgressCard';
import TodaysPlanCard from '../components/prep/TodaysPlanCard';
import AIInsightsCard from '../components/prep/AIInsightsCard';
import { useAdaptivePrepTrack } from '../hooks/useAdaptivePrepTrack';

export default function Prep() {
  // Mount the adaptive-track hook ONCE at the page root. It watches
  // workspaceJobId / selectedJobId / most-recent application and
  // sets prepActiveTrack to match the candidate's current candidacy.
  // The user can override by clicking another track tab; the
  // override sticks until the focused job changes.
  useAdaptivePrepTrack();

  return (
    <div className="dashboard dashboard--prep">
      <Sidebar />
      <TopBar />

      <main className="dashboard__main">
        <div className="dashboard__main-scroll">
          <div className="prep-page">
            <PrepHeader />
            <PrepSearchRow />

            <div className="prep-grid">
              <div className="prep-col prep-col--left">
                <QuestionBank />
                <RecommendedDrills />
              </div>

              <div className="prep-col prep-col--center">
                <MockInterview />
              </div>

              <div className="prep-col prep-col--right">
                <ProgressCard />
                <TodaysPlanCard />
                <AIInsightsCard />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
