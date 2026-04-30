import { Crown, ExternalLink, Check, ShieldCheck, Sparkles } from 'lucide-react';
import { useAppStore } from '../../store';
import { useBillingUsage, type UsageRow } from '../../hooks/useBillingUsage';
import { PLAN_PRICING, type BillingPlan } from '../../store/slices/billing';
import { useToast } from '../../primitives';
import { openCustomerPortal, startCheckout } from '../../lib/stripe';

/** What each plan unlocks. Kept in the component (not the slice) because
 *  this is presentation copy — moving it into the slice would couple the
 *  state shape to marketing rewrites. */
const PLAN_PERKS: Record<BillingPlan, string[]> = {
  free: [
    'Bring-your-own Anthropic / OpenAI keys',
    'Local CV manager + ATS analysis',
    '3 CV variants · 10 ATS analyses · 5 optimizations',
    'Live Copilot — 30 minutes / month',
  ],
  sprint: [
    'Hosted AI quota (no API key juggling)',
    'Unlimited CVs, applications, ATS analyses, optimizations',
    'Live Copilot — 20 hours over the Sprint',
    'Priority response on the Anthropic side',
  ],
  sprint_pro: [
    'Everything in Sprint',
    'Offer-or-refund guarantee (€49 add-on)',
    'White-glove onboarding call',
    'Direct line to the team during the Sprint',
  ],
};

export default function BillingCard() {
  const plan = useAppStore((s) => s.plan);
  const sprintEndsAt = useAppStore((s) => s.sprintEndsAt);
  const usage = useBillingUsage();
  const toast = useToast();

  const isPaid = plan !== 'free';
  const sprintEndDate =
    sprintEndsAt != null
      ? new Date(sprintEndsAt * 1000).toLocaleDateString(undefined, {
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
        'Receipts and payment methods unlock once the back-end ships.',
      );
    }
  }

  async function handleUpgrade(target: BillingPlan) {
    if (target === 'free') return;
    try {
      await startCheckout(target);
    } catch {
      toast.info(
        'Checkout coming soon',
        'Sprint purchase opens once the Stripe back-end is live.',
      );
    }
  }

  const currentPricing = PLAN_PRICING[plan];

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
              <span className="settings-billing__plan">{currentPricing.label}</span>
              {currentPricing.hasGuarantee && (
                <span
                  className="settings-billing__cycle"
                  title="Includes the offer-or-refund guarantee"
                >
                  <ShieldCheck size={11} style={{ marginRight: 3, marginBottom: -1 }} />
                  Guarantee
                </span>
              )}
            </div>
            <p className="settings-billing__tagline">{currentPricing.tagline}</p>
          </div>
        </div>

        <div className="settings-billing__renewal">
          {sprintEndDate ? (
            <>
              <span className="settings-billing__eyebrow">Sprint ends</span>
              <div className="settings-billing__renewal-row">
                <span className="settings-billing__date">{sprintEndDate}</span>
              </div>
            </>
          ) : (
            <>
              <span className="settings-billing__eyebrow">Status</span>
              <div className="settings-billing__renewal-row">
                <span className="settings-billing__date">
                  {isPaid ? 'Active' : 'No active Sprint'}
                </span>
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
          <span>{isPaid ? 'Manage payment' : 'Receipts & invoices'}</span>
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

      {/* ── Plan comparison strip (Free / Sprint / Sprint Pro) ───── */}
      <div className="settings-billing__plans">
        <span className="settings-billing__eyebrow">Compare plans</span>
        <div className="settings-billing__plans-grid">
          {(Object.keys(PLAN_PRICING) as BillingPlan[]).map((p) => {
            const isCurrent = p === plan;
            const pp = PLAN_PRICING[p];
            return (
              <div
                key={p}
                className={
                  'settings-billing__plan-card' +
                  (isCurrent ? ' settings-billing__plan-card--current' : '') +
                  (p === 'sprint_pro' ? ' settings-billing__plan-card--featured' : '')
                }
              >
                <div className="settings-billing__plan-card-head">
                  <span className="settings-billing__plan-card-name">
                    {pp.label}
                    {isCurrent && (
                      <span className="settings-billing__plan-card-badge">
                        Current
                      </span>
                    )}
                    {p === 'sprint_pro' && !isCurrent && (
                      <span
                        className="settings-billing__plan-card-badge settings-billing__plan-card-badge--accent"
                      >
                        Best value
                      </span>
                    )}
                  </span>
                  <span className="settings-billing__plan-card-price">
                    {pp.priceEur === 0 ? 'Free' : `€${pp.priceEur}`}
                    {pp.priceEur > 0 && (
                      <span className="settings-billing__plan-card-price-suffix">
                        {' '}one-time
                      </span>
                    )}
                  </span>
                  {pp.priceBreakdown && (
                    <span className="settings-billing__plan-card-breakdown">
                      {pp.priceBreakdown}
                    </span>
                  )}
                  <span className="settings-billing__plan-card-tagline">
                    {pp.tagline}
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
                {!isCurrent && p !== 'free' && (
                  <button
                    type="button"
                    className="ds-btn ds-btn--primary"
                    onClick={() => handleUpgrade(p)}
                  >
                    <Sparkles size={13} />
                    <span style={{ marginLeft: 6 }}>
                      {p === 'sprint_pro' ? 'Buy Sprint Pro' : 'Buy Sprint'}
                    </span>
                  </button>
                )}
                {!isCurrent && p === 'free' && (
                  <span className="settings-billing__plan-card-note">
                    Default tier — no purchase needed.
                  </span>
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
