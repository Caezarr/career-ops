import ActivityItem from './ActivityItem';
import { mockRecentActivity } from '../../data/copilot';

export default function RecentActivity() {
  return (
    <section className="cp-recent-activity" aria-label="Recent activity">
      <h3 className="cp-recent-activity__title">Recent activity</h3>
      <div className="cp-recent-activity__list">
        {mockRecentActivity.map((item) => (
          <ActivityItem
            key={item.id}
            iconKey={item.iconKey}
            title={item.title}
            subtitle={item.subtitle}
            timestamp={item.timestamp}
          />
        ))}
      </div>
    </section>
  );
}
