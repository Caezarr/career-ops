interface MatchPillProps {
  match: number;
}

export default function MatchPill({ match }: MatchPillProps) {
  // All matches in this design are >= 80, so always green.
  return <span className="match-pill match-pill--green">{match}%</span>;
}
