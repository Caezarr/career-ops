import { Info, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import MonitorToggle from './MonitorToggle';
import { runIngestSource } from '../../lib/ingest';
import { useAppStore } from '../../store';

export default function JobsHeader() {
  // Temporary sync UI — validates the Greenhouse pipeline end-to-end
  // before we build the proper Settings → Job Sources panel.
  const [board, setBoard] = useState('anthropic');
  const [status, setStatus] = useState<string | null>(null);
  const ingestSyncing = useAppStore((s) => s.ingestSyncing);

  async function handleSync() {
    setStatus('Syncing…');
    const result = await runIngestSource('greenhouse', board.trim());
    if (result.error) {
      setStatus(`Error: ${result.error}`);
    } else {
      setStatus(
        `Synced ${result.fetched} jobs from ${result.identifier} (${result.newCount} new) in ${result.elapsedMs}ms`,
      );
    }
  }

  return (
    <div className="jobs__header">
      <div className="jobs__header-text">
        <h1 className="jobs__title">Find the right roles faster</h1>
        <p className="jobs__subtitle">
          AI-powered job sourcing and matching, tailored to your profile and goals.
        </p>
        <div className="jobs__sync-bar">
          <label className="jobs__sync-label">
            Greenhouse board:
            <input
              className="jobs__sync-input"
              value={board}
              onChange={(e) => setBoard(e.target.value)}
              placeholder="anthropic"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
          </label>
          <button
            className="jobs__sync-btn"
            type="button"
            onClick={handleSync}
            disabled={ingestSyncing || !board.trim()}
          >
            <RefreshCw size={14} className={ingestSyncing ? 'jobs__sync-icon--spin' : ''} />
            {ingestSyncing ? 'Syncing…' : 'Sync'}
          </button>
          {status && <span className="jobs__sync-status">{status}</span>}
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
