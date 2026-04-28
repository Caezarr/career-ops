import CircularProgress from './CircularProgress';
import { mockCVAnalysis } from '../../data/cv';

export default function ATSScoreCard() {
  const { ats } = mockCVAnalysis;
  return (
    <div className="cv-ats-card">
      <CircularProgress value={ats.score} size={70} stroke={7} color="green" labelSize={15} />
      <div className="cv-ats-card__text">
        <div className="cv-ats-card__label">ATS score</div>
        <div className="cv-ats-card__match">{ats.label}</div>
        <div className="cv-ats-card__desc">{ats.description}</div>
      </div>
    </div>
  );
}
