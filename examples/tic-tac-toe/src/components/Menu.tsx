"use client";

import { useState } from "react";
import type { Opponent, Difficulty } from "@/hooks/useTicTacToe";

interface MenuProps {
  onStart: (opponent: Opponent, difficulty: Difficulty) => void;
}

export default function Menu({ onStart }: MenuProps) {
  const [opponent, setOpponent] = useState<Opponent>("cpu");
  const [difficulty, setDifficulty] = useState<Difficulty>("hard");

  return (
    <div className="ttt-menu">
      <h1 className="ttt-menu__title">Tic-Tac-Toe</h1>
      <p className="ttt-menu__sub">PSG1 GamePad Integration Demo</p>

      <div className="ttt-menu__section">
        <p className="ttt-menu__label">Opponent</p>
        <div className="ttt-menu__btns">
          <button
            className={`ttt-menu__btn${opponent === "cpu" ? " ttt-menu__btn--active" : ""}`}
            onClick={() => setOpponent("cpu")}
          >
            vs Computer
          </button>
          <button
            className={`ttt-menu__btn${opponent === "human" ? " ttt-menu__btn--active" : ""}`}
            onClick={() => setOpponent("human")}
          >
            vs Human
          </button>
        </div>
      </div>

      {opponent === "cpu" && (
        <div className="ttt-menu__section">
          <p className="ttt-menu__label">Difficulty</p>
          <div className="ttt-menu__btns">
            <button
              className={`ttt-menu__btn${difficulty === "easy" ? " ttt-menu__btn--active" : ""}`}
              onClick={() => setDifficulty("easy")}
            >
              Easy
            </button>
            <button
              className={`ttt-menu__btn${difficulty === "hard" ? " ttt-menu__btn--active" : ""}`}
              onClick={() => setDifficulty("hard")}
            >
              Hard
            </button>
          </div>
        </div>
      )}

      <button
        className="ttt-menu__start"
        onClick={() => onStart(opponent, difficulty)}
      >
        Start Game
      </button>

      <div className="ttt-menu__controls">
        <p className="ttt-menu__label">PSG1 Controls</p>
        <div className="ttt-menu__grid">
          <kbd>D-Pad</kbd><span>Navigate cells</span>
          <kbd>A</kbd><span>Place mark</span>
          <kbd>B</kbd><span>Undo move</span>
          <kbd>Y</kbd><span>New round</span>
          <kbd>Start</kbd><span>Back to menu</span>
          <kbd>Select</kbd><span>Reset scores</span>
        </div>
      </div>
    </div>
  );
}
