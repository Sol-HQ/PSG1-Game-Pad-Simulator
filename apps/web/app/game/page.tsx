"use client";

import { useState, useCallback } from "react";
import { useGamepadAction } from "@/hooks/useGamepad";

type Cell = "X" | "O" | null;
type Board = Cell[];

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diags
];

function getWinner(board: Board): Cell {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return null;
}

/**
 * Tic-Tac-Toe — PSG1 gamepad integration test game.
 *
 * Controls:
 *   D-pad  → navigate the 3x3 grid
 *   A      → place X or O
 *   Y      → restart game
 *   B      → undo last move
 *
 * Add ?gp to the URL to activate the PSG1 simulator overlay.
 */
export default function TicTacToe() {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [history, setHistory] = useState<{ board: Board; xIsNext: boolean }[]>([]);

  const winner = getWinner(board);
  const isDraw = !winner && board.every((c) => c !== null);

  const placeMove = useCallback(
    (i: number) => {
      if (board[i] || winner) return;
      setHistory((h) => [...h, { board: [...board], xIsNext }]);
      const next = [...board];
      next[i] = xIsNext ? "X" : "O";
      setBoard(next);
      setXIsNext(!xIsNext);
    },
    [board, xIsNext, winner],
  );

  const undo = useCallback(() => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setBoard(prev.board);
    setXIsNext(prev.xIsNext);
    setHistory((h) => h.slice(0, -1));
  }, [history]);

  const restart = useCallback(() => {
    setBoard(Array(9).fill(null));
    setXIsNext(true);
    setHistory([]);
  }, []);

  // Wire gamepad semantic actions
  useGamepadAction(
    useCallback(
      (action) => {
        if (action === "refresh") restart();
        if (action === "back") undo();
      },
      [restart, undo],
    ),
  );

  const status = winner
    ? `Winner: ${winner}`
    : isDraw
      ? "Draw!"
      : `Next: ${xIsNext ? "X" : "O"}`;

  return (
    <main className="app-shell__main ttt">
      <h1 className="ttt__title">Tic-Tac-Toe</h1>
      <p className="ttt__status">{status}</p>
      <p className="ttt__hint">D-pad navigate | A place | Y restart | B undo</p>

      <div className="ttt__board">
        {board.map((cell, i) => (
          <button
            key={i}
            className={`ttt__cell${cell === "X" ? " ttt__cell--x" : ""}${cell === "O" ? " ttt__cell--o" : ""}${winner && WINNING_LINES.some((l) => l.includes(i) && board[l[0]] === board[l[1]] && board[l[1]] === board[l[2]] && board[l[0]] !== null) ? " ttt__cell--win" : ""}`}
            onClick={() => placeMove(i)}
            aria-label={`Cell ${Math.floor(i / 3) + 1},${(i % 3) + 1}: ${cell ?? "empty"}`}
          >
            {cell}
          </button>
        ))}
      </div>

      <div className="ttt__actions">
        <button className="ttt__btn ttt__btn--undo" onClick={undo} disabled={history.length === 0}>
          B: Undo
        </button>
        <button className="ttt__btn ttt__btn--restart" onClick={restart}>
          Y: Restart
        </button>
      </div>

      <p className="ttt__footer">
        Add <code>?gp</code> to the URL to show the PSG1 simulator overlay.
      </p>
    </main>
  );
}
