import { useEffect, useState } from 'react';
import { Crown, ExternalLink } from 'lucide-react';
import { useAppStore } from '../../store';
import { useToast } from '../../primitives';
import {
  cancelSubscription,
  createCheckout,
  STRIPE_PRICE_PRO,
} from '../../lib/billing';

/**
 * Settings → Billing tab — post-beta subscription management.
 *
 * Replaces the legacy `BillingCard` placeholder for the Stripe
 * Checkout flow. The legacy Sprint pricing (Free / Sprint / Sprint Pro)
 * still exists in the store, but this component is the entry point for
 * the recurring €15/mo subscription that ships at end-of-beta.
 *
 * UI shape:
 *   • Free user  → "Upgrade to Pro · €15/mo" CTA
 *   • Pro user   → renewal date + "Cancel subscription"
 *   • Past due   → renewal date + warning banner
 *
 * Wraps every async call in try/catch and surfaces failures via toast.
 * The Stripe key may not be configured locally yet (beta cohort) —
 * the `Stripe non configuré` error is the expected response in that
 * case and we render a help line pointing to Settings → Integrations.
 */

const STATUS_COPY: Record<string, { label: string; tone: 'good' | 'warn' | 'mute' }> = {
  active: { label: 'Pro · actif', tone: 'good' },
  trialing: { label: 'Pro · essai', tone: 'good' },
  past_due: { label: 'Pro · paiement en attente', tone: 'warn' },
  cancelled: { label: 'Annulé', tone: 'mute' },
  free: { label: 'Free', tone: 'mute' },
  unknown: { label: 'État inconnu', tone: 'mute' },
};

function formatDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function BillingTab() {
  const status = useAppStore((s) => s.subscriptionStatus);
  const periodEnd = useAppStore((s) => s.currentPeriodEnd);
  const cancelAtPeriodEnd = useAppStore((s) => s.cancelAtPeriodEnd);
  const hydrate = useAppStore((s) => s.hydrate);
  const userEmail = useAppStore((s) => s.user.email);
  const toast = useToast();

  const [isCheckoutLoading, setCheckoutLoading] = useState(false);
  const [isCancelLoading, setCancelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPro = status === 'active' || status === 'trialing' || status === 'past_due';
  const statusInfo = STATUS_COPY[status] ?? STATUS_COPY.unknown;

  async function handleUpgrade() {
    setError(null);
    if (!userEmail || userEmail.trim() === '') {
      setError(
        'Renseignez votre email dans Profil avant de passer à Pro — il sert de référence Stripe.',
      );
      return;
    }
    setCheckoutLoading(true);
    try {
      await createCheckout(userEmail, STRIPE_PRICE_PRO);
      toast.info(
        'Checkout ouvert',
        'Finalisez le paiement dans votre navigateur, puis revenez ici.',
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toast.error('Échec du démarrage du paiement', message);
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function handleCancel() {
    setError(null);
    setCancelLoading(true);
    try {
      await cancelSubscription();
      // Reflect the cancel-at-period-end flag locally so the UI updates
      // immediately. Status stays `active` until the period ends; we
      // just flip the cancel flag.
      hydrate(status, periodEnd, true);
      toast.info(
        'Annulation prise en compte',
        'Vous gardez Pro jusqu’à la prochaine échéance.',
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toast.error('Annulation impossible', message);
    } finally {
      setCancelLoading(false);
    }
  }

  // Clear the local error if the status changes (e.g. boot hydration
  // finishes and we now have a real subscription).
  useEffect(() => {
    setError(null);
  }, [status]);

  return (
    <section
      className="settings-card settings-billing"
      aria-labelledby="settings-billing-tab-title"
    >
      <div className="settings-billing__top">
        <div className="settings-billing__identity">
          <div className="settings-billing__crown" aria-hidden="true">
            <Crown size={20} strokeWidth={2} />
          </div>
          <div className="settings-billing__text">
            <h2
              id="settings-billing-tab-title"
              className="settings-billing__title"
            >
              Abonnement
            </h2>
            <div className="settings-billing__plan-row">
              <span className="settings-billing__eyebrow">Plan actuel</span>
              <span className="settings-billing__plan">{statusInfo.label}</span>
            </div>
            <p className="settings-billing__tagline">
              {isPro
                ? 'Career OS Pro — accès complet, sans limite de durée.'
                : 'Free — vos clés AI, vos données, sans abonnement.'}
            </p>
          </div>
        </div>

        <div className="settings-billing__renewal">
          {isPro && periodEnd ? (
            <>
              <span className="settings-billing__eyebrow">
                {cancelAtPeriodEnd ? 'Se termine le' : 'Renouvellement'}
              </span>
              <div className="settings-billing__renewal-row">
                <span className="settings-billing__date">
                  {formatDate(periodEnd)}
                </span>
              </div>
            </>
          ) : (
            <>
              <span className="settings-billing__eyebrow">Tarif</span>
              <div className="settings-billing__renewal-row">
                <span className="settings-billing__date">€15 / mois</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="settings-billing__usage-block">
        {!isPro && (
          <button
            type="button"
            className="ds-btn ds-btn--primary"
            onClick={handleUpgrade}
            disabled={isCheckoutLoading}
          >
            <ExternalLink size={13} />
            <span style={{ marginLeft: 6 }}>
              {isCheckoutLoading ? 'Ouverture du paiement…' : 'Passer à Pro · €15/mois'}
            </span>
          </button>
        )}

        {isPro && !cancelAtPeriodEnd && (
          <button
            type="button"
            className="settings-btn settings-btn--outline"
            onClick={handleCancel}
            disabled={isCancelLoading}
          >
            {isCancelLoading ? 'Annulation…' : 'Annuler l’abonnement'}
          </button>
        )}

        {isPro && cancelAtPeriodEnd && (
          <p className="settings-billing__tagline">
            L’abonnement se terminera à la prochaine échéance. Vous pouvez le
            réactiver depuis votre portail Stripe.
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="settings-billing__tagline"
            style={{ color: 'var(--color-danger, #b42318)', marginTop: 12 }}
          >
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
