import type { Difficulty } from '../../data/prep';

interface DifficultyPillProps {
  difficulty: Difficulty;
}

export default function DifficultyPill({ difficulty }: DifficultyPillProps) {
  const variant = difficulty.toLowerCase();
  return (
    <span className={`prep-difficulty-pill prep-difficulty-pill--${variant}`}>
      {difficulty}
    </span>
  );
}
