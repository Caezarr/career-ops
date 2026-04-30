import { Crown, ExternalLink } from 'lucide-react';
import { useAppStore } from '../../store';
import { useBillingUsage, type UsageRow } from '../../hooks/useBillingUsage';
import { useToast } from '../../primitives';
import { openCustomerPortal } from '../../lib/stripe';

/** Friendly plan label — keeps the data layer's enum stable while we
 *  display something more readable. Pricing is intentionally NOT shown
 *  here: it isn't finalised yet, and we'd rather omit it than ship
 *  numbers that are about to change. */
const PLAN_LABEL: Record<string, string> = {
  free: 'Local',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const PLAN_TAGLINE: Record<string, string> = {
  free: 'You bring your own AI keys; everything stays on this device.',
  pro: 'Hosted AI quota and higher limits.',
  enterprise: 'Custom contract — talk to us.',
};

export default function BillingCard() {
  const plan = useAppStore((s) => s.plan);
  const cycle = useAppStore((s) => s.cycle);
  const currentPeriodEnd = useAppStore((s) => s.currentPeriodEnd);
  const usage = useBillingUsage();
  const toast = useToast();

  const isPaid = plan !== 'free';
  const renewalDate =
    currentPeriodEnd != null
      ? new Date(currentPeriodEnd * 1000).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : null;

  async function handleManage() {
    try {
      await openCustomerPortal();
    } catch {
      toast.info(
        'Billing portal coming soon',
        'Self-serve plan changes unlock once the back-end ships.',
      );
    }
  }

  return (
    <section
      className="settings-card settings-billing"
      aria-labelledby="settings-billing-title"
    >
      {/* ── Hero: current plan badge + status ─────────────────────── */}
      <div className="settings-billing__top">
        <div className="settings-billing__identity">
          <div className="settings-billing__crown" aria-hidden="true">
            <Crown size={20} strokeWidth={2} />
          </div>
          <div className="settings-billing__text">
            <h2 id="settings-billing-title" className="settings-billing__title">
              Plan &amp; usage
            </h2>
            <div className="settings-billing__plan-row">
              <span className="settings-billing__eyebrow">Current plan</span>
              <span className="settings-billing__plan">
                {PLAN_LABEL[plan] ?? plan}
              </span>
              {isPaid && (
                <span className="settings-billing__cycle">
                  {cycle === 'annual' ? 'Annual' : 'Monthly'}
                </span>
              )}
            </div>
            <p className="settings-billing__tagline">
              {PLAN_TAGLINE[plan] ?? ''}
            </p>
          </div>
        </div>

        <div className="settings-billing__renewal">
          {renewalDate ? (
            <>
              <span className="settings-billing__eyebrow">Next renewal</span>
              <div className="settings-billing__renewal-row">
                <span className="settings-billing__date">{renewalDate}</span>
              </div>
            </>
          ) : (
            <>
              <span className="settings-billing__eyebrow">Status</span>
              <div className="settings-billing__renewal-row">
                <span className="settings-billing__date">No subscription</span>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          className="settings-btn settings-btn--outline"
          onClick={handleManage}
        >
          <ExternalLink size={13} />
          <span>{isPaid ? 'Manage billing' : 'Billing portal'}</span>
        </button>
      </div>

      {/* ── Live usage rows ───────────────────────────────────────── */}
      <div className="settings-billing__usage-block">
        <div className="settings-billing__usage-header">
          <span className="settings-billing__eyebrow">Usage overview</span>
          <span className="settings-billing__usage-note">
            Counters reflect what's stored locally on this device.
          </span>
        </div>
        <div className="settings-billing__usage-grid">
          {usage.map((row) => (
            <UsageRowView key={row.id} row={row} />
          ))}
        </div>
      </div>
    </section>
  );
}

function UsageRowView({ row }: { row: UsageRow }) {
  const limit = row.limit;
  const isUnlimited = !Number.isFinite(limit);
  const pct = isUnlimited
    ? 0
    : Math.min(1, limit === 0 ? 0 : row.current / limit);
  const overLimit = !isUnlimited && row.current > limit;

  return (
    <div className="settings-billing__usage-row" title={row.hint}>
      <div className="settings-billing__usage-row-top">
        <span className="settings-billing__usage-label">{row.label}</span>
        <span
          className={
            'settings-billing__usage-count' +
            (overLimit ? ' settings-billing__usage-count--over' : '')
          }
        >
          {row.current}
          <span className="settings-billing__usage-sep">/</span>
          <span className="settings-billing__usage-limit">
            {isUnlimited ? '∞' : limit}
          </span>
        </span>
      </div>
      <div className="settings-billing__usage-track" aria-hidden="true">
        <div
          className={
            'settings-billing__usage-fill' +
            (overLimit ? ' settings-billing__usage-fill--over' : '')
          }
          style={{
            width: isUnlimited
              ? '100%'
              : `${Math.min(100, Math.round(pct * 100))}%`,
            opacity: isUnlimited ? 0.18 : 1,
          }}
        />
      </div>
    </div>
  );
}
