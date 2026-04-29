import CircularProgress from './CircularProgress';
import { useAppStore } from '../../store';

export default function ATSScoreCard() {
  const cvs = useAppStore((s) => s.cvs);
  const selectedCvId = useAppStore((s) => s.selectedCvId);
  const selectedCv = cvs.find((c) => c.id === selectedCvId) ?? cvs[0];
  const score = selectedCv?.atsScore ?? 0;

  const label = score >= 85 ? 'Great match' : score >= 75 ? 'Good match' : score >= 60 ? 'Average match' : 'Needs work';
  const description =
    score >= 85
      ? 'Well optimized for ATS'
      : score >= 75
      ? 'Solid ATS coverage'
      : score >= 60
      ? 'Some keywords missing'
      : 'Significant gaps detected';
  const color = score >= 80 ? 'green' : score >= 60 ? 'orange' : 'red';

  return (
    <div className="cv-ats-card">
      <CircularProgress value={score} size={70} stroke={7} color={color} labelSize={15} />
      <div className="cv-ats-card__text">
        <div className="cv-ats-card__label">ATS score</div>
        <div className="cv-ats-card__match">{label}</div>
        <div className="cv-ats-card__desc">{description}</div>
      </div>
    </div>
  );
}
