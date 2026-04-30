import { useState, useMemo } from 'react';
import { ArrowRight, Calendar } from 'lucide-react';
import ScheduleModal from '../shared/ScheduleModal';
import { useAppStore } from '../../store';
import { useNavigation } from '../../navigation';

/** Resolve the most useful "Next up" surface from real persisted data:
 *
 *  1. Live application in the interview stage → we surface the
 *     job's company + role + next step.
 *  2. Undone task in today's plan → surface its title + duration.
 *  3. Otherwise an empty state pointing the user to scheduling.
 *
 *  This replaces the static "Technical case practice · Market sizing
 *  · in 45 min" mock that never reflected the user's real life. */
export default function NextUpCard() {
  const applications = useAppStore((s) => s.applications);
  const jobs = useAppStore((s) => s.jobs);
  const todaysPlan = useAppStore((s) => s.todaysPlan);
  const { navigate } = useNavigation();
  const [open, setOpen] = useState(false);

  const view = useMemo(() => {
    // Priority 1: an interview-stage application — the most
    // time-sensitive thing the user could prep for.
    const interview = applications.find(
      (a) =>
        !a.archived &&
        (a.stage === 'interview' || a.stage === 'phone_screen' || a.stage === 'offer'),
    );
    if (interview) {
      const job = jobs.find((j) => j.id === interview.jobId);
      return {
        eyebrow: 'Next interview',
        title: job ? `${job.company} · ${job.role}` : 'Upcoming interview',
        subtitle: interview.nextStep || 'Prepare your talking points',
        meta: interview.lastActivity || '',
        cta: 'View application',
        onCta: () => navigate('applications'),
      };
    }

    // Priority 2: today's plan task
    const nextTask = todaysPlan.find((t) => !t.done);
    if (nextTask) {
      return {
        eyebrow: 'Next up today',
        title: nextTask.title,
        subtitle: 'Today',
        meta: nextTask.duration,
        cta: 'View schedule',
        onCta: () => setOpen(true),
      };
    }

    // Priority 3: empty state
    return {
      eyebrow: 'Next up',
      title: 'Nothing scheduled',
      subtitle: 'Plan a prep session or apply to a new role',
      meta: '',
      cta: 'View schedule',
      onCta: () => setOpen(true),
    };
  }, [applications, jobs, todaysPlan, navigate]);

  return (
    <section className="cp-summary-card" aria-label="Next up">
      <span className="cp-summary-card__eyebrow">{view.eyebrow}</span>
      <span className="cp-summary-card__title">{view.title}</span>
      <span className="cp-summary-card__subtitle">{view.subtitle}</span>
      {view.meta && (
        <span className="cp-summary-card__meta">
          <Calendar size={11} strokeWidth={2} style={{ marginRight: 4, marginBottom: -1 }} />
          {view.meta}
        </span>
      )}
      <button
        type="button"
        className="cp-btn cp-btn--outlined cp-btn--block"
        onClick={view.onCta}
      >
        <span>{view.cta}</span>
        <ArrowRight size={13} strokeWidth={2} />
      </button>

      <ScheduleModal open={open} onClose={() => setOpen(false)} />
    </section>
  );
}
