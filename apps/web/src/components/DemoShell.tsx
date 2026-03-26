"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useGamepadPoll, useGamepadAction } from "@/hooks/useGamepad";

/**
 * PSG1 simulator — only loaded when ?gp is in the URL.
 * Zero bytes in production builds.
 */
const GamepadDebugBridge = dynamic(() => import("./GamepadDebugBridge"), { ssr: false });
const VirtualKeyboard = dynamic(() => import("./VirtualKeyboard"), { ssr: false });

const TABS = ["Lobby", "Profile", "Leaderboard", "Admin"] as const;
type Tab = (typeof TABS)[number];

/**
 * DemoShell — interactive testbed for the PSG1 simulator.
 *
 * Shows devs exactly what classes and patterns they need to integrate:
 *  - .gp-cycleable on nav tabs (L1/R1 cycles these)
 *  - .app-shell__main on the scrollable content zone (D-pad + right-stick navigate inside)
 *  - useGamepadPoll() mounted at component root
 *  - useGamepadAction() for semantic actions (confirm, back, refresh, select, start)
 *
 * Activate: add ?gp to any URL in this app
 */
export default function DemoShell() {
  const [activeTab, setActiveTab] = useState<Tab>("Lobby");
  const [log, setLog] = useState<string[]>(["Ready \u2014 add ?gp to the URL to activate the simulator."]);
  const [inputValue, setInputValue] = useState("");

  // Mount the hardware polling loop once (works with real gamepad OR the simulator)
  useGamepadPoll();

  // Listen for semantic actions dispatched by the simulator / real hardware
  useGamepadAction((action) => {
    const msg = `[gamepad-action] ${action}`;
    setLog((prev) => [msg, ...prev.slice(0, 14)]);

    if (action === "refresh") {
      setLog((prev) => ["[Y] refreshed", ...prev.slice(0, 14)]);
    }
    if (action === "select") {
      setLog((prev) => ["[Select] wallet connect/disconnect", ...prev.slice(0, 14)]);
    }
    if (action === "back") {
      setLog((prev) => ["[B] back / cancel dispatched", ...prev.slice(0, 14)]);
    }
    if (action === "start") {
      setLog((prev) => ["[Start] navigate to mode gate", ...prev.slice(0, 14)]);
    }
  });

  // Only load the simulator overlay when ?gp is in the URL
  const gpDebug =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).has("gp");

  return (
    <div className="demo-root">
      {/* ── Header / navigation zone ─────────────────────────────── */}
      <header className="demo-header">
        <div className="demo-header__brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/io-logo-80.png" alt="I.O." width={32} height={32} />
          <span className="demo-header__title">PSG1 Demo</span>
        </div>

        {/* These tabs get .gp-cycleable — L1 / R1 moves between them */}
        <nav className="demo-tabs" aria-label="Main navigation">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`demo-tab gp-cycleable${activeTab === tab ? " demo-tab--active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="demo-header__actions">
          <button className="demo-btn gp-cycleable" onClick={() => setLog([])}>
            Clear log
          </button>
        </div>
      </header>

      {/* ── Content zone — D-pad / right-stick navigates inside this ─ */}
      <main className="app-shell__main demo-main">
        {activeTab === "Lobby" && (
          <section className="demo-section">
            <h2>Lobby — Navigate with D-pad</h2>
            <p className="demo-hint">
              Press <kbd>?gp</kbd> in the URL to open the simulator overlay. Use{" "}
              <kbd>L1</kbd>/<kbd>R1</kbd> to cycle tabs, <kbd>D-pad</kbd> to move between items
              below, <kbd>A</kbd> to click.
            </p>

            <div className="demo-cards">
              {Array.from({ length: 6 }, (_, i) => (
                <button
                  key={i}
                  className="demo-card"
                  onClick={() => setLog((p) => [`Clicked card ${i + 1}`, ...p.slice(0, 14)])}
                >
                  <span className="demo-card__title">Match #{i + 1}</span>
                  <span className="demo-card__sub">Waiting for player…</span>
                </button>
              ))}
            </div>

            <div className="demo-row">
              <button
                className="demo-btn demo-btn--primary"
                onClick={() => setLog((p) => ["Create Match clicked", ...p.slice(0, 14)])}
              >
                Create Match
              </button>
              <button
                className="demo-btn"
                onClick={() => setLog((p) => ["Join Match clicked", ...p.slice(0, 14)])}
              >
                Join Match
              </button>
            </div>

            <div className="demo-field">
              <label htmlFor="demo-search">Search (A opens virtual keyboard):</label>
              <input
                id="demo-search"
                type="text"
                placeholder="Type to search…"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="demo-input"
              />
            </div>
          </section>
        )}

        {activeTab === "Profile" && (
          <section className="demo-section">
            <h2>Profile</h2>
            <div className="demo-profile">
              <div className="demo-avatar" />
              <div>
                <p><strong>Handle:</strong> Player One</p>
                <p><strong>Wins:</strong> 42</p>
                <p><strong>Losses:</strong> 17</p>
                <p><strong>Street Cred:</strong> ████░ 82%</p>
              </div>
            </div>
            <button className="demo-btn demo-btn--primary">Edit Profile</button>
          </section>
        )}

        {activeTab === "Leaderboard" && (
          <section className="demo-section">
            <h2>Leaderboard</h2>
            {Array.from({ length: 8 }, (_, i) => (
              <button
                key={i}
                className="demo-leaderboard-row"
                onClick={() => setLog((p) => [`Viewed player ${i + 1}`, ...p.slice(0, 14)])}
              >
                <span className="demo-rank">#{i + 1}</span>
                <span className="demo-name">Player {i + 1}</span>
                <span className="demo-wins">{120 - i * 14} W</span>
              </button>
            ))}
          </section>
        )}

        {activeTab === "Admin" && (
          <section className="demo-section">
            <h2>Admin</h2>
            <p className="demo-hint">Reserved zone — requires authority wallet.</p>
            <button className="demo-btn" disabled>Ban Player</button>
            <button className="demo-btn" disabled>Reset Reputation</button>
          </section>
        )}
      </main>

      {/* ── Event log sidebar ──────────────────────────────────────── */}
      <aside className="demo-log">
        <p className="demo-log__title">ACTION LOG</p>
        {log.map((entry, i) => (
          <p key={i} className="demo-log__entry">{entry}</p>
        ))}
      </aside>

      {/* ── PSG1 Simulator overlay (conditional) ──────────────────── */}
      {gpDebug && (
        <>
          <GamepadDebugBridge />
          <VirtualKeyboard />
        </>
      )}
    </div>
  );
}
