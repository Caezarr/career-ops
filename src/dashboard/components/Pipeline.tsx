import { ChevronDown, MoreHorizontal } from 'lucide-react';
import '../styles/pipeline.css';
import { mockPipeline } from '../data/mock';
import PipelineColumn from './PipelineColumn';

export default function Pipeline() {
  return (
    <section className="pipeline" aria-label="Application pipeline">
      <div className="pipeline__header">
        <h2 className="pipeline__title">Pipeline</h2>
        <div className="pipeline__header-actions">
          <button type="button" className="pipeline__filter">
            <span>All roles</span>
            <ChevronDown size={14} strokeWidth={2} />
          </button>
          <button type="button" className="pipeline__more" aria-label="More options">
            <MoreHorizontal size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="pipeline__columns">
        {mockPipeline.map((col) => (
          <PipelineColumn key={col.id} column={col} />
        ))}
      </div>
    </section>
  );
}
