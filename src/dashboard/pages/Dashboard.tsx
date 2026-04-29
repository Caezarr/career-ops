import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import StatsRow from '../components/StatsRow';
import Pipeline from '../components/Pipeline';
import TodayTasks from '../components/TodayTasks';
import InsightCard from '../components/InsightCard';
import { mockGreeting } from '../data/mock';

export default function Dashboard() {
  return (
    <div className="dashboard">
      <Sidebar />
      <TopBar />

      <main className="dashboard__main">
        <div className="dashboard__main-scroll">
          <div className="dashboard__greeting">
            <h1 className="greeting__title">{mockGreeting.greeting}</h1>
            <p className="greeting__date">{mockGreeting.date}</p>
          </div>
          <StatsRow />
          <Pipeline />
        </div>
      </main>

      <aside className="right-panel" aria-label="Side panel">
        <TodayTasks />
        <InsightCard />
      </aside>
    </div>
  );
}
