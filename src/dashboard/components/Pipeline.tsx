import { useMemo, useState } from 'react';
import { ChevronDown, MoreHorizontal, Plus } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import '../styles/pipeline.css';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  useToast,
} from '../primitives';
import {
  useAppStore,
  type Application,
  type ApplicationStage,
  type Job,
} from '../store';
import CompanyAvatar from './CompanyAvatar';
import { downloadCSV } from '../utils/csv';
import { NewApplicationModal } from './shared';

const COLUMNS: { id: ApplicationStage; title: string }[] = [
  { id: 'sourced', title: 'Sourced' },
  { id: 'applied', title: 'Applied' },
  { id: 'phone_screen', title: 'Phone Screen' },
  { id: 'interview', title: 'Interview' },
  { id: 'offer', title: 'Offer' },
];

const ROLE_OPTIONS = [
  'All roles',
  'Product',
  'Strategy',
  'Finance',
  'Engineering',
];

interface CardModel {
  app: Application;
  job: Job | undefined;
}

function matchClass(score: number, ongoing?: boolean): string {
  if (ongoing) return 'pipeline-card__match--ongoing';
  if (score >= 90) return 'pipeline-card__match--green';
  if (score >= 80) return 'pipeline-card__match--green-soft';
  if (score >= 70) return 'pipeline-card__match--orange';
  return 'pipeline-card__match--red';
}

export default function Pipeline() {
  const toast = useToast();
  const applications = useAppStore((s) => s.applications);
  const jobs = useAppStore((s) => s.jobs);
  const updateStage = useAppStore((s) => s.updateApplicationStage);
  const roleFilter = useAppStore((s) => s.pipelineRoleFilter);
  const setRoleFilter = useAppStore((s) => s.setPipelineRoleFilter);
  const sort = useAppStore((s) => s.pipelineSort);
  const setSort = useAppStore((s) => s.setPipelineSort);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<ApplicationStage | null>(null);
  const [defaultStage, setDefaultStage] = useState<ApplicationStage | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Build a map of stage → cards, applying the role filter.
  const grouped = useMemo(() => {
    const byStage: Record<ApplicationStage, CardModel[]> = {
      sourced: [],
      applied: [],
      phone_screen: [],
      interview: [],
      offer: [],
      rejected: [],
    };
    for (const app of applications) {
      if (app.archived) continue;
      const job = jobs.find((j) => j.id === app.jobId);
      // Role filter (loose, case-insensitive contains).
      if (roleFilter && roleFilter !== 'All roles') {
        const haystack = `${job?.role ?? ''}`.toLowerCase();
        if (!haystack.includes(roleFilter.toLowerCase())) continue;
      }
      byStage[app.stage].push({ app, job });
    }
    // Sort within each column.
    for (const stage of Object.keys(byStage) as ApplicationStage[]) {
      byStage[stage].sort((a, b) => {
        if (sort === 'match') return b.app.match - a.app.match;
        return b.app.appliedAt - a.app.appliedAt;
      });
    }
    return byStage;
  }, [applications, jobs, roleFilter, sort]);

  const activeCard = useMemo(() => {
    if (!activeId) return null;
    for (const stage of COLUMNS) {
      const c = grouped[stage.id].find((x) => x.app.id === activeId);
      if (c) return c;
    }
    return null;
  }, [activeId, grouped]);

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragOver(e: DragOverEvent) {
    const overId = e.over?.id;
    if (!overId) {
      setOverColumn(null);
      return;
    }
    const overStage = String(overId) as ApplicationStage;
    if (COLUMNS.some((c) => c.id === overStage)) {
      setOverColumn(overStage);
    } else {
      // Sortable item — find its column.
      for (const stage of COLUMNS) {
        if (grouped[stage.id].some((x) => x.app.id === overId)) {
          setOverColumn(stage.id);
          return;
        }
      }
      setOverColumn(null);
    }
  }

  function handleDragEnd(e: DragEndEvent) {
    const activeAppId = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    setActiveId(null);
    setOverColumn(null);
    if (!overId) return;

    // Find current stage of active.
    let fromStage: ApplicationStage | null = null;
    for (const stage of COLUMNS) {
      if (grouped[stage.id].some((x) => x.app.id === activeAppId)) {
        fromStage = stage.id;
        break;
      }
    }
    if (!fromStage) return;

    // Resolve target stage: either over a column id or over a card (look up its column).
    let toStage: ApplicationStage | null = null;
    if (COLUMNS.some((c) => c.id === overId)) {
      toStage = overId as ApplicationStage;
    } else {
      for (const stage of COLUMNS) {
        if (grouped[stage.id].some((x) => x.app.id === overId)) {
          toStage = stage.id;
          break;
        }
      }
    }
    if (!toStage || toStage === fromStage) return;

    updateStage(activeAppId, toStage);
    const card = grouped[fromStage].find((x) => x.app.id === activeAppId);
    const company = card?.job?.company ?? card?.app.notes ?? 'application';
    const stageLabel = COLUMNS.find((c) => c.id === toStage)?.title ?? toStage;
    toast.success(`Moved ${company} to ${stageLabel}`);
  }

  function handleAddCardClick(stage: ApplicationStage) {
    setDefaultStage(stage);
    setAddOpen(true);
  }

  function handleExport() {
    const rows: object[] = [];
    for (const stage of COLUMNS) {
      for (const c of grouped[stage.id]) {
        rows.push({
          company: c.job?.company ?? '',
          role: c.job?.role ?? '',
          stage: stage.title,
          match: c.app.match,
          applied: c.app.appliedDate,
          lastActivity: c.app.lastActivity,
        });
      }
    }
    if (rows.length === 0) {
      toast.info('Nothing to export', 'Pipeline is empty.');
      return;
    }
    downloadCSV('pipeline.csv', rows);
    toast.success('Pipeline exported');
  }

  return (
    <section className="pipeline" aria-label="Application pipeline">
      <div className="pipeline__header">
        <h2 className="pipeline__title">Pipeline</h2>
        <div className="pipeline__header-actions">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="pipeline__filter">
                <span>{roleFilter}</span>
                <ChevronDown size={14} strokeWidth={2} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {ROLE_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt}
                  onSelect={() => setRoleFilter(opt)}
                >
                  {opt}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="pipeline__more"
                aria-label="More options"
              >
                <MoreHorizontal size={16} strokeWidth={2} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setSort('date')}>
                Sort by date
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setSort('match')}>
                Sort by match score
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleExport}>
                Export pipeline (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => toast.info('Pipeline refreshed')}
              >
                Refresh
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          setOverColumn(null);
        }}
      >
        <div className="pipeline__columns">
          {COLUMNS.map((col) => (
            <PipelineDroppableColumn
              key={col.id}
              stage={col.id}
              title={col.title}
              cards={grouped[col.id]}
              isOver={overColumn === col.id}
              onAddClick={() => handleAddCardClick(col.id)}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeCard ? (
            <article className="pipeline-card pipeline-card--overlay">
              <div className="pipeline-card__top">
                <CompanyAvatar
                  company={activeCard.job?.company ?? ''}
                  size={28}
                />
                <div className="pipeline-card__text">
                  <div className="pipeline-card__role">
                    {activeCard.job?.role ?? '—'}
                  </div>
                  <div className="pipeline-card__company">
                    {activeCard.job?.company ?? '—'}
                  </div>
                </div>
              </div>
              <div className="pipeline-card__bottom">
                <span className="pipeline-card__date">
                  {activeCard.app.appliedDate}
                </span>
                <span
                  className={`pipeline-card__match ${matchClass(
                    activeCard.app.match,
                  )}`}
                >
                  {activeCard.app.match}%
                </span>
              </div>
            </article>
          ) : null}
        </DragOverlay>
      </DndContext>

      <NewApplicationModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        defaultStage={defaultStage ?? undefined}
      />
    </section>
  );
}

interface PipelineDroppableColumnProps {
  stage: ApplicationStage;
  title: string;
  cards: CardModel[];
  isOver: boolean;
  onAddClick: () => void;
}

function PipelineDroppableColumn({
  stage,
  title,
  cards,
  isOver,
  onAddClick,
}: PipelineDroppableColumnProps) {
  const { setNodeRef } = useDroppable({ id: stage });
  return (
    <div className="pipeline-column">
      <div className="pipeline-column__header">
        <span className="pipeline-column__title">{title}</span>
        <span className="pipeline-column__count">{cards.length}</span>
      </div>
      <SortableContext
        items={cards.map((c) => c.app.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={clsx(
            'pipeline-column__cards',
            isOver && 'pipeline-column__cards--over',
          )}
        >
          {cards.length === 0 && (
            <div className="ds-empty" style={{ padding: 16 }}>
              <span style={{ fontSize: 12 }}>No applications</span>
            </div>
          )}
          {cards.map((c) => (
            <SortablePipelineCard key={c.app.id} card={c} />
          ))}
        </div>
      </SortableContext>
      <button type="button" className="pipeline-column__add" onClick={onAddClick}>
        <Plus size={14} strokeWidth={2.2} />
        <span>Add card</span>
      </button>
    </div>
  );
}

function SortablePipelineCard({ card }: { card: CardModel }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.app.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={clsx(
        'pipeline-card',
        isDragging && 'pipeline-card--dragging',
      )}
      {...attributes}
      {...listeners}
    >
      <div className="pipeline-card__top">
        <CompanyAvatar company={card.job?.company ?? ''} size={28} />
        <div className="pipeline-card__text">
          <div className="pipeline-card__role">{card.job?.role ?? '—'}</div>
          <div className="pipeline-card__company">{card.job?.company ?? '—'}</div>
        </div>
      </div>
      <div className="pipeline-card__bottom">
        <span className="pipeline-card__date">{card.app.appliedDate}</span>
        <span className={`pipeline-card__match ${matchClass(card.app.match)}`}>
          {card.app.match}%
        </span>
      </div>
    </article>
  );
}
