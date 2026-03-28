"use client";

import { useEffect } from "react";
import { useGamepadAction, configurePsg1 } from "@psg1/core";
import { useTicTacToe } from "@/hooks/useTicTacToe";
import Menu from "@/components/Menu";
import Board from "@/components/Board";
import ScoreBoard from "@/components/ScoreBoard";

export default function TicTacToePage() {
  const {
    state,
    placeAt,
    scheduleCpuMove,
    undo,
    newRound,
    startGame,
    goToMenu,
    resetScores,
  } = useTicTacToe();

  // Tell PSG1 where the scrollable content zone is
  useEffect(() => {
    configurePsg1({ contentZone: ".ttt-root" });
  }, []);

  // Wire PSG1 gamepad actions to game logic
  // NOTE: D-pad navigation and A-button confirm are handled AUTOMATICALLY
  // by PSG1's spatialNav() and .click() on the focused <button>.
  // We only need to wire semantic actions: B=undo, Y=new round, etc.
  useGamepadAction((action) => {
    switch (action) {
      case "back":
        if (state.mode === "playing") undo();
        else if (state.mode === "gameover") goToMenu();
        break;
      case "refresh":
        if (state.mode === "gameover" || state.mode === "playing") newRound();
        break;
      case "select":
        resetScores();
        break;
      case "start":
        goToMenu();
        break;
    }
  });

  // Schedule CPU move when it becomes O's turn
  useEffect(() => {
    if (state.mode === "playing" && state.turn === "O" && state.opponent === "cpu" && !state.winner) {
      scheduleCpuMove();
    }
  }, [state.mode, state.turn, state.opponent, state.winner, scheduleCpuMove]);

  return (
    <div className="ttt-root">
      {state.mode === "menu" && (
        <Menu onStart={startGame} />
      )}

      {(state.mode === "playing" || state.mode === "gameover") && (
        <div className="ttt-game">
          <div className="ttt-header">
            <h1 className="ttt-title">Tic-Tac-Toe</h1>
            {state.mode === "playing" && (
              <p className="ttt-turn">
                {state.opponent === "cpu" && state.turn === "O"
                  ? "Computer thinking..."
                  : <>Turn: <span className={`ttt-mark--${state.turn}`}>{state.turn}</span></>
                }
              </p>
            )}
            {state.mode === "gameover" && (
              <p className="ttt-result">
                {state.winner === "draw"
                  ? "Draw!"
                  : <><span className={`ttt-mark--${state.winner}`}>{state.winner}</span> wins!</>
                }
              </p>
            )}
          </div>

          <Board
            board={state.board}
            winLine={state.winLine}
            onCellClick={placeAt}
          />

          <ScoreBoard x={state.scores.X} o={state.scores.O} draw={state.scores.draw} />

          <div className="ttt-actions">
            {state.mode === "gameover" && (
              <button className="ttt-btn ttt-btn--primary" onClick={newRound}>
                New Round (Y)
              </button>
            )}
            <button className="ttt-btn" onClick={undo}>
              Undo (B)
            </button>
            <button className="ttt-btn" onClick={goToMenu}>
              Menu (Start)
            </button>
          </div>

          <div className="ttt-controls-hint">
            <span><kbd>D-Pad</kbd> Navigate</span>
            <span><kbd>A</kbd> Place</span>
            <span><kbd>B</kbd> Undo</span>
            <span><kbd>Y</kbd> New Round</span>
          </div>
        </div>
      )}
    </div>
  );
}
