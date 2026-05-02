import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import StatsRow from '../components/StatsRow';
import Pipeline from '../components/Pipeline';
import TodayTasks from '../components/TodayTasks';
import InsightCard from '../components/InsightCard';
import TodaysFocusCard from '../components/TodaysFocusCard';
import { useAppStore } from '../store';

/** Time-of-day-aware greeting. We bucket the day into morning (4-12),
 *  afternoon (12-18), evening (18-22), and a single "night" tier for
 *  late-night users — better than rolling back to "Good morning" at
 *  3am for someone still up. */
function timeOfDayGreeting(date: Date): string {
  const h = date.getHours();
  if (h >= 4 && h < 12) return 'Good morning';
  if (h >= 12 && h < 18) return 'Good afternoon';
  if (h >= 18 && h < 22) return 'Good evening';
  return 'Working late';
}

/** First name only — drops everything from the first space onward.
 *  Falls back to "there" when the user hasn't filled in a name yet
 *  so the greeting still reads naturally ("Good morning, there"). */
function firstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return 'there';
  return trimmed.split(/\s+/)[0];
}

export default function Dashboard() {
  const userName = useAppStore((s) => s.user.name);
  const now = new Date();
  const greeting = `${timeOfDayGreeting(now)}, ${firstName(userName)}`;
  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="dashboard">
      <Sidebar />
      <TopBar />

      <main className="dashboard__main">
        <div className="dashboard__main-scroll">
          <div className="dashboard__greeting">
            <h1 className="greeting__title">{greeting}</h1>
            <p className="greeting__date">{dateLabel}</p>
          </div>
          <TodaysFocusCard />
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
