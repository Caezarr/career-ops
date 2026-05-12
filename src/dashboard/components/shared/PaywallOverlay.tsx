import { Lock, Sparkles } from 'lucide-react';
import { useNavigation } from '../../navigation';
import '../../styles/paywall.css';

/**
 * Hard paywall — wraps a child tree with a blurred backdrop and a
 * centered upgrade CTA when `blocked` is true.
 *
 * Used for page-level gating (Prep). For inline / per-button gating
 * use `useUpgradeNudge` + the `UpgradeModal` component instead.
 *
 * Renders the children behind the overlay so the user sees a preview
 * of what they're missing — Hormozi-style "show the value, then
 * collect". The preview is `aria-hidden` + `pointer-events: none` so
 * keyboard users can't tab into the blurred content.
 */
interface PaywallOverlayProps {
  blocked: boolean;
  feature: string;
  description: string;
  /** Optional override for the CTA label. Default: "Voir les plans". */
  ctaLabel?: string;
  children: React.ReactNode;
}

export default function PaywallOverlay({
  blocked,
  feature,
  description,
  ctaLabel = 'Voir les plans',
  children,
}: PaywallOverlayProps) {
  const { navigate } = useNavigation();

  if (!blocked) return <>{children}</>;

  return (
    <div className="paywall">
      {/* Preview — blurred & inert. */}
      <div className="paywall__preview" aria-hidden="true">
        {children}
      </div>

      {/* CTA card — centered, glass-styled. */}
      <div className="paywall__cta" role="dialog" aria-modal="true">
        <div className="paywall__cta-icon" aria-hidden="true">
          <Lock size={28} strokeWidth={1.8} />
        </div>
        <h2 className="paywall__cta-title">
          Débloquer {feature}
        </h2>
        <p className="paywall__cta-body">{description}</p>
        <button
          type="button"
          className="ds-btn ds-btn--primary paywall__cta-btn"
          onClick={() => navigate('settings')}
        >
          <Sparkles size={14} />
          <span style={{ marginLeft: 6 }}>{ctaLabel}</span>
        </button>
        <p className="paywall__cta-fineprint">
          Plan Lifetime à partir de <strong>99€</strong> · paiement unique.
        </p>
      </div>
    </div>
  );
}
