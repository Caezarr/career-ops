import { MessageCircle, MoreHorizontal } from 'lucide-react';
import CompanyAvatar from '../CompanyAvatar';
import MatchPill from '../jobs/MatchPill';
import StagePill from './StagePill';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  useConfirm,
  useToast,
} from '../../primitives';
import { useAppStore, type Application, type ApplicationStage } from '../../store';

interface ApplicationRowProps {
  app: Application;
  company: string;
  role: string;
  onOpenNotes: () => void;
}

const STAGE_LABEL: Record<ApplicationStage, string> = {
  sourced: 'Sourced',
  applied: 'Applied',
  phone_screen: 'Phone screen',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
};

export default function ApplicationRow({
  app,
  company,
  role,
  onOpenNotes,
}: ApplicationRowProps) {
  const toast = useToast();
  const confirm = useConfirm();

  const selectedId = useAppStore((s) => s.selectedApplicationId);
  const setSelected = useAppStore((s) => s.setSelectedApplication);
  const updateStage = useAppStore((s) => s.updateApplicationStage);
  const archive = useAppStore((s) => s.archiveApplication);
  const remove = useAppStore((s) => s.deleteApplication);
  const createApplication = useAppStore((s) => s.createApplication);

  const selected = selectedId === app.id;

  function handleStageChange(newStage: ApplicationStage) {
    updateStage(app.id, newStage);
    toast.success(`Moved to ${STAGE_LABEL[newStage]}`);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelected(app.id);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: 'Delete application?',
      description: `${company} · ${role}. This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    remove(app.id);
    toast.success('Application deleted');
  }

  return (
    <div
      className={`applications__row${selected ? ' applications__row--selected' : ''}`}
      role="row"
      tabIndex={0}
      onClick={() => setSelected(app.id)}
      onKeyDown={handleKey}
    >
      <div className="applications__cell applications__cell--company" role="cell">
        <CompanyAvatar company={company} size={28} />
        <span className="applications__company-name">{company || '—'}</span>
      </div>
      <div className="applications__cell applications__cell--role" role="cell">
        {role || '—'}
      </div>
      <div className="applications__cell" role="cell">
        <StagePill stage={app.stage} onChange={handleStageChange} />
      </div>
      <div className="applications__cell applications__cell--muted" role="cell">
        {app.appliedDate}
      </div>
      <div className="applications__cell applications__cell--muted" role="cell">
        {app.lastActivity}
      </div>
      <div className="applications__cell" role="cell">
        <MatchPill match={app.match} />
      </div>
      <div className="applications__cell applications__cell--next-step" role="cell">
        <button
          type="button"
          className="applications__next-step-link"
          onClick={(e) => {
            e.stopPropagation();
            onOpenNotes();
          }}
        >
          {app.nextStep || 'Add next step'}
        </button>
      </div>
      <div className="applications__cell applications__cell--actions" role="cell">
        <button
          type="button"
          className="applications__icon-btn"
          aria-label="Comments / notes"
          onClick={(e) => {
            e.stopPropagation();
            onOpenNotes();
          }}
        >
          <MessageCircle size={16} strokeWidth={2} />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="applications__icon-btn"
              aria-label="More options"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal size={16} strokeWidth={2} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setSelected(app.id)}>
              Open detail
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard.writeText(company).catch(() => {});
                }
                toast.success(`Copied "${company}"`);
              }}
            >
              Copy company
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                archive(app.id);
                toast.success('Archived');
              }}
            >
              Archive
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                createApplication({
                  jobId: app.jobId,
                  cvId: app.cvId,
                  stage: app.stage,
                  match: app.match,
                });
                toast.success('Application duplicated');
              }}
            >
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={handleDelete}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
