import { useEffect, useRef, useState } from 'react';
import {
  Euro,
  Home,
  User,
  Calendar,
  Link as LinkIcon,
  ExternalLink,
  FileText,
  Pencil,
} from 'lucide-react';
import { useAppStore } from '../../store';
import { useToast } from '../../primitives';
import { open as openPath } from '@tauri-apps/plugin-shell';

interface DetailMetaProps {
  applicationId: string;
  /** Empty values fall through to a placeholder + "Click to add". */
  salary?: string;
  workMode?: string;
  recruiter?: string;
  sourceUrl?: string;
  coverLetter?: string;
  appliedDate: string;
}

/** Inline-editable meta strip for the application detail panel. Each
 *  row toggles between display and a small input, blur or Enter
 *  saves through the slice's updateApplicationFields action. The
 *  "Applied" date stays read-only — it's a derived fact. */
export default function DetailMeta({
  applicationId,
  salary,
  workMode,
  recruiter,
  sourceUrl,
  coverLetter,
  appliedDate,
}: DetailMetaProps) {
  const updateApplicationFields = useAppStore((s) => s.updateApplicationFields);

  function save(field: 'salary' | 'workMode' | 'recruiter' | 'sourceUrl' | 'coverLetter', value: string) {
    const trimmed = value.trim();
    updateApplicationFields(applicationId, {
      [field]: trimmed.length === 0 ? undefined : trimmed,
    } as Parameters<typeof updateApplicationFields>[1]);
  }

  return (
    <div className="app-detail__meta">
      <EditableRow
        Icon={Euro}
        value={salary ?? ''}
        placeholder="Add salary"
        onSave={(v) => save('salary', v)}
      />
      <EditableRow
        Icon={Home}
        value={workMode ?? ''}
        placeholder="Add work mode"
        onSave={(v) => save('workMode', v)}
      />
      <EditableRow
        Icon={User}
        value={recruiter ?? ''}
        placeholder="Add recruiter"
        onSave={(v) => save('recruiter', v)}
      />
      <span className="app-detail__meta-item app-detail__meta-item--readonly">
        <Calendar size={14} strokeWidth={2} className="app-detail__meta-icon" />
        <span>{appliedDate}</span>
      </span>
      {/* SourceUrl gets its own row that doubles as a real link when
          set; clicking the link opens it via the Tauri shell so we
          don't navigate away from the dashboard window. */}
      <SourceUrlRow
        url={sourceUrl}
        onSave={(v) => save('sourceUrl', v)}
      />
      <CoverLetterRow
        text={coverLetter}
        onSave={(v) => save('coverLetter', v)}
      />
    </div>
  );
}

interface EditableRowProps {
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  value: string;
  placeholder: string;
  onSave: (next: string) => void;
}

function EditableRow({ Icon, value, placeholder, onSave }: EditableRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Sync external changes when not actively editing (e.g. re-render
  // due to another slice update wouldn't lose the user's typing).
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function commit() {
    setEditing(false);
    if (draft.trim() === value.trim()) return;
    onSave(draft);
  }

  if (!editing) {
    return (
      <button
        type="button"
        className={
          'app-detail__meta-item app-detail__meta-item--editable' +
          (value ? '' : ' app-detail__meta-item--empty')
        }
        onClick={() => setEditing(true)}
        title="Click to edit"
      >
        <Icon size={14} strokeWidth={2} className="app-detail__meta-icon" />
        <span>{value || placeholder}</span>
        <Pencil size={11} strokeWidth={2} className="app-detail__meta-pencil" />
      </button>
    );
  }

  return (
    <div className="app-detail__meta-item app-detail__meta-item--editing">
      <Icon size={14} strokeWidth={2} className="app-detail__meta-icon" />
      <input
        ref={inputRef}
        type="text"
        className="app-detail__meta-input"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          else if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
      />
    </div>
  );
}

interface SourceUrlRowProps {
  url?: string;
  onSave: (next: string) => void;
}

function SourceUrlRow({ url, onSave }: SourceUrlRowProps) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(url ?? '');

  useEffect(() => {
    if (!editing) setDraft(url ?? '');
  }, [url, editing]);

  async function openExternal() {
    if (!url) return;
    try {
      await openPath(url);
    } catch {
      toast.error("Couldn't open the link", url);
    }
  }

  if (!editing && !url) {
    return (
      <button
        type="button"
        className="app-detail__meta-item app-detail__meta-item--editable app-detail__meta-item--empty"
        onClick={() => setEditing(true)}
      >
        <LinkIcon size={14} strokeWidth={2} className="app-detail__meta-icon" />
        <span>Add source URL</span>
        <Pencil size={11} strokeWidth={2} className="app-detail__meta-pencil" />
      </button>
    );
  }

  if (!editing && url) {
    return (
      <span className="app-detail__meta-item app-detail__meta-item--link">
        <LinkIcon size={14} strokeWidth={2} className="app-detail__meta-icon" />
        <button
          type="button"
          className="app-detail__meta-link"
          onClick={openExternal}
          title={url}
        >
          {/* Trim the URL to host + path so long links don't shove
              the meta strip wider than the panel. */}
          {prettifyUrl(url)}
          <ExternalLink size={11} strokeWidth={2} />
        </button>
        <button
          type="button"
          className="app-detail__meta-pencil-btn"
          onClick={() => setEditing(true)}
          aria-label="Edit URL"
          title="Edit"
        >
          <Pencil size={11} strokeWidth={2} />
        </button>
      </span>
    );
  }

  return (
    <div className="app-detail__meta-item app-detail__meta-item--editing">
      <LinkIcon size={14} strokeWidth={2} className="app-detail__meta-icon" />
      <input
        autoFocus
        type="url"
        className="app-detail__meta-input"
        value={draft}
        placeholder="https://…"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft.trim() === (url ?? '').trim()) return;
          onSave(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          else if (e.key === 'Escape') {
            setDraft(url ?? '');
            setEditing(false);
          }
        }}
      />
    </div>
  );
}

interface CoverLetterRowProps {
  text?: string;
  onSave: (next: string) => void;
}

function CoverLetterRow({ text, onSave }: CoverLetterRowProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(text ?? '');
  useEffect(() => {
    setDraft(text ?? '');
  }, [text]);

  if (!open) {
    const preview = text?.slice(0, 80);
    return (
      <button
        type="button"
        className={
          'app-detail__meta-item app-detail__meta-item--editable app-detail__meta-item--cover' +
          (text ? '' : ' app-detail__meta-item--empty')
        }
        onClick={() => setOpen(true)}
      >
        <FileText size={14} strokeWidth={2} className="app-detail__meta-icon" />
        <span>
          {text ? `Cover letter: ${preview}${text.length > 80 ? '…' : ''}` : 'Add cover letter'}
        </span>
        <Pencil size={11} strokeWidth={2} className="app-detail__meta-pencil" />
      </button>
    );
  }

  return (
    <div className="app-detail__meta-item app-detail__meta-item--editing app-detail__meta-item--cover">
      <FileText size={14} strokeWidth={2} className="app-detail__meta-icon" />
      <textarea
        autoFocus
        className="app-detail__meta-textarea"
        value={draft}
        placeholder="Dear hiring team…"
        rows={6}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setOpen(false);
          if (draft.trim() === (text ?? '').trim()) return;
          onSave(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setDraft(text ?? '');
            setOpen(false);
          }
        }}
      />
    </div>
  );
}

/** Trim a URL to "host/path" without protocol so long career-page
 *  links don't blow out the meta strip. */
function prettifyUrl(raw: string): string {
  try {
    const u = new URL(raw);
    const path = u.pathname === '/' ? '' : u.pathname;
    const compact = `${u.host}${path}`;
    return compact.length > 48 ? compact.slice(0, 47) + '…' : compact;
  } catch {
    return raw;
  }
}
