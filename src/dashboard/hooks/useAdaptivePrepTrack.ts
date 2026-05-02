import { useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../store';
import type { Job, QuestionTrack } from '../store';
import { resolveFocusedJob, roleToTrack } from '../lib/jobTrack';

export interface AdaptivePrepContext {
  /** The job the prep page is tailoring to, if any. */
  focusedJob: Job | null;
  /** Where the focused-job hint came from — drives the "Tailored for"
   *  copy so the user knows why these questions surface. */
  source: 'workspace' | 'selected' | 'application' | null;
  /** The track inferred from the focused job's role. Null when the
   *  role doesn't match any known family. */
  inferredTrack: QuestionTrack | null;
}

/**
 * Read-only resolver — tells the caller which job the prep page
 * "should be" tailored to, plus the inferred track. No side effects;
 * call from anywhere on the Prep page that needs the context (e.g.
 * the header copy, the QuestionBank's company-boost logic).
 */
export function useFocusedJobContext(): AdaptivePrepContext {
  const jobs = useAppStore((s) => s.jobs);
  const applications = useAppStore((s) => s.applications);
  const workspaceJobId = useAppStore((s) => s.workspaceJobId);
  const selectedJobId = useAppStore((s) => s.selectedJobId);

  // Recency-sorted apps for the application-fallback resolver. Most
  // recent first so the Prep page "follows" the user's latest action.
  const applicationsByRecency = useMemo(
    () =>
      applications
        .slice()
        .sort((a, b) => {
          const ax = a.lastActivityAt ?? a.appliedAt ?? 0;
          const bx = b.lastActivityAt ?? b.appliedAt ?? 0;
          return bx - ax;
        })
        .map((a) => ({ jobId: a.jobId })),
    [applications],
  );

  const resolved = useMemo(
    () =>
      resolveFocusedJob({
        jobs,
        workspaceJobId,
        selectedJobId,
        applicationsByRecency,
      }),
    [jobs, workspaceJobId, selectedJobId, applicationsByRecency],
  );

  const inferredTrack = resolved?.job
    ? roleToTrack(resolved.job.role)
    : null;

  return {
    focusedJob: resolved?.job ?? null,
    source: resolved?.source ?? null,
    inferredTrack,
  };
}

/**
 * Auto-tailor the Prep track to the candidate's current candidacy.
 *
 *  Watches the focused job (War Room → Selected job → most-recent
 *  application) and writes the inferred track into `prepActiveTrack`
 *  when the job changes. The user can manually override by clicking
 *  another track tab; the override sticks until the focused job
 *  changes again — at which point Prep re-tailors automatically.
 *
 *  Mount this ONCE at the top of the Prep page so the effect doesn't
 *  fight itself across multiple consumers.
 */
export function useAdaptivePrepTrack(): AdaptivePrepContext {
  const ctx = useFocusedJobContext();
  const setActiveTrack = useAppStore((s) => s.setPrepActiveTrack);

  // Last fingerprint we wrote — `${jobId}|${track}`. When this matches
  // the current pair, we don't re-fire the setter even if the user
  // manually clicked a different track in the meantime.
  const lastWrittenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!ctx.focusedJob || !ctx.inferredTrack) return;
    const fp = `${ctx.focusedJob.id}|${ctx.inferredTrack}`;
    if (lastWrittenRef.current === fp) return;
    lastWrittenRef.current = fp;
    setActiveTrack(ctx.inferredTrack);
  }, [ctx.focusedJob, ctx.inferredTrack, setActiveTrack]);

  return ctx;
}

/** Convenient alias when only the value (not the side effect) is
 *  needed. Equivalent to calling `useFocusedJobContext()`. */
export const useFocusedJob = useFocusedJobContext;
