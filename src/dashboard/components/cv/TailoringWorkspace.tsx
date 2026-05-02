import { useMemo, useState } from 'react';
import { Target, ChevronDown, LineChart, Sparkles, Bookmark, FileText, Briefcase } from 'lucide-react';
import KeywordMatchSection from './KeywordMatchSection';
import MissingKeywords from './MissingKeywords';
import SuggestedEdits from './SuggestedEdits';
import DiffSection from './DiffSection';
import { mockTailoring } from '../../data/cv';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  useToast,
} from '../../primitives';
import { useAppStore } from '../../store';
import AnalyzeMatchModal from '../shared/AnalyzeMatchModal';
import GenerateOptimizedModal from '../shared/GenerateOptimizedModal';

/** A target the user can pick in the tailoring workspace. Sourced
 *  from real Jobs + Applications, with a stable display label so the
 *  user sees their actual pipeline rather than a hardcoded list. */
interface TailoringOption {
  /** "{role} · {company}" — the label shown in the dropdown and stored
   *  on `tailoringTarget.role` for backwards compatibility with all
   *  the call sites that still consume the string. */
  label: string;
  /** Linked Job id — drives the JD-text lookup for Analyze + Generate. */
  jobId: string;
  /** Source bucket for grouping in the dropdown. */
  source: 'application' | 'bookmarked' | 'job';
}

export default function TailoringWorkspace() {
  const toast = useToast();
  const cvs = useAppStore((s) => s.cvs);
  const tailoringTarget = useAppStore((s) => s.tailoringTarget);
  const setTailoringTarget = useAppStore((s) => s.setTailoringTarget);
  const createCV = useAppStore((s) => s.createCV);
  const setSelectedCv = useAppStore((s) => s.setSelectedCv);
  const atsByCv = useAppStore((s) => s.atsByCv);
  const atsAnalyzerJd = useAppStore((s) => s.atsAnalyzerJd);
  const jobs = useAppStore((s) => s.jobs);
  const applications = useAppStore((s) => s.applications);

  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);

  const baseCv = cvs.find((c) => c.id === tailoringTarget.baseCvId) ?? cvs[0];

  // ── Build the target-role picker from REAL data ─────────────────
  // Three buckets, in priority order:
  //   1. Active applications (most actionable — apps the user is
  //      currently chasing). Dedup on jobId so the same job doesn't
  //      appear in apps + bookmarks + all-jobs.
  //   2. Bookmarked jobs (saved for later but not yet applied).
  //   3. Other jobs in the catalogue.
  // We label each option `{role} · {company}` so the legacy string
  // contract on `tailoringTarget.role` keeps working.
  const targetOptions = useMemo<TailoringOption[]>(() => {
    const seen = new Set<string>();
    const out: TailoringOption[] = [];

    // 1. Applications, sorted by recency (lastActivityAt → appliedAt fallback).
    const appOrder = [...applications]
      .filter((a) => !a.archived && a.stage !== 'rejected')
      .sort((a, b) => {
        const ax = a.lastActivityAt ?? a.appliedAt ?? 0;
        const bx = b.lastActivityAt ?? b.appliedAt ?? 0;
        return bx - ax;
      });
    for (const app of appOrder) {
      const job = jobs.find((j) => j.id === app.jobId);
      if (!job || seen.has(job.id)) continue;
      seen.add(job.id);
      out.push({
        label: `${job.role} · ${job.company}`,
        jobId: job.id,
        source: 'application',
      });
    }

    // 2. Bookmarked jobs.
    for (const job of jobs) {
      if (!job.bookmarked || seen.has(job.id)) continue;
      seen.add(job.id);
      out.push({
        label: `${job.role} · ${job.company}`,
        jobId: job.id,
        source: 'bookmarked',
      });
    }

    // 3. Everything else, sorted by match desc so the strongest fit
    //    surfaces first.
    const rest = jobs
      .filter((j) => !seen.has(j.id))
      .sort((a, b) => (b.match ?? 0) - (a.match ?? 0));
    for (const job of rest) {
      out.push({
        label: `${job.role} · ${job.company}`,
        jobId: job.id,
        source: 'job',
      });
    }

    return out;
  }, [jobs, applications]);

  // Group options for the dropdown sections — preserves the bucket
  // ordering above without N filter passes inside JSX.
  const groupedOptions = useMemo(() => {
    const apps = targetOptions.filter((o) => o.source === 'application');
    const bookmarked = targetOptions.filter((o) => o.source === 'bookmarked');
    const others = targetOptions.filter((o) => o.source === 'job');
    return { apps, bookmarked, others };
  }, [targetOptions]);

  function pickTarget(option: TailoringOption) {
    setTailoringTarget({ role: option.label, jobId: option.jobId });
  }

  // ── Pull the latest Analyze match output for the chosen base CV.
  // Fall back to the static mock when the user hasn't run Analyze yet.
  const analysis = baseCv ? atsByCv[baseCv.id] : undefined;
  // Before = the CV's current ATS score (what Claude scored it at).
  // After  = the score Claude projects IF the suggestions are applied.
  // Both come from the same analysis call → After ≥ Before always.
  const beforeMatch = analysis?.atsScore ?? baseCv?.atsScore ?? mockTailoring.beforeMatch;
  const afterMatch =
    analysis?.projectedAtsScore ??
    (baseCv?.atsScore ? Math.min(baseCv.atsScore + 12, 95) : undefined) ??
    mockTailoring.afterMatch;
  const missingKeywords =
    analysis?.missingKeywords?.length
      ? analysis.missingKeywords
      : mockTailoring.missingKeywords;
  const suggestedEdits =
    analysis?.suggestions?.length
      ? analysis.suggestions.slice(0, 3).map((s) => s.suggested || s.rationale)
      : mockTailoring.suggestedEdits;

  // Diff sections derived from the AI suggestions:
  // - reword/remove → Remove/Reduce (the original text)
  // - reword/add    → Add/Strengthen (the suggested text)
  const removeReduce = analysis?.suggestions?.length
    ? analysis.suggestions
        .filter((s) => s.type !== 'add' && s.original && s.original !== '<empty>')
        .map((s) => s.original)
    : mockTailoring.removeReduce;
  const addStrengthen = analysis?.suggestions?.length
    ? analysis.suggestions
        .filter((s) => s.type !== 'remove' && s.suggested)
        .map((s) => s.suggested)
    : mockTailoring.addStrengthen;

  return (
    <section className="cv-workspace" aria-label="Tailoring workspace">
      <h2 className="cv-workspace__title">Tailoring workspace</h2>

      <div className="cv-workspace__top">
        <div className="cv-workspace__field">
          <label className="cv-workspace__label">Target role</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="cv-workspace__dropdown cv-workspace__dropdown--wide"
              >
                <span className="cv-workspace__dropdown-left">
                  <Target size={14} strokeWidth={2.2} className="cv-workspace__dropdown-icon" />
                  <span className="cv-workspace__dropdown-text">{tailoringTarget.role}</span>
                </span>
                <ChevronDown size={16} className="cv-workspace__dropdown-chevron" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {targetOptions.length === 0 ? (
                <DropdownMenuItem disabled>
                  No jobs in your catalogue yet — add one from the Jobs page.
                </DropdownMenuItem>
              ) : (
                <>
                  {groupedOptions.apps.length > 0 && (
                    <>
                      <DropdownMenuLabel>
                        <FileText size={11} strokeWidth={2.4} style={{ marginRight: 6, verticalAlign: -1 }} />
                        Active applications
                      </DropdownMenuLabel>
                      {groupedOptions.apps.map((opt) => (
                        <DropdownMenuItem
                          key={opt.jobId}
                          onSelect={() => pickTarget(opt)}
                        >
                          {opt.label}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                  {groupedOptions.bookmarked.length > 0 && (
                    <>
                      {groupedOptions.apps.length > 0 && <DropdownMenuSeparator />}
                      <DropdownMenuLabel>
                        <Bookmark size={11} strokeWidth={2.4} style={{ marginRight: 6, verticalAlign: -1 }} />
                        Bookmarked
                      </DropdownMenuLabel>
                      {groupedOptions.bookmarked.map((opt) => (
                        <DropdownMenuItem
                          key={opt.jobId}
                          onSelect={() => pickTarget(opt)}
                        >
                          {opt.label}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                  {groupedOptions.others.length > 0 && (
                    <>
                      {(groupedOptions.apps.length > 0 ||
                        groupedOptions.bookmarked.length > 0) && <DropdownMenuSeparator />}
                      <DropdownMenuLabel>
                        <Briefcase size={11} strokeWidth={2.4} style={{ marginRight: 6, verticalAlign: -1 }} />
                        Other jobs
                      </DropdownMenuLabel>
                      {groupedOptions.others.map((opt) => (
                        <DropdownMenuItem
                          key={opt.jobId}
                          onSelect={() => pickTarget(opt)}
                        >
                          {opt.label}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="cv-workspace__field">
          <label className="cv-workspace__label">Base CV</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="cv-workspace__dropdown">
                <span className="cv-workspace__dropdown-left">
                  <span className="cv-pdf-badge cv-pdf-badge--mini" aria-hidden="true">PDF</span>
                  <span className="cv-workspace__dropdown-text">
                    {baseCv?.name ?? 'Choose CV'}
                  </span>
                </span>
                <ChevronDown size={16} className="cv-workspace__dropdown-chevron" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {cvs.map((cv) => (
                <DropdownMenuItem
                  key={cv.id}
                  onSelect={() => setTailoringTarget({ baseCvId: cv.id })}
                >
                  {cv.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="cv-workspace__actions">
          <button
            type="button"
            className="cv-workspace__btn cv-workspace__btn--ghost"
            onClick={() => setAnalyzeOpen(true)}
          >
            <LineChart size={14} strokeWidth={2} />
            <span>Analyze match</span>
          </button>
          <button
            type="button"
            className="cv-workspace__btn cv-workspace__btn--primary"
            onClick={() => setGenerateOpen(true)}
          >
            <Sparkles size={14} strokeWidth={2.2} />
            <span>Generate optimized CV</span>
          </button>
        </div>
      </div>

      {analysis && (
        <div className="cv-workspace__live-banner">
          <Sparkles size={12} strokeWidth={2.2} />
          <span>
            Live results from your last Analyze match
            {tailoringTarget.role && ` against ${tailoringTarget.role}`}
          </span>
        </div>
      )}

      <div className="cv-workspace__analysis">
        <KeywordMatchSection before={beforeMatch} after={afterMatch} />
        <MissingKeywords keywords={missingKeywords} />
        <SuggestedEdits edits={suggestedEdits} />
      </div>

      <DiffSection removeReduce={removeReduce} addStrengthen={addStrengthen} />

      {/* Resolve the JD text used by Analyze + Generate. Priority:
            1. The JD pasted in the ATS Analyzer tab (cache hit on
               multi-CV runs — saves credits).
            2. The linked job's `jdText` when the user picked a real
               opportunity from the dropdown.
            3. The target-role label as a last resort. */}
      <AnalyzeMatchModal
        open={analyzeOpen}
        onClose={() => setAnalyzeOpen(false)}
        cvId={baseCv?.id}
        jdText={
          atsAnalyzerJd.trim() ||
          (tailoringTarget.jobId
            ? jobs.find((j) => j.id === tailoringTarget.jobId)?.jdText ?? tailoringTarget.role
            : tailoringTarget.role)
        }
        onApply={() => toast.success('Suggestions applied')}
      />

      <GenerateOptimizedModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        targetRole={tailoringTarget.role}
        jdText={
          tailoringTarget.jobId
            ? jobs.find((j) => j.id === tailoringTarget.jobId)?.jdText
            : undefined
        }
        onCreate={() => {
          const cv = createCV({
            name: `Optimized for ${tailoringTarget.role}`,
            roleFocus: tailoringTarget.role,
            atsScore: 89,
          });
          setSelectedCv(cv.id);
          toast.success('Optimized CV created');
        }}
      />
    </section>
  );
}
