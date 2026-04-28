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

export default function Prep() {
  return (
    <div className="dashboard dashboard--prep">
      <Sidebar />

      <main className="dashboard__main">
        <TopBar />
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
