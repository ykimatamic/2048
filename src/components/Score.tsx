import { formatNumber } from "../game/format.ts";

interface ScoreProps {
  score: number;
  best: number;
}

export function Score({ score, best }: ScoreProps) {
  return (
    <div className="scores" aria-live="polite">
      <div className="score-container">
        <div className="score-label">Score</div>
        <div className="score-value">{formatNumber(score)}</div>
      </div>
      <div className="score-container best">
        <div className="score-label">Best</div>
        <div className="score-value">{formatNumber(best)}</div>
      </div>
    </div>
  );
}
