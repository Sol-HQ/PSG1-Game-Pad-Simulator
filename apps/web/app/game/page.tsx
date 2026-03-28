"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useGamepadAction } from "@psg1/core";

/* ═══════════════════════════════════════════════════════════════
   TIC-TAC-TOE  +  FULL APP-LAYOUT SANDBOX
   ═══════════════════════════════════════════════════════════════
   This page simulates a REAL gaming app layout so every PSG1
   control can be tested in context:

   ┌─ Header (L1/R1 cycles .gp-cycleable tabs) ───────────────┐
   │  Game   Leaderboard   Profile   Settings                 │
   ├───────────────────────────────────────────┬───────────────┤
   │  [Active Tab Content]                     │  Action Log   │
   │  • Game tab = Tic-Tac-Toe board           │  (sidebar)    │
   │  • Leaderboard tab = ranked list          │               │
   │  • Profile tab = form fields + avatar     │               │
   │  • Settings tab = toggles + checkboxes    │               │
   ├───────────────────────────────────────────┴───────────────┤
   │  Footer (version / credits)                               │
   └───────────────────────────────────────────────────────────┘

   Controls exercised:
     D-Pad      → navigate between cells, rows, form fields, list items
     A          → place mark, toggle checkbox, submit form, open VK on text input
     B          → undo move, close modal, cancel
     Y          → new round (refresh)
     L1/R1      → cycle header tabs
     L-Stick    → moju pointer over any element
     R-Stick    → scroll content / spatial nav
     Select     → "connect wallet" stub
     Start      → "gate / menu" stub
     Home       → menu stub
     R3         → click at cursor
   ═══════════════════════════════════════════════════════════════ */

// ── Types ────────────────────────────────────────────────────────
type Mark = "X" | "O" | null;
type Mode = "menu" | "playing" | "gameover";
type Difficulty = "easy" | "hard";
type Tab = "game" | "leaderboard" | "profile" | "settings";

// ── Win detection ────────────────────────────────────────────────
const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
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
  return board.every((c) => c !== null);
}

// ── Minimax AI ───────────────────────────────────────────────────
function minimax(board: Mark[], isMax: boolean, depth: number): number {
  const r = checkWinner(board);
  if (r) return r.winner === "O" ? 10 - depth : depth - 10;
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

function cpuMove(board: Mark[], diff: Difficulty): number {
  const empty = board.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0);
  if (empty.length === 0) return -1;
  if (diff === "easy" && Math.random() < 0.6) {
    return empty[Math.floor(Math.random() * empty.length)];
  }
  let bestScore = -Infinity;
  let bestIdx = empty[0];
  for (const i of empty) {
    board[i] = "O";
    const score = minimax(board, false, 0);
    board[i] = null;
    if (score > bestScore) { bestScore = score; bestIdx = i; }
  }
  return bestIdx;
}

const EMPTY: Mark[] = Array(9).fill(null);

// ── Fake leaderboard data ────────────────────────────────────────
const LEADERBOARD = [
  { rank: 1, name: "0xSolKing", wins: 42, streak: 7 },
  { rank: 2, name: "CryptoNaut", wins: 38, streak: 5 },
  { rank: 3, name: "GamePadGuru", wins: 35, streak: 4 },
  { rank: 4, name: "DPadDemon", wins: 29, streak: 3 },
  { rank: 5, name: "MojuMaster", wins: 24, streak: 2 },
  { rank: 6, name: "StickDrifter", wins: 21, streak: 1 },
  { rank: 7, name: "ButtonBasher", wins: 18, streak: 0 },
  { rank: 8, name: "PSG1Rookie", wins: 12, streak: 0 },
];

// ══════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════

export default function GameSandbox() {
  // ── Tab state ──────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>("game");

  // ── Game state ─────────────────────────────────────────────────
  const [board, setBoard] = useState<Mark[]>([...EMPTY]);
  const [turn, setTurn] = useState<Mark>("X");
  const [winner, setWinner] = useState<Mark | "draw" | null>(null);
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [mode, setMode] = useState<Mode>("menu");
  const [difficulty, setDifficulty] = useState<Difficulty>("hard");
  const [scores, setScores] = useState({ X: 0, O: 0, draw: 0 });
  const [history, setHistory] = useState<Mark[][]>([]);
  const cpuTimer = useRef<ReturnType<typeof setTimeout>>();

  // ── Action log ─────────────────────────────────────────────────
  const [log, setLog] = useState<string[]>([]);
  const pushLog = useCallback((msg: string) => {
    setLog((p) => [`${new Date().toLocaleTimeString("en-US", { hour12: false })} ${msg}`, ...p.slice(0, 49)]);
  }, []);

  // ── Profile state ──────────────────────────────────────────────
  const [displayName, setDisplayName] = useState("Player1");
  const [bio, setBio] = useState("");

  // ── Settings state ─────────────────────────────────────────────
  const [soundOn, setSoundOn] = useState(true);
  const [vibration, setVibration] = useState(true);
  const [showHints, setShowHints] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  // ── Wallet stub ────────────────────────────────────────────────
  const [walletConnected, setWalletConnected] = useState(false);

  // ── Place mark ─────────────────────────────────────────────────
  const placeAt = useCallback((idx: number) => {
    setBoard((prev) => {
      if (mode !== "playing" || winner || prev[idx] !== null) return prev;
      const b = [...prev];
      b[idx] = turn;
      setHistory((h) => [...h, prev]);
      const r = checkWinner(b);
      if (r) {
        setWinner(r.winner);
        setWinLine(r.line);
        setScores((s) => ({ ...s, [r.winner as "X" | "O"]: s[r.winner as "X" | "O"] + 1 }));
        setMode("gameover");
        pushLog(`${r.winner} wins!`);
        return b;
      }
      if (isBoardFull(b)) {
        setWinner("draw");
        setScores((s) => ({ ...s, draw: s.draw + 1 }));
        setMode("gameover");
        pushLog("Draw!");
        return b;
      }
      setTurn(turn === "X" ? "O" : "X");
      pushLog(`${turn} placed at cell ${idx}`);
      return b;
    });
  }, [mode, winner, turn, pushLog]);

  // ── CPU move ───────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "playing" || turn !== "O" || winner) return;
    cpuTimer.current = setTimeout(() => {
      setBoard((prev) => {
        const mv = cpuMove([...prev], difficulty);
        if (mv < 0) return prev;
        const b = [...prev];
        b[mv] = "O";
        setHistory((h) => [...h, prev]);
        const r = checkWinner(b);
        if (r) {
          setWinner(r.winner);
          setWinLine(r.line);
          setScores((s) => ({ ...s, O: s.O + 1 }));
          setMode("gameover");
          pushLog("O wins!");
          return b;
        }
        if (isBoardFull(b)) {
          setWinner("draw");
          setScores((s) => ({ ...s, draw: s.draw + 1 }));
          setMode("gameover");
          pushLog("Draw!");
          return b;
        }
        setTurn("X");
        pushLog(`CPU placed at cell ${mv}`);
        return b;
      });
    }, 400);
    return () => clearTimeout(cpuTimer.current);
  }, [mode, turn, winner, difficulty, pushLog]);

  // ── New round ──────────────────────────────────────────────────
  const newRound = useCallback(() => {
    clearTimeout(cpuTimer.current);
    setBoard([...EMPTY]);
    setTurn("X");
    setWinner(null);
    setWinLine(null);
    setMode("playing");
    setHistory([]);
    pushLog("New round started");
  }, [pushLog]);

  // ── Start game from menu ───────────────────────────────────────
  const startGame = useCallback((diff: Difficulty) => {
    clearTimeout(cpuTimer.current);
    setDifficulty(diff);
    setBoard([...EMPTY]);
    setTurn("X");
    setWinner(null);
    setWinLine(null);
    setMode("playing");
    setHistory([]);
    pushLog(`Game started (${diff})`);
  }, [pushLog]);

  // ── Undo ───────────────────────────────────────────────────────
  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      let hist = [...h];
      let prev = hist.pop()!;
      // In CPU mode, undo both moves
      if (hist.length > 0 && mode === "playing") {
        prev = hist.pop()!;
      }
      setBoard(prev);
      setTurn("X");
      setWinner(null);
      setWinLine(null);
      setMode("playing");
      pushLog("Undo");
      return hist;
    });
  }, [mode, pushLog]);

  // ── Gamepad action listener ────────────────────────────────────
  useGamepadAction((action) => {
    const actionLabels: Record<string, string> = {
      confirm: "A → Confirm",
      back: "B → Back",
      refresh: "Y → Refresh",
      select: "Select → Wallet",
      start: "Start → Gate/Menu",
      home: "Home → App Menu",
      l3: "L3 → Stick Press",
      r3: "R3 → Click Cursor",
      x: "X → Reserved",
    };
    pushLog(`[GP] ${actionLabels[action] ?? action}`);
    if (action === "refresh") {
      if (tab === "game" && mode === "gameover") newRound();
    }
    if (action === "back") {
      if (tab === "game" && mode === "playing") undo();
    }
    if (action === "select") {
      setWalletConnected((c) => !c);
      pushLog(`Wallet: ${walletConnected ? "connected → disconnected" : "disconnected → connected"}`);
    }
  });

  // ── Status text ────────────────────────────────────────────────
  const statusText = winner
    ? winner === "draw" ? "Draw!" : `${winner} wins!`
    : mode === "playing" ? `${turn}'s turn` : "";

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════

  return (
    <div className="demo-root">
      {/* ── HEADER ──────────────────────────────────────────── */}
      <header className="demo-header">
        <div className="demo-header__brand">
          <span className="demo-header__title">PSG1 Sandbox</span>
        </div>
        <nav className="demo-tabs">
          {(["game", "leaderboard", "profile", "settings"] as Tab[]).map((t) => (
            <button
              key={t}
              className={`demo-tab gp-cycleable${tab === t ? " demo-tab--active" : ""}`}
              onClick={() => { setTab(t); pushLog(`L1/R1 → Tab: ${t}`); }}
            >
              {t === "game" ? "Game" : t === "leaderboard" ? "Leaderboard" : t === "profile" ? "Profile" : "Settings"}
            </button>
          ))}
        </nav>
        <div className="demo-header__actions">
          <button
            className={`demo-btn gp-cycleable${walletConnected ? " demo-btn--primary" : ""}`}
            onClick={() => { setWalletConnected((c) => !c); pushLog(walletConnected ? "Wallet disconnected" : "Wallet connected"); }}
          >
            {walletConnected ? "0x1a2b...c3d4" : "Connect Wallet"}
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT ────────────────────────────────────── */}
      <main className="demo-main app-shell__main">
        <div className="demo-section">

          {/* ════════════ GAME TAB ════════════ */}
          {tab === "game" && (
            <>
              {mode === "menu" && (
                <div className="sandbox-menu">
                  <h2>Tic-Tac-Toe</h2>
                  <p className="demo-hint">
                    Choose difficulty. Use <kbd>D-Pad</kbd> to navigate, <kbd>A</kbd> to select.
                  </p>
                  <div className="demo-row" style={{ marginTop: 12 }}>
                    <button className="demo-btn demo-btn--primary" onClick={() => startGame("easy")}>Easy</button>
                    <button className="demo-btn demo-btn--primary" onClick={() => startGame("hard")}>Hard (Unbeatable)</button>
                  </div>
                </div>
              )}

              {mode !== "menu" && (
                <>
                  <div className="sandbox-game-header">
                    <div className="sandbox-scores">
                      <span className="sandbox-score sandbox-score--x">X: {scores.X}</span>
                      <span className="sandbox-score sandbox-score--draw">Draw: {scores.draw}</span>
                      <span className="sandbox-score sandbox-score--o">O: {scores.O}</span>
                    </div>
                    <div className="ttt__status">{statusText}</div>
                  </div>

                  <div className="ttt__board">
                    {board.map((cell, i) => (
                      <button
                        key={i}
                        className={[
                          "ttt__cell",
                          cell === "X" ? "ttt__cell--x" : cell === "O" ? "ttt__cell--o" : "",
                          winLine?.includes(i) ? "ttt__cell--win" : "",
                        ].join(" ")}
                        onClick={() => placeAt(i)}
                        disabled={!!winner || cell !== null || turn !== "X"}
                      >
                        {cell ?? ""}
                      </button>
                    ))}
                  </div>

                  <div className="ttt__actions">
                    <button className="ttt__btn" onClick={undo} disabled={history.length === 0 || mode === "gameover"}>
                      Undo (B)
                    </button>
                    {mode === "gameover" && (
                      <button className="ttt__btn ttt__btn--restart" onClick={newRound}>
                        New Round (Y)
                      </button>
                    )}
                    <button className="ttt__btn" onClick={() => setMode("menu")}>
                      Back to Menu
                    </button>
                  </div>

                  <p className="demo-hint">
                    <kbd>D-Pad</kbd> navigate cells · <kbd>A</kbd> place mark ·
                    <kbd>B</kbd> undo · <kbd>Y</kbd> new round ·
                    <kbd>L1/R1</kbd> switch tabs
                  </p>
                </>
              )}
            </>
          )}

          {/* ════════════ LEADERBOARD TAB ════════════ */}
          {tab === "leaderboard" && (
            <>
              <h2>Leaderboard</h2>
              <p className="demo-hint">
                Navigate with <kbd>D-Pad</kbd>, press <kbd>A</kbd> to view a player profile.
              </p>
              <div className="demo-section" style={{ gap: 6, marginTop: 8 }}>
                {LEADERBOARD.map((p) => (
                  <button key={p.rank} className="demo-leaderboard-row" onClick={() => pushLog(`Viewing ${p.name}`)}>
                    <span className="demo-rank">#{p.rank}</span>
                    <span className="demo-name">{p.name}</span>
                    <span className="demo-wins">{p.wins}W</span>
                    <span className="sandbox-streak">{p.streak > 0 ? `${p.streak} streak` : ""}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ════════════ PROFILE TAB ════════════ */}
          {tab === "profile" && (
            <>
              <h2>Profile</h2>
              <p className="demo-hint">
                Press <kbd>A</kbd> on a text field to open the Virtual Keyboard.
                <kbd>D-Pad</kbd> to type, <kbd>Y</kbd> to confirm.
              </p>
              <div className="demo-profile">
                <div className="demo-avatar" />
                <div style={{ flex: 1 }}>
                  <div className="demo-field">
                    <label>Display Name</label>
                    <input
                      className="demo-input"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      maxLength={20}
                    />
                  </div>
                  <div className="demo-field" style={{ marginTop: 12 }}>
                    <label>Bio</label>
                    <textarea
                      className="demo-input"
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      maxLength={140}
                      style={{ resize: "none" }}
                    />
                  </div>
                  <div className="demo-row" style={{ marginTop: 12 }}>
                    <button className="demo-btn demo-btn--primary" onClick={() => pushLog("Profile saved")}>
                      Save Profile
                    </button>
                    <button className="demo-btn" onClick={() => { setDisplayName("Player1"); setBio(""); pushLog("Profile reset"); }}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>

              <div className="sandbox-stats">
                <h3>Your Stats</h3>
                <div className="demo-cards">
                  <div className="demo-card">
                    <span className="demo-card__title">{scores.X + scores.O + scores.draw}</span>
                    <span className="demo-card__sub">Games Played</span>
                  </div>
                  <div className="demo-card">
                    <span className="demo-card__title">{scores.X}</span>
                    <span className="demo-card__sub">Wins</span>
                  </div>
                  <div className="demo-card">
                    <span className="demo-card__title">{scores.O}</span>
                    <span className="demo-card__sub">Losses</span>
                  </div>
                  <div className="demo-card">
                    <span className="demo-card__title">{scores.draw}</span>
                    <span className="demo-card__sub">Draws</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ════════════ SETTINGS TAB ════════════ */}
          {tab === "settings" && (
            <>
              <h2>Settings</h2>
              <p className="demo-hint">
                Navigate with <kbd>D-Pad</kbd>, press <kbd>A</kbd> to toggle checkboxes.
                These are dummy toggles to test gamepad interaction with form controls.
              </p>
              <div className="sandbox-settings-list">
                <label className="sandbox-toggle">
                  <input type="checkbox" checked={soundOn} onChange={() => { setSoundOn((s) => !s); pushLog(`Sound: ${soundOn ? 'on → off' : 'off → on'}`); }} />
                  <span className="sandbox-toggle__label">Sound Effects</span>
                  <span className="sandbox-toggle__hint">Play audio on moves and wins</span>
                </label>
                <label className="sandbox-toggle">
                  <input type="checkbox" checked={vibration} onChange={() => { setVibration((s) => !s); pushLog(`Vibration: ${vibration ? 'on → off' : 'off → on'}`); }} />
                  <span className="sandbox-toggle__label">Vibration</span>
                  <span className="sandbox-toggle__hint">Haptic feedback on button press</span>
                </label>
                <label className="sandbox-toggle">
                  <input type="checkbox" checked={showHints} onChange={() => { setShowHints((s) => !s); pushLog(`Hints: ${showHints ? 'on → off' : 'off → on'}`); }} />
                  <span className="sandbox-toggle__label">Show Hints</span>
                  <span className="sandbox-toggle__hint">Display control hints below the board</span>
                </label>
                <label className="sandbox-toggle">
                  <input type="checkbox" checked={darkMode} onChange={() => { setDarkMode((s) => !s); pushLog(`Dark Mode: ${darkMode ? 'on → off' : 'off → on'}`); }} />
                  <span className="sandbox-toggle__label">Dark Mode</span>
                  <span className="sandbox-toggle__hint">Toggle between dark and light theme</span>
                </label>
              </div>

              <div className="sandbox-danger">
                <h3>Danger Zone</h3>
                <div className="demo-row">
                  <button className="demo-btn sandbox-btn--danger" onClick={() => { setScores({ X: 0, O: 0, draw: 0 }); pushLog("Scores reset"); }}>
                    Reset All Scores
                  </button>
                  <button className="demo-btn sandbox-btn--danger" onClick={() => pushLog("Account deleted (stub)")}>
                    Delete Account
                  </button>
                </div>
              </div>
            </>
          )}

        </div>
      </main>

      {/* ── ACTION LOG SIDEBAR ──────────────────────────────── */}
      <aside className="demo-log">
        <div className="demo-log__title">Action Log</div>
        {log.length === 0
          ? <p style={{ fontSize: 11, color: "var(--muted)" }}>Interact with the page...</p>
          : log.map((entry, i) => <p key={i} className="demo-log__entry">{entry}</p>)
        }
      </aside>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="sandbox-footer">
        <span>PADSIM PSG1 Sandbox v0.1.0</span>
        <span className="sandbox-footer__sep">|</span>
        <span>{walletConnected ? "Wallet: 0x1a2b...c3d4" : "No wallet"}</span>
        <span className="sandbox-footer__sep">|</span>
        <a href="/" className="sandbox-footer__link">Back to Demo Home</a>
      </footer>
    </div>
  );
}
