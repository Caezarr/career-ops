import { Copy, Eye, MoreHorizontal, Pencil, Star, Trash2 } from 'lucide-react';
import ATSPill from './ATSPill';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../primitives';
import type { CV } from '../../store';

interface CVVariantRowProps {
  variant: CV;
  selected: boolean;
  onSelect: (id: string) => void;
  onSetDefault: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onPreview: () => void;
  onDelete: () => void;
}

export default function CVVariantRow({
  variant,
  selected,
  onSelect,
  onSetDefault,
  onRename,
  onDuplicate,
  onPreview,
  onDelete,
}: CVVariantRowProps) {
  return (
    <div
      className={`cv-variants__row${selected ? ' cv-variants__row--selected' : ''}`}
      role="row"
      onClick={() => onSelect(variant.id)}
    >
      <div className="cv-variants__cell cv-variants__cell--radio" role="cell">
        <span
          className={`cv-radio${selected ? ' cv-radio--selected' : ''}`}
          aria-checked={selected}
          role="radio"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              onSelect(variant.id);
            }
          }}
        />
      </div>
      <div className="cv-variants__cell cv-variants__cell--name" role="cell">
        <span className="cv-pdf-badge" aria-hidden="true">PDF</span>
        <span className="cv-variants__name">
          {variant.name}
          {variant.isDefault && (
            <span
              style={{
                marginLeft: 8,
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--indigo-text)',
                background: 'var(--indigo-soft)',
                borderRadius: 4,
                padding: '2px 6px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Default
            </span>
          )}
        </span>
      </div>
      <div className="cv-variants__cell cv-variants__cell--muted" role="cell">
        {variant.lastEdited}
      </div>
      <div className="cv-variants__cell cv-variants__cell--muted" role="cell">
        {variant.fileType}
      </div>
      <div className="cv-variants__cell cv-variants__cell--role" role="cell">
        {variant.roleFocus}
      </div>
      <div className="cv-variants__cell" role="cell">
        <ATSPill score={variant.atsScore} />
      </div>
      <div
        className="cv-variants__cell cv-variants__cell--actions"
        role="cell"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="cv-variants__icon-btn"
              aria-label="More actions"
            >
              <MoreHorizontal size={16} strokeWidth={2} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem icon={Star} onSelect={onSetDefault}>
              Set as default
            </DropdownMenuItem>
            <DropdownMenuItem icon={Pencil} onSelect={onRename}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem icon={Copy} onSelect={onDuplicate}>
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem icon={Eye} onSelect={onPreview}>
              Open preview
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem icon={Trash2} variant="destructive" onSelect={onDelete}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
