import { useEffect, useRef } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useAppStore } from '../../store';
import { useToast } from '../../primitives';

export default function AISearchBar() {
  const query = useAppStore((s) => s.jobsSearchQuery);
  const setQuery = useAppStore((s) => s.setJobsSearchQuery);
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Keep ESC clearing search even when blurred from elsewhere on the page.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
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
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Senior PM roles in Paris, Series B+, 80k–120k, fintech or health"
        aria-label="Search jobs"
      />
      <button
        type="button"
        className="ai-search__btn"
        onClick={() =>
          toast.info(
            query.trim() ? `Searching "${query.trim()}"` : 'Showing all roles',
          )
        }
      >
        <span>Search</span>
        <ArrowRight size={14} />
      </button>
    </div>
  );
}
