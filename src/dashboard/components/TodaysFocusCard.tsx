import {
  Calendar,
  Phone,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Mic,
  ArrowRight,
} from 'lucide-react';
import { useNavigation } from '../navigation';
import { useAppStore } from '../store';
import { useTodaysFocus, type FocusKind } from '../hooks/useTodaysFocus';

const ICON_MAP: Record<FocusKind, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  'interview-soon': Calendar,
  'phone-screen-soon': Phone,
  'follow-up-overdue': Mail,
  'offer-pending': CheckCircle2,
  'task-due': Sparkles,
  'pipeline-empty': Mic,
  'streak-keep': AlertTriangle,
};

/**
 * Hero strip at the top of the dashboard. Picks the single most
 * urgent thing for the user to look at right now (resolved by
 * `useTodaysFocus`) and exposes a clear CTA. Hidden when the hook
 * returns null — better than rendering an empty card.
 *
 * The card occupies the full content width and sits above the
 * stats row, so the user's first eye-tracking landing on the
 * dashboard always hits "what should I do today?".
 */
export default function TodaysFocusCard() {
  const focus = useTodaysFocus();
  const { navigate } = useNavigation();
  const setSelectedApplication = useAppStore((s) => s.setSelectedApplication);

  if (!focus) return null;

  const Icon = ICON_MAP[focus.kind];

  function handleCta() {
    if (!focus) return;
    const target = focus.ctaTarget;
    // Pre-select the application before navigating so the right
    // panel opens straight to the relevant detail.
    if (target.page === 'applications' && target.applicationId) {
      setSelectedApplication(target.applicationId);
    }
    navigate(target.page);
  }

  return (
    <section
      className={`todays-focus todays-focus--${focus.tone}`}
      aria-label="Today's focus"
    >
      <div className={`todays-focus__icon todays-focus__icon--${focus.tone}`}>
        <Icon size={20} strokeWidth={2} />
      </div>
      <div className="todays-focus__text">
        <span className="todays-focus__eyebrow">Today's focus</span>
        <h2 className="todays-focus__title">{focus.title}</h2>
        <p className="todays-focus__subtitle">{focus.subtitle}</p>
      </div>
      <button
        type="button"
        className="todays-focus__cta"
        onClick={handleCta}
      >
        <span>{focus.ctaLabel}</span>
        <ArrowRight size={14} strokeWidth={2.4} />
      </button>
    </section>
  );
}
