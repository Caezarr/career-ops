import { Plus } from 'lucide-react';
import type { PipelineColumnData } from '../data/mock';
import PipelineCard from './PipelineCard';

interface PipelineColumnProps {
  column: PipelineColumnData;
}

export default function PipelineColumn({ column }: PipelineColumnProps) {
  return (
    <div className="pipeline-column">
      <div className="pipeline-column__header">
        <span className="pipeline-column__title">{column.title}</span>
        <span className="pipeline-column__count">{column.cards.length}</span>
      </div>
      <div className="pipeline-column__cards">
        {column.cards.map((card) => (
          <PipelineCard key={card.id} card={card} />
        ))}
      </div>
      <button type="button" className="pipeline-column__add">
        <Plus size={14} strokeWidth={2.2} />
        <span>Add card</span>
      </button>
    </div>
  );
}
