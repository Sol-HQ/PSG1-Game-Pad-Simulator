"use client";

interface ScoreBoardProps {
  x: number;
  o: number;
  draw: number;
}

export default function ScoreBoard({ x, o, draw }: ScoreBoardProps) {
  return (
    <div className="ttt-scores">
      <div className="ttt-score ttt-score--x">
        <span className="ttt-score__label">X</span>
        <span className="ttt-score__value">{x}</span>
      </div>
      <div className="ttt-score ttt-score--draw">
        <span className="ttt-score__label">Draw</span>
        <span className="ttt-score__value">{draw}</span>
      </div>
      <div className="ttt-score ttt-score--o">
        <span className="ttt-score__label">O</span>
        <span className="ttt-score__value">{o}</span>
      </div>
    </div>
  );
}
