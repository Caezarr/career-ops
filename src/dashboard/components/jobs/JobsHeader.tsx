import { Info, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import MonitorToggle from './MonitorToggle';
import { runIngestSource } from '../../lib/ingest';
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
];

export default function JobsHeader() {
  // Temporary sync UI — replaced by the proper Settings → Job Sources
  // panel later in the sprint.
  const [provider, setProvider] = useState<IngestProvider>('greenhouse');
  const [identifier, setIdentifier] = useState('anthropic');
  const [status, setStatus] = useState<string | null>(null);
  const ingestSyncing = useAppStore((s) => s.ingestSyncing);

  const config = PROVIDERS.find((p) => p.value === provider)!;
  const canSync = config.optional || identifier.trim().length > 0;

  async function handleSync() {
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
    // Pre-fill the input with the placeholder when switching, except
    // for YC where empty = all roles is a sensible default.
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
              onClick={handleSync}
              disabled={ingestSyncing || !canSync}
            >
              <RefreshCw size={14} className={ingestSyncing ? 'jobs__sync-icon--spin' : ''} />
              {ingestSyncing ? 'Syncing…' : 'Sync'}
            </button>
          </div>

          <div className="jobs__sync-hint">{config.hint}</div>
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
