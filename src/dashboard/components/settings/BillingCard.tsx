import { Crown, ExternalLink, Sparkles, Check } from 'lucide-react';
import { useAppStore } from '../../store';
import { useBillingUsage, type UsageRow } from '../../hooks/useBillingUsage';
import {
  PLAN_PRICING,
  PLAN_LIMITS,
  type BillingPlan,
} from '../../store/slices/billing';
import { useToast } from '../../primitives';
import { contactSales, openCustomerPortal, startCheckout } from '../../lib/stripe';

const PLAN_PERKS: Record<BillingPlan, string[]> = {
  free: [
    'Bring-your-own Anthropic / OpenAI keys',
    'Local CV manager + ATS analysis',
    '3 CV variants, 10 ATS analyses, 5 optimizations',
    'Live Copilot — 30 min / month',
  ],
  pro: [
    'Hosted AI quota (no API key juggling)',
    'Unlimited CV variants + applications',
    '200 ATS analyses, 100 optimizations',
    '600 Copilot minutes / month',
    'Priority support',
  ],
  enterprise: [
    'Custom contracts & invoicing',
    'SSO + audit log',
    'Unlimited everything',
    'Dedicated success engineer',
  ],
};

export default function BillingCard() {
  const plan = useAppStore((s) => s.plan);
  const cycle = useAppStore((s) => s.cycle);
  const currentPeriodEnd = useAppStore((s) => s.currentPeriodEnd);
  const usage = useBillingUsage();
  const toast = useToast();

  const pricing = PLAN_PRICING[plan];
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
        'Self-serve plan changes unlock once the Stripe back-end ships.',
      );
    }
  }

  async function handleUpgrade(target: BillingPlan) {
    try {
      if (target === 'enterprise') {
        await contactSales();
        return;
      }
      if (target === 'free') return;
      await startCheckout(target, cycle);
    } catch {
      toast.info('Checkout coming soon', 'Career OS is local-first today — no charges.');
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
              <span className="settings-billing__plan">{pricing.label}</span>
              {isPaid && (
                <span className="settings-billing__cycle">
                  {cycle === 'annual' ? 'Annual' : 'Monthly'}
                </span>
              )}
            </div>
            <p className="settings-billing__tagline">{pricing.tagline}</p>
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

      {/* ── Plan comparison strip (free / pro / enterprise) ───────── */}
      <div className="settings-billing__plans">
        <span className="settings-billing__eyebrow">Compare plans</span>
        <div className="settings-billing__plans-grid">
          {(Object.keys(PLAN_PRICING) as BillingPlan[]).map((p) => {
            const isCurrent = p === plan;
            const pp = PLAN_PRICING[p];
            const limits = PLAN_LIMITS[p];
            return (
              <div
                key={p}
                className={
                  'settings-billing__plan-card' +
                  (isCurrent ? ' settings-billing__plan-card--current' : '')
                }
              >
                <div className="settings-billing__plan-card-head">
                  <span className="settings-billing__plan-card-name">
                    {pp.label}
                    {isCurrent && (
                      <span className="settings-billing__plan-card-badge">Current</span>
                    )}
                  </span>
                  <span className="settings-billing__plan-card-price">
                    {pp.monthly === null
                      ? 'Custom'
                      : pp.monthly === 0
                      ? 'Free'
                      : `$${cycle === 'annual' ? Math.round((pp.annual ?? 0) / 12) : pp.monthly}/mo`}
                  </span>
                </div>
                <ul className="settings-billing__plan-perks">
                  {PLAN_PERKS[p].map((perk) => (
                    <li key={perk}>
                      <Check size={12} />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
                {!isCurrent && (
                  <button
                    type="button"
                    className={
                      'ds-btn ' +
                      (p === 'enterprise'
                        ? 'ds-btn--secondary'
                        : 'ds-btn--primary')
                    }
                    onClick={() => handleUpgrade(p)}
                    disabled={p === 'free'}
                  >
                    {p === 'enterprise' ? (
                      <>
                        <ExternalLink size={13} />
                        <span style={{ marginLeft: 6 }}>Talk to sales</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} />
                        <span style={{ marginLeft: 6 }}>Upgrade</span>
                      </>
                    )}
                  </button>
                )}
                {/* Free shows the limits compactly so the card is balanced. */}
                {p === 'free' && (
                  <div className="settings-billing__plan-limit-summary">
                    {limits.cvVariants}× CV ·{' '}
                    {limits.atsAnalysesLifetime} analyses
                  </div>
                )}
              </div>
            );
          })}
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
