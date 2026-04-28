import { ArrowRight } from 'lucide-react';
import CircularProgress from './CircularProgress';

interface KeywordMatchSectionProps {
  before: number;
  after: number;
}

export default function KeywordMatchSection({ before, after }: KeywordMatchSectionProps) {
  return (
    <div className="cv-keyword-match">
      <h4 className="cv-section-caps">Keyword match</h4>
      <div className="cv-keyword-match__row">
        <div className="cv-keyword-match__circle">
          <CircularProgress
            value={before}
            size={68}
            stroke={6}
            color="orange"
            labelSize={14}
          />
        </div>
        <div className="cv-keyword-match__arrow-wrap">
          <span className="cv-keyword-match__after-label">After</span>
          <ArrowRight size={18} strokeWidth={2} className="cv-keyword-match__arrow" />
        </div>
        <div className="cv-keyword-match__circle">
          <CircularProgress
            value={after}
            size={68}
            stroke={6}
            color="green"
            labelSize={14}
          />
        </div>
      </div>
    </div>
  );
}
