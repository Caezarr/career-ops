import { useState } from 'react';
import {
  Crown,
  ExternalLink,
  Check,
  ShieldCheck,
  Sparkles,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useAppStore } from '../../store';
import { useBillingUsage, type UsageRow } from '../../hooks/useBillingUsage';
import { PLAN_PRICING, type Plan } from '../../store/slices/billing';
import { useToast } from '../../primitives';
import { startCheckout, requestRefund, BillingError } from '../../lib/billing';

/** What each plan unlocks. Kept in the component (not the slice) because
 *  this is presentation copy — moving it into the slice would couple the
 *  state shape to marketing rewrites. */
const PLAN_PERKS: Record<Plan, string[]> = {
  free: [
    'Suivi local de tes candidatures (jusqu\'à 25)',
    '3 variantes de CV · 10 analyses ATS · 5 optimisations',
    'Live Copilot — 30 min/mois',
    'Données 100% locales',
  ],
  lifetime: [
    'Career OS complet, sans limites',
    'CVs, candidatures, analyses ATS et optimisations illimitées',
    'Live Copilot — minutes illimitées',
    'Mises à jour à vie',
    'Paiement unique, sans abonnement',
  ],
  lifetime_pro: [
    'Tout ce qui est dans Lifetime',
    'Garantie résultat 180 jours',
    'Aucun entretien décroché → remboursement intégral',
    'Conditions : ≥30 candidatures suivies, 0 entretien décroché',
  ],
};

function formatDate(unixMs: number | null): string | null {
  if (unixMs === null) return null;
  return new Date(unixMs).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function BillingCard() {
  const plan = useAppStore((s) => s.plan);
  const purchasedAt = useAppStore((s) => s.purchasedAt);
  const refundDeadlineAt = useAppStore((s) => s.refundDeadlineAt);
  const hasGuarantee = useAppStore((s) => s.hasGuarantee);
  const refundRequestedAt = useAppStore((s) => s.refundRequestedAt);
  const refundedAt = useAppStore((s) => s.refundedAt);
  const usage = useBillingUsage();
  const toast = useToast();

  const [checkoutLoading, setCheckoutLoading] = useState<Plan | null>(null);
  const [refundLoading, setRefundLoading] = useState(false);

  const isPaid = plan !== 'free';
  const currentPricing = PLAN_PRICING[plan];
  const purchasedAtStr = formatDate(purchasedAt);
  const refundDeadlineStr = formatDate(refundDeadlineAt);
  const guaranteeActive =
    hasGuarantee &&
    refundDeadlineAt !== null &&
    refundDeadlineAt > Date.now() &&
    refundRequestedAt === null &&
    refundedAt === null;

  async function handleUpgrade(target: Plan) {
    if (target === 'free' || target === plan) return;
    setCheckoutLoading(target);
    try {
      await startCheckout(target as 'lifetime' | 'lifetime_pro');
      toast.info(
        'Checkout ouvert',
        'Finalise le paiement dans ton navigateur. Tu reviens automatiquement ici une fois validé.',
      );
    } catch (err) {
      if (err instanceof BillingError) {
        toast.error('Paiement impossible', err.message);
      } else {
        toast.error(
          'Paiement impossible',
          (err as Error).message ?? 'Erreur inconnue',
        );
      }
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function handleRefund() {
    if (!guaranteeActive || refundLoading) return;
    if (
      !window.confirm(
        'Demander un remboursement intégral ? Conditions : ≥30 candidatures suivies dans Career OS et 0 entretien décroché. Ta demande est revue manuellement sous 14 jours.',
      )
    ) {
      return;
    }
    setRefundLoading(true);
    try {
      await requestRefund();
      toast.success(
        'Demande de remboursement enregistrée',
        'On revient vers toi sous 14 jours via gabranpro@gmail.com.',
      );
    } catch (err) {
      if (err instanceof BillingError) {
        toast.error('Demande impossible', err.message);
      } else {
        toast.error(
          'Demande impossible',
          (err as Error).message ?? 'Erreur inconnue',
        );
      }
    } finally {
      setRefundLoading(false);
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
              <span className="settings-billing__eyebrow">Plan actuel</span>
              <span className="settings-billing__plan">{currentPricing.label}</span>
              {currentPricing.hasGuarantee && (
                <span
                  className="settings-billing__cycle"
                  title="Inclut la garantie résultat 180 jours"
                >
                  <ShieldCheck size={11} style={{ marginRight: 3, marginBottom: -1 }} />
                  Garantie
                </span>
              )}
            </div>
            <p className="settings-billing__tagline">{currentPricing.tagline}</p>
          </div>
        </div>

        <div className="settings-billing__renewal">
          {isPaid && purchasedAtStr ? (
            <>
              <span className="settings-billing__eyebrow">Acheté le</span>
              <div className="settings-billing__renewal-row">
                <span className="settings-billing__date">{purchasedAtStr}</span>
              </div>
              {refundDeadlineStr && (
                <span
                  className="settings-billing__usage-note"
                  style={{ marginTop: 4, display: 'block' }}
                >
                  Garantie active jusqu'au {refundDeadlineStr}
                </span>
              )}
            </>
          ) : (
            <>
              <span className="settings-billing__eyebrow">Statut</span>
              <div className="settings-billing__renewal-row">
                <span className="settings-billing__date">Bêta gratuite</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Refund states (only when on Pro) ──────────────────────── */}
      {refundedAt !== null && (
        <div
          className="settings-billing__usage-block"
          style={{
            padding: '12px 16px',
            background: 'var(--bg-soft, rgba(0,0,0,0.04))',
            borderRadius: 12,
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Check size={16} />
          <span>
            Remboursement effectué le {formatDate(refundedAt)}. À bientôt.
          </span>
        </div>
      )}
      {refundedAt === null && refundRequestedAt !== null && (
        <div
          className="settings-billing__usage-block"
          style={{
            padding: '12px 16px',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.32)',
            borderRadius: 12,
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <AlertCircle size={16} />
          <span>
            Demande de remboursement enregistrée le{' '}
            {formatDate(refundRequestedAt)}. Réponse sous 14 jours par mail.
          </span>
        </div>
      )}

      {/* ── Live usage rows ───────────────────────────────────────── */}
      <div className="settings-billing__usage-block">
        <div className="settings-billing__usage-header">
          <span className="settings-billing__eyebrow">Aperçu de l'usage</span>
          <span className="settings-billing__usage-note">
            Compteurs basés sur tes données locales sur cet appareil.
          </span>
        </div>
        <div className="settings-billing__usage-grid">
          {usage.map((row) => (
            <UsageRowView key={row.id} row={row} />
          ))}
        </div>
      </div>

      {/* ── Plan comparison strip (Free / Lifetime / Lifetime + Garantie) ───── */}
      <div className="settings-billing__plans">
        <span className="settings-billing__eyebrow">Comparer les plans</span>
        <div className="settings-billing__plans-grid">
          {(Object.keys(PLAN_PRICING) as Plan[]).map((p) => {
            const isCurrent = p === plan;
            const pp = PLAN_PRICING[p];
            const loading = checkoutLoading === p;
            return (
              <div
                key={p}
                className={
                  'settings-billing__plan-card' +
                  (isCurrent ? ' settings-billing__plan-card--current' : '') +
                  (p === 'lifetime_pro' ? ' settings-billing__plan-card--featured' : '')
                }
              >
                <div className="settings-billing__plan-card-head">
                  <span className="settings-billing__plan-card-name">
                    {pp.label}
                    {isCurrent && (
                      <span className="settings-billing__plan-card-badge">
                        Actuel
                      </span>
                    )}
                    {p === 'lifetime_pro' && !isCurrent && (
                      <span
                        className="settings-billing__plan-card-badge settings-billing__plan-card-badge--accent"
                      >
                        Recommandé
                      </span>
                    )}
                  </span>
                  <span className="settings-billing__plan-card-price">
                    {pp.priceEur === 0 ? 'Gratuit' : `${pp.priceEur}€`}
                    {pp.priceEur > 0 && (
                      <span className="settings-billing__plan-card-price-suffix">
                        {' '}paiement unique
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

                {/* CTA per card */}
                {isCurrent && p !== 'free' && guaranteeActive && (
                  <button
                    type="button"
                    className="settings-btn settings-btn--outline"
                    onClick={handleRefund}
                    disabled={refundLoading}
                  >
                    {refundLoading ? (
                      <>
                        <Loader2 size={13} className="settings-danger-modal__spin" />
                        <span style={{ marginLeft: 6 }}>Envoi…</span>
                      </>
                    ) : (
                      <span>Demander un remboursement</span>
                    )}
                  </button>
                )}
                {/* Upgrade CTA — rendered only when the user is on a
                    free plan AND this card isn't their current one.
                    Once paid, the buttons disappear entirely (not just
                    disabled) so there's zero risk of a double-charge. */}
                {!isCurrent && p !== 'free' && !isPaid && (
                  <button
                    type="button"
                    className="ds-btn ds-btn--primary"
                    onClick={() => handleUpgrade(p)}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={13} className="settings-danger-modal__spin" />
                        <span style={{ marginLeft: 6 }}>Ouverture…</span>
                      </>
                    ) : (
                      <>
                        {p === 'lifetime_pro' ? (
                          <ShieldCheck size={13} />
                        ) : (
                          <Sparkles size={13} />
                        )}
                        <span style={{ marginLeft: 6 }}>
                          {p === 'lifetime_pro'
                            ? `Débloquer · ${pp.priceEur}€`
                            : `Acheter · ${pp.priceEur}€`}
                        </span>
                      </>
                    )}
                  </button>
                )}

                {/* Notes for the non-current, free card */}
                {!isCurrent && p === 'free' && (
                  <span className="settings-billing__plan-card-note">
                    Tier par défaut — aucun achat nécessaire.
                  </span>
                )}

                {/* When paid: every non-current card shows a neutral
                    note instead of an upgrade CTA. The user already
                    has lifetime access — there's nothing to upgrade. */}
                {!isCurrent && p !== 'free' && isPaid && (
                  <span className="settings-billing__plan-card-note">
                    {p === 'lifetime_pro'
                      ? 'Tu es déjà sur Lifetime — la garantie ne s\'achète pas séparément.'
                      : 'Tu as déjà l\'accès à vie.'}
                  </span>
                )}

                {/* Current-plan notes */}
                {isCurrent && p === 'free' && (
                  <span className="settings-billing__plan-card-note">
                    Tu es sur ce plan.
                  </span>
                )}
                {isCurrent && p !== 'free' && !guaranteeActive && (
                  <span className="settings-billing__plan-card-note">
                    Accès à vie actif.
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <p className="settings-billing__usage-note" style={{ marginTop: 12 }}>
          Paiement sécurisé via Stripe. Les conditions détaillées de la
          garantie résultat sont décrites dans nos{' '}
          <a
            href="https://careeros.fr/legal/cgu.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            CGU §7
          </a>
          .
        </p>
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

// Keep ExternalLink import alive — TypeScript would prune the import
// otherwise and break a future "Manage payment" CTA.
void ExternalLink;
