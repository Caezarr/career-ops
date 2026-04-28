interface PracticeScorePillProps {
  score: number;
}

export default function PracticeScorePill({ score }: PracticeScorePillProps) {
  const tone = score >= 8 ? 'green' : 'orange';
  return (
    <span className={`prep-score-pill prep-score-pill--${tone}`}>
      {score.toFixed(1)}
    </span>
  );
}
