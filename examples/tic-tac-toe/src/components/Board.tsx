"use client";

import type { Mark } from "@/hooks/useTicTacToe";
import Cell from "./Cell";

interface BoardProps {
  board: Mark[];
  winLine: number[] | null;
  onCellClick: (index: number) => void;
}

export default function Board({ board, winLine, onCellClick }: BoardProps) {
  return (
    <div className="ttt-board" aria-label="Tic-Tac-Toe board">
      {board.map((mark, i) => (
        <Cell
          key={i}
          mark={mark}
          index={i}
          winning={winLine?.includes(i) ?? false}
          onClick={() => onCellClick(i)}
        />
      ))}
    </div>
  );
}
