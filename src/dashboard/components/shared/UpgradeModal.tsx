import { Lock, Sparkles, X, Check, ShieldCheck } from 'lucide-react';
import { useNavigation } from '../../navigation';
import '../../styles/paywall.css';

/**
 * Inline upgrade modal — surfaced when a user on Free clicks a
 * gated action (e.g. "Add CV" past the 3-variant cap, "Run ATS
 * analysis" past the 10-lifetime cap).
 *
 * Lives behind any context provider — render conditionally:
 *
 *   const [showUpgrade, setShowUpgrade] = useState(false);
 *   <button onClick={() => gate.canCreateCv ? createCv() : setShowUpgrade(true)} />
 *   {showUpgrade && <UpgradeModal feature="cv" onClose={…} />}
 *
 * Shows the two paid tiers (Lifetime / Lifetime + Garantie) so the
 * user can decide on the spot, then routes to Settings → Billing
 * for the actual checkout (single source of truth for payment UX).
 */
interface UpgradeModalProps {
  /** What was the user trying to do? Drives the copy. */
  feature:
    | 'cv'
    | 'application'
    | 'ats'
    | 'optimized'
    | 'copilot'
    | 'prep';
  /** Human-readable why-message. Goes under the title. */
  reason: string;
  onClose: () => void;
}

const FEATURE_TITLES: Record<UpgradeModalProps['feature'], string> = {
  cv: 'Limite Free atteinte — CV variantes',
  application: 'Limite Free atteinte — candidatures',
  ats: 'Limite Free atteinte — analyses ATS',
  optimized: 'Limite Free atteinte — CVs optimisés',
  copilot: 'Copilot — fonctionnalité Lifetime',
  prep: 'Prep — fonctionnalité Lifetime',
};

export default function UpgradeModal({
  feature,
  reason,
  onClose,
}: UpgradeModalProps) {
  const { navigate } = useNavigation();

  function handleUpgrade() {
    onClose();
    navigate('settings');
  }

  return (
    <div className="upgrade-modal" role="dialog" aria-modal="true">
      <div className="upgrade-modal__panel">
        <header className="upgrade-modal__header">
          <div className="upgrade-modal__icon" aria-hidden>
            <Lock size={18} />
          </div>
          <h2 className="upgrade-modal__title">{FEATURE_TITLES[feature]}</h2>
          <button
            type="button"
            className="upgrade-modal__close"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </header>

        <p className="upgrade-modal__body">{reason}</p>

        <div className="upgrade-modal__tiers">
          <div className="upgrade-modal__tier">
            <div className="upgrade-modal__tier-head">
              <span className="upgrade-modal__tier-name">Lifetime</span>
              <span className="upgrade-modal__tier-price">99€</span>
            </div>
            <ul className="upgrade-modal__tier-perks">
              <li><Check size={11} /> Tout débloqué, à vie</li>
              <li><Check size={11} /> Paiement unique, sans abonnement</li>
              <li><Check size={11} /> Mises à jour à vie</li>
            </ul>
          </div>
          <div className="upgrade-modal__tier upgrade-modal__tier--featured">
            <div className="upgrade-modal__tier-head">
              <span className="upgrade-modal__tier-name">
                Lifetime + Garantie
                <span className="upgrade-modal__tier-badge">Recommandé</span>
              </span>
              <span className="upgrade-modal__tier-price">149€</span>
            </div>
            <ul className="upgrade-modal__tier-perks">
              <li><Check size={11} /> Tout ce qui est dans Lifetime</li>
              <li>
                <ShieldCheck size={11} />
                Garantie résultat 180 jours
              </li>
              <li><Check size={11} /> 0 entretien décroché = remboursé</li>
            </ul>
          </div>
        </div>

        <div className="upgrade-modal__cta-row">
          <button
            type="button"
            className="ds-btn ds-btn--secondary"
            onClick={onClose}
          >
            Plus tard
          </button>
          <button
            type="button"
            className="ds-btn ds-btn--primary"
            onClick={handleUpgrade}
          >
            <Sparkles size={14} />
            <span style={{ marginLeft: 6 }}>Voir les plans</span>
          </button>
        </div>
      </div>
      {/* Backdrop click closes. */}
      <button
        type="button"
        className="upgrade-modal__backdrop"
        onClick={onClose}
        aria-label="Fermer la modale"
      />
    </div>
  );
}
