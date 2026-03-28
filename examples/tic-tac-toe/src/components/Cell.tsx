"use client";

import type { Mark } from "@/hooks/useTicTacToe";

interface CellProps {
  mark: Mark;
  index: number;
  winning: boolean;
  onClick: () => void;
}

export default function Cell({ mark, index, winning, onClick }: CellProps) {
  return (
    <button
      className={`ttt-cell${winning ? " ttt-cell--win" : ""}${mark ? " ttt-cell--placed" : ""}`}
      onClick={onClick}
      data-cell={index}
      aria-label={`Cell ${index + 1}${mark ? `, ${mark}` : ", empty"}`}
    >
      {mark && <span className={`ttt-mark ttt-mark--${mark}`}>{mark}</span>}
    </button>
  );
}
