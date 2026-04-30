import { useMemo, useState } from 'react';
import { Trash2, Copy, Check, Mic, Sparkles, Briefcase, IdCard, Clock } from 'lucide-react';
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  useConfirm,
  useToast,
} from '../../primitives';
import { useAppStore } from '../../store';
import type {
  CopilotAnswerEntry,
  CopilotSession,
  CopilotTranscriptItem,
} from '../../store/slices/copilotSessions';

interface CopilotSessionDetailModalProps {
  open: boolean;
  onClose: () => void;
  /** Session id to render. If the session no longer exists in the
   *  store (e.g. the user deleted it from another window), the modal
   *  closes itself. */
  sessionId: string | null;
}

/** Interleave the persisted transcript bubbles and answer entries by
 *  timestamp so the modal reads as a single conversation timeline. */
type TimelineEntry =
  | { kind: 'bubble'; data: CopilotTranscriptItem }
  | { kind: 'answer'; data: CopilotAnswerEntry };

function buildTimeline(session: CopilotSession): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    ...session.transcript.map((b) => ({ kind: 'bubble' as const, data: b })),
    ...session.answers.map((a) => ({ kind: 'answer' as const, data: a })),
  ];
  return entries.sort((a, b) => a.data.at - b.data.at);
}

function formatElapsed(at: number, sessionStart: number): string {
  const sec = Math.max(0, Math.round((at - sessionStart) / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatDateTime(at: number): string {
  return new Date(at).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(start: number, end: number | null): string {
  if (!end) return 'Still in progress';
  const min = Math.max(0, Math.round((end - start) / 60000));
  if (min < 1) return '< 1 min';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export default function CopilotSessionDetailModal({
  open,
  onClose,
  sessionId,
}: CopilotSessionDetailModalProps) {
  const sessions = useAppStore((s) => s.copilotSessions);
  const jobs = useAppStore((s) => s.jobs);
  const cvs = useAppStore((s) => s.cvs);
  const deleteSession = useAppStore((s) => s.deleteCopilotSession);
  const confirm = useConfirm();
  const toast = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const session = useMemo(
    () => (sessionId ? sessions.find((s) => s.id === sessionId) ?? null : null),
    [sessions, sessionId],
  );

  if (!session) {
    // Session deleted in another window — fail closed.
    if (open) onClose();
    return null;
  }

  const timeline = buildTimeline(session);
  const linkedJob = session.jobId ? jobs.find((j) => j.id === session.jobId) : null;
  const linkedCv = session.cvId ? cvs.find((c) => c.id === session.cvId) : null;

  async function handleDelete() {
    if (!session) return;
    const ok = await confirm({
      title: 'Delete this session?',
      description: 'The transcript and answers will be gone for good.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) {
      deleteSession(session.id);
      toast.success('Session deleted');
      onClose();
    }
  }

  async function copyAnswer(entry: CopilotAnswerEntry) {
    try {
      await navigator.clipboard.writeText(entry.text);
      setCopiedId(entry.id);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast.error('Could not copy', 'Clipboard unavailable in this context.');
    }
  }

  const headline = session.company || (session.mode === 'pitch' ? 'Pitch session' : 'Live interview');
  const sub = session.role || (session.mode === 'pitch' ? 'Self-presentation' : 'Q&A');

  return (
    <Modal open={open} onClose={onClose} size="lg" ariaLabel={`Session ${headline}`}>
      <ModalHeader
        title={headline}
        subtitle={`${sub} · ${session.mode === 'pitch' ? 'Pitch mode' : 'Q&A mode'}`}
        onClose={onClose}
      />
      <ModalBody>
        {/* Metadata strip */}
        <div className="cp-detail__meta-grid">
          <div className="cp-detail__meta-cell">
            <Clock size={12} strokeWidth={2} />
            <div>
              <span className="cp-detail__meta-label">Duration</span>
              <span className="cp-detail__meta-value">
                {formatDuration(session.startedAt, session.endedAt)}
              </span>
            </div>
          </div>
          <div className="cp-detail__meta-cell">
            <Clock size={12} strokeWidth={2} />
            <div>
              <span className="cp-detail__meta-label">Started</span>
              <span className="cp-detail__meta-value">{formatDateTime(session.startedAt)}</span>
            </div>
          </div>
          <div className="cp-detail__meta-cell">
            <Briefcase size={12} strokeWidth={2} />
            <div>
              <span className="cp-detail__meta-label">Linked job</span>
              <span className="cp-detail__meta-value">
                {linkedJob ? `${linkedJob.company} · ${linkedJob.role}` : '—'}
              </span>
            </div>
          </div>
          <div className="cp-detail__meta-cell">
            <IdCard size={12} strokeWidth={2} />
            <div>
              <span className="cp-detail__meta-label">CV used</span>
              <span className="cp-detail__meta-value">
                {linkedCv ? linkedCv.name : '—'}
              </span>
            </div>
          </div>
          <div className="cp-detail__meta-cell">
            <Mic size={12} strokeWidth={2} />
            <div>
              <span className="cp-detail__meta-label">Turns</span>
              <span className="cp-detail__meta-value">
                {session.transcript.length} bubble{session.transcript.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
          <div className="cp-detail__meta-cell">
            <Sparkles size={12} strokeWidth={2} />
            <div>
              <span className="cp-detail__meta-label">Answers</span>
              <span className="cp-detail__meta-value">
                {session.answers.length}
              </span>
            </div>
          </div>
        </div>

        {/* Timeline (bubbles + answers interleaved by timestamp) */}
        {timeline.length === 0 ? (
          <div className="cp-detail__empty">
            This session ended before any audio was captured. Nothing to show.
          </div>
        ) : (
          <div className="cp-detail__timeline">
            {timeline.map((entry) => {
              if (entry.kind === 'bubble') {
                const b = entry.data;
                if (b.speaker === 'system') {
                  return (
                    <div key={b.id} className="cp-detail__system">
                      <Sparkles size={12} />
                      <span>{b.text}</span>
                    </div>
                  );
                }
                return (
                  <div key={b.id} className="cp-detail__bubble">
                    <div className="cp-detail__bubble-meta">
                      <Mic size={11} strokeWidth={2} />
                      <span className="cp-detail__bubble-name">
                        {b.speakerLabel || (b.speaker === 'recruiter' ? 'Recruiter' : 'You')}
                      </span>
                      <span className="cp-detail__bubble-time">
                        {formatElapsed(b.at, session.startedAt)}
                      </span>
                    </div>
                    <p className="cp-detail__bubble-text">{b.text}</p>
                  </div>
                );
              }
              const a = entry.data;
              const copied = copiedId === a.id;
              return (
                <div key={a.id} className="cp-detail__answer">
                  <div className="cp-detail__answer-meta">
                    <Sparkles size={11} strokeWidth={2} />
                    <span className="cp-detail__answer-label">Suggested answer</span>
                    <span className="cp-detail__bubble-time">
                      {formatElapsed(a.at, session.startedAt)}
                    </span>
                    <button
                      type="button"
                      className="cp-detail__answer-copy"
                      onClick={() => void copyAnswer(a)}
                      aria-label="Copy answer"
                      title="Copy"
                    >
                      {copied ? <Check size={11} /> : <Copy size={11} />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="cp-detail__answer-text">{a.text}</p>
                </div>
              );
            })}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <button
          type="button"
          className="ds-btn ds-btn--danger"
          style={{ marginRight: 'auto' }}
          onClick={handleDelete}
        >
          <Trash2 size={13} />
          <span style={{ marginLeft: 6 }}>Delete session</span>
        </button>
        <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>
          Close
        </button>
      </ModalFooter>
    </Modal>
  );
}
