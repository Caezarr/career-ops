import { useMemo, useState } from 'react';
import {
  Search,
  Play,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Building2,
  Clock,
  ExternalLink,
  Sparkles,
  Star,
} from 'lucide-react';
import { useAppStore } from '../../store';
import type {
  PrepQuestionV2,
  QuestionDifficulty,
  QuestionTrack,
} from '../../store/types';
import { TRACKS, topicsForTrack } from '../../data/prep';
import {
  filterBank,
  rankQuestions,
  statsByQuestionId,
} from '../../lib/prepBank';
import { useFocusedJob } from '../../hooks/useAdaptivePrepTrack';

const DIFFICULTY_OPTIONS: { id: QuestionDifficulty; label: string }[] = [
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
  { id: 'expert', label: 'Expert' },
];

/** New V2 question bank — track tabs + topic chips + difficulty +
 *  search. Each row is expandable in-place so the user can read the
 *  follow-ups and known-at companies without leaving the page. */
export default function QuestionBank() {
  const bank = useAppStore((s) => s.prepBank);
  const filter = useAppStore((s) => s.prepBankFilter);
  const setFilter = useAppStore((s) => s.setPrepBankFilter);
  const resetFilter = useAppStore((s) => s.resetPrepBankFilter);
  const activeTrack = useAppStore((s) => s.prepActiveTrack);
  const setActiveTrack = useAppStore((s) => s.setPrepActiveTrack);
  const attempts = useAppStore((s) => s.prepAttempts);
  const recordAttempt = useAppStore((s) => s.recordPrepAttempt);

  // Read the focused job so we can boost questions known at this
  // company to the top of the visible list. Pure read — the adaptive
  // hook (mounted in Prep.tsx) handles the side effect of setting
  // the active track.
  const { focusedJob } = useFocusedJob();
  const focusedCompany = focusedJob?.company ?? null;

  // Local-only — single-row expansion at a time so the list stays
  // skim-able even at 100+ questions.
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const trackForFilter = activeTrack ?? filter.track ?? null;

  const visibleQuestions = useMemo(() => {
    // Compose: bank → track filter → user filter → rank → company-boost.
    const trackScoped = trackForFilter
      ? bank.filter((q) => q.track === trackForFilter)
      : bank;
    const filtered = filterBank(trackScoped, filter);
    const ranked = rankQuestions(filtered, attempts);

    // Company-boost: when a job is in focus, surface questions
    // explicitly known at that firm to the top — keeps their
    // relative order otherwise. Stable partition is enough; we don't
    // need a real sort because rankQuestions has already settled
    // the within-bucket order.
    if (!focusedCompany) return ranked;
    const known: PrepQuestionV2[] = [];
    const rest: PrepQuestionV2[] = [];
    for (const q of ranked) {
      if (q.knownAtCompanies?.includes(focusedCompany)) known.push(q);
      else rest.push(q);
    }
    return [...known, ...rest];
  }, [bank, trackForFilter, filter, attempts, focusedCompany]);

  const topicsForActive = useMemo(
    () => (trackForFilter ? topicsForTrack(trackForFilter) : []),
    [trackForFilter],
  );

  const stats = useMemo(() => statsByQuestionId(attempts), [attempts]);

  const orderedTracks = useMemo(
    () => [...TRACKS].sort((a, b) => a.order - b.order),
    [],
  );

  return (
    <section className="prep-bank">
      <header className="prep-bank__header">
        <h2 className="prep-bank__title">Question bank</h2>
        <span className="prep-bank__count">
          {visibleQuestions.length} of {bank.length} questions
        </span>
      </header>

      {/* ── Track strip ─────────────────────────────────────────── */}
      <div className="prep-bank__tracks" role="tablist" aria-label="Track">
        <button
          type="button"
          role="tab"
          aria-selected={trackForFilter === null}
          className={
            'prep-bank__track' +
            (trackForFilter === null ? ' prep-bank__track--active' : '')
          }
          onClick={() => {
            setActiveTrack(null);
            setFilter({ track: undefined, topicId: undefined });
          }}
        >
          All tracks
        </button>
        {orderedTracks.map((t) => {
          const active = trackForFilter === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={
                'prep-bank__track' +
                (active ? ' prep-bank__track--active' : '')
              }
              onClick={() => {
                setActiveTrack(t.id as QuestionTrack);
                setFilter({ track: t.id as QuestionTrack, topicId: undefined });
              }}
              title={t.description}
            >
              {t.shortLabel}
            </button>
          );
        })}
      </div>

      {/* ── Topic chips (track-scoped) + filters row ───────────── */}
      <div className="prep-bank__filters">
        <div className="prep-bank__topics">
          {topicsForActive.length === 0 ? (
            <span className="prep-bank__topics-hint">
              {trackForFilter
                ? 'No topics defined for this track yet.'
                : 'Pick a track to see topic-level filters.'}
            </span>
          ) : (
            <>
              <button
                type="button"
                className={
                  'prep-bank__chip' +
                  (!filter.topicId ? ' prep-bank__chip--active' : '')
                }
                onClick={() => setFilter({ topicId: undefined })}
              >
                All topics
              </button>
              {topicsForActive.map((topic) => {
                const active = filter.topicId === topic.id;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    className={
                      'prep-bank__chip' +
                      (active ? ' prep-bank__chip--active' : '')
                    }
                    title={topic.hint}
                    onClick={() => setFilter({ topicId: topic.id })}
                  >
                    {topic.label}
                  </button>
                );
              })}
            </>
          )}
        </div>

        <div className="prep-bank__row">
          <div className="prep-bank__search">
            <Search size={14} strokeWidth={2} />
            <input
              type="search"
              value={filter.query ?? ''}
              onChange={(e) => setFilter({ query: e.target.value })}
              placeholder="Search question, tag, source…"
              className="prep-bank__search-input"
            />
          </div>
          <div className="prep-bank__difficulties">
            {DIFFICULTY_OPTIONS.map((d) => {
              const active = filter.difficulty === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  className={
                    'prep-bank__diff' +
                    (active ? ` prep-bank__diff--${d.id} prep-bank__diff--active` : '')
                  }
                  onClick={() =>
                    setFilter({ difficulty: active ? undefined : d.id })
                  }
                >
                  {d.label}
                </button>
              );
            })}
          </div>
          {(filter.query || filter.difficulty || filter.topicId) && (
            <button
              type="button"
              className="prep-bank__reset"
              onClick={resetFilter}
              title="Clear filters"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ── Question list ──────────────────────────────────────── */}
      <div className="prep-bank__list">
        {visibleQuestions.length === 0 ? (
          <div className="prep-bank__empty">
            <Sparkles size={18} strokeWidth={1.6} />
            <span>
              No questions match the current filters. Reset to see the full
              bank.
            </span>
          </div>
        ) : (
          visibleQuestions.map((q) => {
            const isOpen = expandedId === q.id;
            const s = stats.get(q.id);
            const knownHere =
              !!focusedCompany && !!q.knownAtCompanies?.includes(focusedCompany);
            return (
              <QuestionRow
                key={q.id}
                question={q}
                expanded={isOpen}
                attemptCount={s?.attemptCount ?? 0}
                lastSelfScore={s?.lastSelfScore ?? null}
                knownAtFocusedCompany={knownHere}
                focusedCompanyLabel={focusedCompany}
                onToggle={() => setExpandedId(isOpen ? null : q.id)}
                onMarkPractised={() =>
                  recordAttempt({ questionId: q.id })
                }
              />
            );
          })
        )}
      </div>
    </section>
  );
}

interface QuestionRowProps {
  question: PrepQuestionV2;
  expanded: boolean;
  attemptCount: number;
  lastSelfScore: number | null;
  /** True when the focused job's company is in the question's
   *  `knownAtCompanies`. Drives the star pill in the row meta. */
  knownAtFocusedCompany: boolean;
  /** Display label of the focused company — used for the tooltip on
   *  the star pill ("Goldman Sachs has asked this question"). */
  focusedCompanyLabel: string | null;
  onToggle: () => void;
  onMarkPractised: () => void;
}

function QuestionRow({
  question,
  expanded,
  attemptCount,
  lastSelfScore,
  knownAtFocusedCompany,
  focusedCompanyLabel,
  onToggle,
  onMarkPractised,
}: QuestionRowProps) {
  return (
    <article
      className={
        'prep-bank__item' +
        (expanded ? ' prep-bank__item--open' : '') +
        (knownAtFocusedCompany ? ' prep-bank__item--boosted' : '')
      }
    >
      <button
        type="button"
        className="prep-bank__item-head"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <div className="prep-bank__item-q">
          {knownAtFocusedCompany && focusedCompanyLabel && (
            <span
              className="prep-bank__company-badge"
              title={`${focusedCompanyLabel} is known to ask this question`}
            >
              <Star size={10} strokeWidth={2.4} fill="currentColor" />
              <span>{focusedCompanyLabel}</span>
            </span>
          )}
          {question.question}
        </div>
        <div className="prep-bank__item-meta">
          <span
            className={`prep-bank__diff prep-bank__diff--${question.difficulty} prep-bank__diff--static`}
          >
            {question.difficulty}
          </span>
          <span className="prep-bank__format">{question.format.replace('-', ' ')}</span>
          {question.durationMin && (
            <span className="prep-bank__duration">
              <Clock size={11} strokeWidth={2} />
              {question.durationMin}m
            </span>
          )}
          {attemptCount > 0 && (
            <span className="prep-bank__attempts">
              <CheckCircle2 size={11} strokeWidth={2} />
              {attemptCount}× practised
              {lastSelfScore !== null && ` · last ${lastSelfScore.toFixed(1)}/10`}
            </span>
          )}
          {expanded ? (
            <ChevronUp size={14} strokeWidth={2} />
          ) : (
            <ChevronDown size={14} strokeWidth={2} />
          )}
        </div>
      </button>

      {expanded && (
        <div className="prep-bank__item-body">
          {question.tags.length > 0 && (
            <div className="prep-bank__tags">
              {question.tags.map((tag) => (
                <span key={tag} className="prep-bank__tag">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {question.followUps && question.followUps.length > 0 && (
            <div className="prep-bank__follow">
              <span className="prep-bank__sub-label">Common follow-ups</span>
              <ul>
                {question.followUps.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {question.knownAtCompanies && question.knownAtCompanies.length > 0 && (
            <div className="prep-bank__companies">
              <Building2 size={12} strokeWidth={2} />
              <span className="prep-bank__sub-label">Known at:</span>
              <span>{question.knownAtCompanies.join(' · ')}</span>
            </div>
          )}

          {question.source && (
            <div className="prep-bank__source">
              <ExternalLink size={11} strokeWidth={2} />
              <span>Source · {question.source}</span>
            </div>
          )}

          <div className="prep-bank__actions">
            <button
              type="button"
              className="prep-bank__btn prep-bank__btn--secondary"
              onClick={onMarkPractised}
            >
              <CheckCircle2 size={13} strokeWidth={2} />
              <span>Mark as practised</span>
            </button>
            <button
              type="button"
              className="prep-bank__btn prep-bank__btn--primary"
              onClick={onMarkPractised}
              title="Run a Copilot mock with this question — coming soon"
              disabled
            >
              <Play size={13} strokeWidth={2} fill="currentColor" />
              <span>Practise with Copilot</span>
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
