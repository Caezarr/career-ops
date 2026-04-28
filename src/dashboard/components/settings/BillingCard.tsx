import { Crown } from 'lucide-react';
import UsageBar from './UsageBar';
import { mockBilling } from '../../data/settings';

export default function BillingCard() {
  return (
    <section
      className="settings-card settings-billing"
      aria-labelledby="settings-billing-title"
    >
      <div className="settings-billing__top">
        <div className="settings-billing__identity">
          <div className="settings-billing__crown" aria-hidden="true">
            <Crown size={20} strokeWidth={2} />
          </div>
          <div className="settings-billing__text">
            <h2 id="settings-billing-title" className="settings-billing__title">
              Billing
            </h2>
            <div className="settings-billing__plan-row">
              <span className="settings-billing__eyebrow">Current plan</span>
              <span className="settings-billing__plan">{mockBilling.plan}</span>
              <span className="settings-billing__cycle">{mockBilling.cycle}</span>
            </div>
          </div>
        </div>

        <div className="settings-billing__renewal">
          <span className="settings-billing__eyebrow">Next renewal</span>
          <div className="settings-billing__renewal-row">
            <span className="settings-billing__date">{mockBilling.nextRenewal}</span>
            <span className="settings-billing__until">
              (in {mockBilling.daysUntilRenewal} days)
            </span>
          </div>
        </div>

        <button type="button" className="settings-btn settings-btn--outline">
          Manage billing
        </button>
      </div>

      <div className="settings-billing__usage">
        <div className="settings-billing__usage-grid">
          {mockBilling.usage.map((usage, idx) => (
            <UsageBar
              key={usage.id}
              title={usage.title}
              current={usage.current}
              max={usage.max}
              eyebrow={idx === 0 ? 'Usage overview' : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
