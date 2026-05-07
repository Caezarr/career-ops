import { useEffect, useRef, useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useAppStore } from '../../store';
import { useToast } from '../../primitives';

/** Sprint 5 (audit Performance P0 #1): debounce window between
 *  the keystroke and the store write that re-runs the JobList
 *  filter over 5000 postings. 120ms keeps the input feeling
 *  instant (under the 200ms input-latency threshold) while
 *  collapsing burst typing into ~1 filter pass per word. */
const SEARCH_DEBOUNCE_MS = 120;

export default function AISearchBar() {
  const storeQuery = useAppStore((s) => s.jobsSearchQuery);
  const setQuery = useAppStore((s) => s.setJobsSearchQuery);
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Local mirror so the input renders the keystroke immediately
  // (no perceived lag) while the store write is debounced.
  const [draft, setDraft] = useState(storeQuery);

  // Keep the local draft in sync if the store value changes from
  // elsewhere (ESC clear, command palette, deep link).
  useEffect(() => {
    setDraft(storeQuery);
  }, [storeQuery]);

  // Push debounced writes into the store. Cancel on unmount /
  // next keystroke so we never write a stale value.
  useEffect(() => {
    if (draft === storeQuery) return;
    const handle = window.setTimeout(() => {
      setQuery(draft);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [draft, storeQuery, setQuery]);

  // Keep ESC clearing search even when blurred from elsewhere on the page.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        setDraft('');
        setQuery('');
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [setQuery]);

  return (
    <div className="ai-search">
      <Sparkles size={18} className="ai-search__icon" />
      <input
        ref={inputRef}
        type="text"
        className="ai-search__input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Senior PM roles in Paris, Series B+, 80k–120k, fintech or health"
        aria-label="Search jobs"
      />
      <button
        type="button"
        className="ai-search__btn"
        onClick={() =>
          toast.info(
            draft.trim() ? `Searching "${draft.trim()}"` : 'Showing all roles',
          )
        }
      >
        <span>Search</span>
        <ArrowRight size={14} />
      </button>
    </div>
  );
}
