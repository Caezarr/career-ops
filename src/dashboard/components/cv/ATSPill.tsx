interface ATSPillProps {
  score: number;
}

export default function ATSPill({ score }: ATSPillProps) {
  const tone = score >= 80 ? 'green' : 'orange';
  return (
    <span className={`ats-pill ats-pill--${tone}`} aria-label={`ATS score ${score}%`}>
      {score}%
    </span>
  );
}
