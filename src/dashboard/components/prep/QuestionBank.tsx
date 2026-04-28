import { useState } from 'react';
import { Play } from 'lucide-react';
import { mockPrepQuestions } from '../../data/prep';
import DifficultyPill from './DifficultyPill';
import PracticeScorePill from './PracticeScorePill';

type BankTab = 'Behavioral' | 'Technical' | 'Case' | 'Culture Fit';
const TABS: BankTab[] = ['Behavioral', 'Technical', 'Case', 'Culture Fit'];

export default function QuestionBank() {
  const [activeTab, setActiveTab] = useState<BankTab>('Behavioral');

  return (
    <section className="prep-question-bank">
      <h2 className="prep-question-bank__title">Question bank</h2>

      <div className="prep-question-bank__tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={
              'prep-question-bank__tab' +
              (activeTab === tab ? ' prep-question-bank__tab--active' : '')
            }
            onClick={() => setActiveTab(tab)}
            aria-pressed={activeTab === tab}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="prep-qb-table" role="table" aria-label="Question bank">
        <div className="prep-qb-table__row prep-qb-table__row--header" role="row">
          <span className="prep-qb-table__head" />
          <span className="prep-qb-table__head">Question</span>
          <span className="prep-qb-table__head">Difficulty</span>
          <span className="prep-qb-table__head">Framework</span>
          <span className="prep-qb-table__head">Practice score</span>
          <span className="prep-qb-table__head">Action</span>
        </div>

        <div className="prep-qb-table__body">
          {mockPrepQuestions.map((q) => (
            <div key={q.id} className="prep-qb-table__row" role="row">
              <span className="prep-qb-table__index">{q.index}</span>
              <span className="prep-qb-table__question">{q.question}</span>
              <span>
                <DifficultyPill difficulty={q.difficulty} />
              </span>
              <span className="prep-qb-table__framework">{q.framework}</span>
              <span>
                <PracticeScorePill score={q.practiceScore} />
              </span>
              <button type="button" className="prep-qb-table__practice">
                <span>Practice</span>
                <Play size={14} strokeWidth={2} fill="currentColor" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
