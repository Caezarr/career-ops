import { useState } from 'react';
import { Plus, Trash2, RefreshCw, AlertCircle, CheckCircle2, GraduationCap } from 'lucide-react';
import { useAppStore } from '../../store';
import type { IngestProvider, IngestSource } from '../../store/types';
import {
  addIngestSourceWithPersist,
  ingestHealthCheck,
  removeIngestSourceWithPersist,
  toggleIngestSourceWithPersist,
} from '../../lib/ingest';
import { openJobTeaserAuth } from '../../lib/jobteaser';
import { useToast } from '../../primitives';
import Toggle from './Toggle';

interface ProviderOption {
  value: IngestProvider;
  label: string;
  placeholder: string;
  hint: string;
  /** Identifier may be empty for this provider (YC = all roles). */
  optional?: boolean;
}

const PROVIDER_OPTIONS: ProviderOption[] = [
  {
    value: 'greenhouse',
    label: 'Greenhouse',
    placeholder: 'anthropic',
    hint: 'Board slug — boards.greenhouse.io/<board>',
  },
  {
    value: 'lever',
    label: 'Lever',
    placeholder: 'mistral',
    hint: 'Company slug — jobs.lever.co/<company>',
  },
  {
    value: 'ashby',
    label: 'Ashby',
    placeholder: 'Notion',
    hint: 'Org slug (case-sensitive) — jobs.ashbyhq.com/<Org>',
  },
  {
    value: 'ycombinator',
    label: 'Y Combinator',
    placeholder: '(all roles)',
    hint: 'Empty = all roles. Or one of: software-engineer, designer, recruiting, science, product-manager, operations, sales-manager, marketing, legal, finance.',
    optional: true,
  },
];

const PROVIDER_LABELS: Record<IngestProvider, string> = {
  greenhouse: 'Greenhouse',
  lever: 'Lever',
  ashby: 'Ashby',
  ycombinator: 'Y Combinator',
  jobteaser: 'Job Teaser',
};

function formatLastSynced(ts?: number): string {
  if (!ts) return 'Never';
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86_400) return `${Math.floor(diffSec / 3600)} h ago`;
  return `${Math.floor(diffSec / 86_400)} d ago`;
}

export default function JobSourcesCard() {
  const sources = useAppStore((s) => s.ingestSources);
  const lastSyncedAt = useAppStore((s) => s.ingestLastSyncedAt);
  const toast = useToast();

  // Add-source form state.
  const [provider, setProvider] = useState<IngestProvider>('greenhouse');
  const [identifier, setIdentifier] = useState('');
  const [testing, setTesting] = useState(false);

  const config = PROVIDER_OPTIONS.find((p) => p.value === provider)!;
  const canAdd = config.optional || identifier.trim().length > 0;

  // Group sources by provider for cleaner display.
  const grouped = sources.reduce<Record<IngestProvider, IngestSource[]>>(
    (acc, s) => {
      if (!acc[s.provider]) acc[s.provider] = [];
      acc[s.provider].push(s);
      return acc;
    },
    { greenhouse: [], lever: [], ashby: [], ycombinator: [], jobteaser: [] },
  );

  async function handleTestAndAdd() {
    const id = identifier.trim();
    // YC with empty id is fine; everyone else needs a slug.
    if (!config.optional && !id) {
      toast.error('Identifier required');
      return;
    }

    // Already exists?
    const existing = sources.find(
      (s) =>
        s.provider === provider &&
        (s.identifier ?? '') === (provider === 'ycombinator' ? '' : id),
    );
    if (existing) {
      toast.error(`Already in your list — ${existing.label}`);
      return;
    }

    setTesting(true);
    try {
      const count = await ingestHealthCheck(provider, id);
      await addIngestSourceWithPersist({ provider, identifier: id });
      toast.success(
        count > 0
          ? `Added ${PROVIDER_LABELS[provider]} (${count} jobs found)`
          : `Added ${PROVIDER_LABELS[provider]} (no jobs right now)`,
      );
      setIdentifier('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Couldn't reach ${PROVIDER_LABELS[provider]}: ${msg}`);
    } finally {
      setTesting(false);
    }
  }

  return (
    <section className="settings-card" aria-labelledby="settings-job-sources-title">
      <h2 id="settings-job-sources-title" className="settings-card__title">
        Job sources
      </h2>
      <p className="settings-card__lede">
        Companies and boards Career&nbsp;OS pulls from when you click <strong>Sync all jobs</strong>.
        Toggle sources on or off — disabled ones stay in your list but skip the sync. Add custom slugs
        from any company that posts on Greenhouse / Lever / Ashby.
      </p>

      <div className="job-sources__meta-row">
        <span className="job-sources__meta-label">
          {sources.filter((s) => s.enabled).length} of {sources.length} sources enabled
        </span>
        <span className="job-sources__meta-dot">·</span>
        <span className="job-sources__meta-label">
          Last full sync: {formatLastSynced(lastSyncedAt ?? undefined)}
        </span>
      </div>

      {/* ── Job Teaser (school SSO) ──────────────────────────────── */}
      <div className="job-sources__jt">
        <div className="job-sources__jt-row">
          <GraduationCap size={18} className="job-sources__jt-icon" />
          <div className="job-sources__jt-text">
            <div className="job-sources__jt-title">School Job Teaser</div>
            <div className="job-sources__jt-subtitle">
              Sign in with your school account (HEC, ESSEC, ENSAM, Sciences Po…) — Career OS captures
              your session locally so your school-network jobs join the public feed. Cookies stay in
              macOS Keychain.
            </div>
          </div>
          <button
            type="button"
            className="job-sources__jt-btn"
            onClick={() => {
              void openJobTeaserAuth().catch((e) =>
                toast.error(`Couldn't open Job Teaser: ${e instanceof Error ? e.message : String(e)}`),
              );
            }}
          >
            <Plus size={14} />
            Add school
          </button>
        </div>
      </div>

      {/* ── Add new source (Greenhouse / Lever / Ashby / YC) ─────── */}
      <div className="job-sources__add">
        <div className="job-sources__add-row">
          <select
            className="job-sources__add-select"
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value as IngestProvider);
              setIdentifier('');
            }}
          >
            {PROVIDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            className="job-sources__add-input"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder={config.placeholder}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canAdd && !testing) handleTestAndAdd();
            }}
          />
          <button
            type="button"
            className="job-sources__add-btn"
            onClick={handleTestAndAdd}
            disabled={!canAdd || testing}
          >
            {testing ? (
              <>
                <RefreshCw size={14} className="job-sources__icon--spin" />
                Testing…
              </>
            ) : (
              <>
                <Plus size={14} />
                Test &amp; add
              </>
            )}
          </button>
        </div>
        <div className="job-sources__add-hint">{config.hint}</div>
      </div>

      {/* ── Existing sources, grouped by provider ────────────────── */}
      {sources.length === 0 ? (
        <div className="job-sources__empty">
          <AlertCircle size={16} />
          <span>No sources yet — Career OS will use the curated defaults until you add one.</span>
        </div>
      ) : (
        <div className="job-sources__groups">
          {(Object.keys(grouped) as IngestProvider[]).map((p) =>
            grouped[p].length === 0 ? null : (
              <div key={p} className="job-sources__group">
                <h3 className="job-sources__group-title">
                  {PROVIDER_LABELS[p]}{' '}
                  <span className="job-sources__group-count">
                    {grouped[p].filter((s) => s.enabled).length}/{grouped[p].length}
                  </span>
                </h3>
                <ul className="job-sources__list">
                  {grouped[p].map((source) => (
                    <SourceRow
                      key={source.id}
                      source={source}
                      onToggle={() => {
                        void toggleIngestSourceWithPersist(source.id);
                      }}
                      onRemove={() => {
                        void removeIngestSourceWithPersist(source.id).then(
                          () => toast.info(`Removed ${source.label}`),
                        );
                      }}
                    />
                  ))}
                </ul>
              </div>
            ),
          )}
        </div>
      )}
    </section>
  );
}

function SourceRow({
  source,
  onToggle,
  onRemove,
}: {
  source: IngestSource;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <li
      className={
        'job-sources__row' + (source.enabled ? '' : ' job-sources__row--disabled')
      }
    >
      <div className="job-sources__row-main">
        <span className="job-sources__row-label">
          {source.identifier || '(all roles)'}
        </span>
        <div className="job-sources__row-meta">
          {source.lastError ? (
            <span className="job-sources__row-error" title={source.lastError}>
              <AlertCircle size={12} />
              {source.lastError.length > 60
                ? source.lastError.slice(0, 60) + '…'
                : source.lastError}
            </span>
          ) : source.lastSyncedAt ? (
            <span className="job-sources__row-ok">
              <CheckCircle2 size={12} />
              Synced {formatLastSynced(source.lastSyncedAt)}
            </span>
          ) : (
            <span className="job-sources__row-pending">Not yet synced</span>
          )}
        </div>
      </div>
      <div className="job-sources__row-actions">
        <Toggle checked={source.enabled} onChange={onToggle} ariaLabel="Enable source" />
        <button
          type="button"
          className="job-sources__row-remove"
          onClick={onRemove}
          aria-label={`Remove ${source.label}`}
          title={`Remove ${source.label}`}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </li>
  );
}
