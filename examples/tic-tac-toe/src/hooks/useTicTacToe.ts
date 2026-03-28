"use client";

import { useState, useCallback, useRef } from "react";

// ── Types ────────────────────────────────────────────────────────
export type Mark = "X" | "O" | null;
export type Mode = "menu" | "playing" | "gameover";
export type Difficulty = "easy" | "hard";
export type Opponent = "cpu" | "human";

export interface GameState {
  board: Mark[];
  turn: Mark;
  winner: Mark | "draw" | null;
  winLine: number[] | null;
  mode: Mode;
  opponent: Opponent;
  difficulty: Difficulty;
  scores: { X: number; O: number; draw: number };
  history: Mark[][];
}

// ── Win lines ────────────────────────────────────────────────────
const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diagonals
];

function checkWinner(board: Mark[]): { winner: Mark; line: number[] } | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return null;
}

function isBoardFull(board: Mark[]): boolean {
  return board.every((cell) => cell !== null);
}

// ── Minimax AI ───────────────────────────────────────────────────
function minimax(board: Mark[], isMax: boolean, depth: number): number {
  const result = checkWinner(board);
  if (result) return result.winner === "O" ? 10 - depth : depth - 10;
  if (isBoardFull(board)) return 0;

  const mark = isMax ? "O" : "X";
  let best = isMax ? -Infinity : Infinity;

  for (let i = 0; i < 9; i++) {
    if (board[i] !== null) continue;
    board[i] = mark;
    const score = minimax(board, !isMax, depth + 1);
    board[i] = null;
    best = isMax ? Math.max(best, score) : Math.min(best, score);
  }
  return best;
}

function cpuMove(board: Mark[], difficulty: Difficulty): number {
  const empty = board.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0);
  if (empty.length === 0) return -1;

  // Easy mode: 60% random, 40% optimal
  if (difficulty === "easy" && Math.random() < 0.6) {
    return empty[Math.floor(Math.random() * empty.length)];
  }

  // Hard mode: minimax (unbeatable)
  let bestScore = -Infinity;
  let bestMove = empty[0];
  for (const i of empty) {
    board[i] = "O";
    const score = minimax(board, false, 0);
    board[i] = null;
    if (score > bestScore) {
      bestScore = score;
      bestMove = i;
    }
  }
  return bestMove;
}

// ── Hook ─────────────────────────────────────────────────────────
const EMPTY_BOARD: Mark[] = Array(9).fill(null);

export function useTicTacToe() {
  const [state, setState] = useState<GameState>({
    board: [...EMPTY_BOARD],
    turn: "X",
    winner: null,
    winLine: null,
    mode: "menu",
    opponent: "cpu",
    difficulty: "hard",
    scores: { X: 0, O: 0, draw: 0 },
    history: [],
  });

  const cpuTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Place mark ─────────────────────────────────────────────────
  const placeAt = useCallback((index: number) => {
    setState((s) => {
      if (s.mode !== "playing" || s.winner || s.board[index] !== null) return s;
      // Block human input during CPU turn
      if (s.opponent === "cpu" && s.turn === "O") return s;

      const newBoard = [...s.board];
      newBoard[index] = s.turn;
      const history = [...s.history, s.board];

      const result = checkWinner(newBoard);
      if (result) {
        const scores = { ...s.scores, [result.winner as "X" | "O"]: s.scores[result.winner as "X" | "O"] + 1 };
        return { ...s, board: newBoard, winner: result.winner, winLine: result.line, scores, history, mode: "gameover" as const };
      }
      if (isBoardFull(newBoard)) {
        const scores = { ...s.scores, draw: s.scores.draw + 1 };
        return { ...s, board: newBoard, winner: "draw", winLine: null, scores, history, mode: "gameover" as const };
      }

      const nextTurn = s.turn === "X" ? "O" : "X";
      return { ...s, board: newBoard, turn: nextTurn, history };
    });
  }, []);

  // ── CPU auto-play (triggered by effect in component) ───────────
  const scheduleCpuMove = useCallback(() => {
    clearTimeout(cpuTimerRef.current);
    cpuTimerRef.current = setTimeout(() => {
      setState((s) => {
        if (s.mode !== "playing" || s.turn !== "O" || s.opponent !== "cpu" || s.winner) return s;
        const move = cpuMove([...s.board], s.difficulty);
        if (move < 0) return s;
        const newBoard = [...s.board];
        newBoard[move] = "O";
        const history = [...s.history, s.board];

        const result = checkWinner(newBoard);
        if (result) {
          const scores = { ...s.scores, O: s.scores.O + 1 };
          return { ...s, board: newBoard, winner: result.winner, winLine: result.line, scores, history, mode: "gameover" };
        }
        if (isBoardFull(newBoard)) {
          const scores = { ...s.scores, draw: s.scores.draw + 1 };
          return { ...s, board: newBoard, winner: "draw", winLine: null, scores, history, mode: "gameover" };
        }
        return { ...s, board: newBoard, turn: "X", history };
      });
    }, 400);
  }, []);

  // ── Undo last move ─────────────────────────────────────────────
  const undo = useCallback(() => {
    setState((s) => {
      if (s.history.length === 0 || s.mode === "menu") return s;
      // In CPU mode, undo both CPU + human move
      let hist = [...s.history];
      let board = hist.pop()!;
      if (s.opponent === "cpu" && hist.length > 0 && s.mode === "playing") {
        board = hist.pop()!;
      }
      return { ...s, board, turn: "X", winner: null, winLine: null, mode: "playing", history: hist };
    });
  }, []);

  // ── New round (keep scores) ────────────────────────────────────
  const newRound = useCallback(() => {
    clearTimeout(cpuTimerRef.current);
    setState((s) => ({
      ...s,
      board: [...EMPTY_BOARD],
      turn: "X",
      winner: null,
      winLine: null,
      mode: "playing",
      history: [],
    }));
  }, []);

  // ── Start game from menu ───────────────────────────────────────
  const startGame = useCallback((opponent: Opponent, difficulty: Difficulty) => {
    clearTimeout(cpuTimerRef.current);
    setState((s) => ({
      ...s,
      board: [...EMPTY_BOARD],
      turn: "X",
      winner: null,
      winLine: null,
      mode: "playing",
      opponent,
      difficulty,
      history: [],
    }));
  }, []);

  // ── Back to menu ───────────────────────────────────────────────
  const goToMenu = useCallback(() => {
    clearTimeout(cpuTimerRef.current);
    setState((s) => ({
      ...s,
      board: [...EMPTY_BOARD],
      turn: "X",
      winner: null,
      winLine: null,
      mode: "menu",
      history: [],
    }));
  }, []);

  // ── Reset all scores ───────────────────────────────────────────
  const resetScores = useCallback(() => {
    setState((s) => ({ ...s, scores: { X: 0, O: 0, draw: 0 } }));
  }, []);

  return {
    state,
    placeAt,
    scheduleCpuMove,
    undo,
    newRound,
    startGame,
    goToMenu,
    resetScores,
  };
}
