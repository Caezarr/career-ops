import { Info, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import MonitorToggle from './MonitorToggle';
import { runIngestAll, runIngestSource } from '../../lib/ingest';
import { openJobTeaserAuth } from '../../lib/jobteaser';
import { useAppStore } from '../../store';
import type { IngestProvider } from '../../store/types';

interface ProviderConfig {
  value: IngestProvider;
  label: string;
  placeholder: string;
  /** Helper text shown under the input. */
  hint: string;
  /** True when the identifier is optional (YC pulls all roles by default). */
  optional?: boolean;
}

const PROVIDERS: ProviderConfig[] = [
  {
    value: 'greenhouse',
    label: 'Greenhouse',
    placeholder: 'anthropic',
    hint: 'Board slug from boards.greenhouse.io/<board>',
  },
  {
    value: 'lever',
    label: 'Lever',
    placeholder: 'mistral',
    hint: 'Company slug from jobs.lever.co/<company>',
  },
  {
    value: 'ashby',
    label: 'Ashby',
    placeholder: 'Notion',
    hint: 'Org slug from jobs.ashbyhq.com/<Org> (case-sensitive)',
  },
  {
    value: 'ycombinator',
    label: 'Y Combinator',
    placeholder: '(all roles)',
    hint: 'Empty = all 10 roles. Or one of: software-engineer, designer, recruiting, science, product-manager, operations, sales-manager, marketing, legal, finance.',
    optional: true,
  },
  {
    value: 'jobteaser',
    label: 'Job Teaser',
    placeholder: 'arts-et-metiers',
    hint: 'Career center slug. Requires school SSO via the auth window.',
  },
];

export default function JobsHeader() {
  const [provider, setProvider] = useState<IngestProvider>('greenhouse');
  const [identifier, setIdentifier] = useState('anthropic');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const ingestSyncing = useAppStore((s) => s.ingestSyncing);

  const config = PROVIDERS.find((p) => p.value === provider)!;
  const canSync = config.optional || identifier.trim().length > 0;

  async function handleSyncAll() {
    const kw = keyword.trim();
    setStatus(kw ? `Syncing all sources, filtering "${kw}"…` : 'Syncing all sources…');
    try {
      const r = await runIngestAll(kw || undefined);
      const errSuffix = r.failedSources > 0
        ? ` · ${r.failedSources} unreachable`
        : '';
      const matchSuffix = r.keyword ? ` matching "${r.keyword}"` : '';
      setStatus(
        `Synced ${r.fetched} jobs${matchSuffix} across ${r.successfulSources} companies (${r.newCount} new) in ${(r.elapsedMs / 1000).toFixed(1)}s${errSuffix}`,
      );
    } catch (e) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleSyncSingle() {
    // Job Teaser sync = SSO auth window. The bridge scrapes inline
    // after capturing cookies and forwards jobs via the
    // `jobteaser-jobs-received` event (see lib/jobteaser.ts), so a
    // direct `runIngestSource` call is a no-op until JT-08.
    if (provider === 'jobteaser') {
      setStatus('Opening Job Teaser sign-in…');
      try {
        await openJobTeaserAuth();
        setStatus('Sign in with your school account in the auth window. Jobs will arrive automatically.');
      } catch (e) {
        setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
      }
      return;
    }

    setStatus('Syncing…');
    const result = await runIngestSource(provider, identifier.trim());
    if (result.error) {
      setStatus(`Error: ${result.error}`);
      return;
    }
    const idLabel = result.identifier ? ` from ${result.identifier}` : ' from all roles';
    setStatus(
      `Synced ${result.fetched} ${config.label} jobs${idLabel} (${result.newCount} new) in ${result.elapsedMs}ms`,
    );
  }

  function handleProviderChange(next: IngestProvider) {
    setProvider(next);
    const nextConfig = PROVIDERS.find((p) => p.value === next)!;
    setIdentifier(nextConfig.optional ? '' : nextConfig.placeholder);
    setStatus(null);
  }

  return (
    <div className="jobs__header">
      <div className="jobs__header-text">
        <h1 className="jobs__title">Find the right roles faster</h1>
        <p className="jobs__subtitle">
          AI-powered job sourcing and matching, tailored to your profile and goals.
        </p>

        <div className="jobs__sync-bar">
          {/* Primary action — pulls Greenhouse + Lever + Ashby + YC across
              ~30 curated companies. Optional keyword narrows the response
              server-side (multi-word AND, case-insensitive, matched on
              role + company + location + description). */}
          <div className="jobs__sync-row">
            <input
              className="jobs__sync-input jobs__sync-input--keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder='Filter by keyword (e.g. "AI Engineer", "Product Manager EU") — optional'
              spellCheck={false}
              autoCorrect="off"
              aria-label="Sync keyword filter"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !ingestSyncing) handleSyncAll();
              }}
            />
            <button
              className="jobs__sync-btn jobs__sync-btn--primary"
              type="button"
              onClick={handleSyncAll}
              disabled={ingestSyncing}
            >
              <RefreshCw
                size={14}
                className={ingestSyncing ? 'jobs__sync-icon--spin' : ''}
              />
              {ingestSyncing
                ? 'Syncing…'
                : keyword.trim()
                ? 'Sync matching jobs'
                : 'Sync all jobs'}
            </button>
            <button
              type="button"
              className="jobs__sync-advanced-toggle"
              onClick={() => setAdvancedOpen((v) => !v)}
              aria-expanded={advancedOpen}
            >
              {advancedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Advanced
            </button>
          </div>

          <div className="jobs__sync-tagline">
            Pulls Greenhouse, Lever, Ashby, and Y Combinator across ~30 top companies.
            Leave the keyword empty to sync everything (~5 000 jobs), or type a role
            and only matching postings come back.
          </div>

          {advancedOpen && (
            <div className="jobs__sync-advanced">
              <div className="jobs__sync-providers" role="tablist" aria-label="Job source provider">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    role="tab"
                    aria-selected={provider === p.value}
                    className={
                      'jobs__sync-pill' + (provider === p.value ? ' jobs__sync-pill--active' : '')
                    }
                    onClick={() => handleProviderChange(p.value)}
                    disabled={ingestSyncing}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="jobs__sync-row">
                <input
                  className="jobs__sync-input"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={config.placeholder}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  aria-label={`${config.label} identifier`}
                />
                <button
                  className="jobs__sync-btn"
                  type="button"
                  onClick={handleSyncSingle}
                  disabled={ingestSyncing || !canSync}
                >
                  <RefreshCw
                    size={14}
                    className={ingestSyncing ? 'jobs__sync-icon--spin' : ''}
                  />
                  Sync this one
                </button>
              </div>
              <div className="jobs__sync-hint">{config.hint}</div>
            </div>
          )}

          {status && <div className="jobs__sync-status">{status}</div>}
        </div>
      </div>
      <div className="jobs__monitor">
        <span className="jobs__monitor-label">Monitor new matches</span>
        <Info size={14} className="jobs__monitor-info" />
        <MonitorToggle />
      </div>
    </div>
  );
}
