import { Search, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../../store';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../../primitives';
import type { PrepInterviewTrack } from '../../store/slices/ui';

const TRACKS: PrepInterviewTrack[] = [
  'Behavioral + Technical',
  'Behavioral only',
  'Technical only',
  'Case study',
  'Culture fit',
];

export default function PrepSearchRow() {
  const query = useAppStore((s) => s.prepSearchQuery);
  const setQuery = useAppStore((s) => s.setPrepSearchQuery);
  const track = useAppStore((s) => s.prepInterviewTrack);
  const setTrack = useAppStore((s) => s.setPrepInterviewTrack);

  return (
    <div className="prep-search-row">
      <div className="prep-search">
        <Search size={16} strokeWidth={2} className="prep-search__icon" />
        <input
          type="text"
          className="prep-search__input"
          placeholder="Prepare for Goldman Sachs, VP IBD role"
          aria-label="Prepare search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              setQuery('');
            }
          }}
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="prep-track-dropdown" aria-label="Interview track">
            <div className="prep-track-dropdown__col">
              <span className="prep-track-dropdown__label">Interview track</span>
              <span className="prep-track-dropdown__value">{track}</span>
            </div>
            <ChevronDown size={16} strokeWidth={2} className="prep-track-dropdown__chevron" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {TRACKS.map((t) => (
            <DropdownMenuItem key={t} onSelect={() => setTrack(t)}>
              {t}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <span className="prep-session-pill">
        <CheckCircle2 size={16} strokeWidth={2} />
        <span>Session-ready</span>
      </span>
    </div>
  );
}
