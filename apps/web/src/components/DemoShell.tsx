"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useGamepadPoll, useGamepadAction } from "@/hooks/useGamepad";
import { useGamepadMapper, useGamepadCallbacks } from "@/hooks/useGamepadMapper";
import { type Psg1Mapping } from "@/lib/psg1-mapper";

/**
 * PSG1 simulator — only loaded when ?gp is in the URL.
 * Zero bytes in production builds.
 */
const GamepadDebugBridge = dynamic(() => import("./GamepadDebugBridge"), { ssr: false });
const VirtualKeyboard = dynamic(() => import("./VirtualKeyboard"), { ssr: false });

const TABS = ["Lobby", "Profile", "Leaderboard", "Admin", "Mapper"] as const;
type Tab = (typeof TABS)[number];

/**
 * Demo mapping — routes PSG1 actions to custom-event adapters.
 * Defined outside the component so it never triggers a re-install.
 */
const DEMO_MAPPING: Psg1Mapping = {
  version: "1",
  name: "PSG1 Demo Mapping",
  actions: {
    confirm: { type: "custom-event", event: "psg1demo:confirm", detail: { action: "confirm" } },
    back:    { type: "custom-event", event: "psg1demo:back",    detail: { action: "back" }    },
    refresh: { type: "custom-event", event: "psg1demo:refresh", detail: { action: "refresh" } },
    select:  { type: "custom-event", event: "psg1demo:select",  detail: { action: "select" }  },
    start:   { type: "custom-event", event: "psg1demo:start",   detail: { action: "start" }   },
    home:    { type: "postMessage",  message: { type: "PSG1_HOME" } },
  },
};

/**
 * DemoShell — interactive testbed for the PSG1 simulator.
 *
 * Shows devs exactly what classes and patterns they need to integrate:
 *  - .gp-cycleable on nav tabs (L1/R1 cycles these)
 *  - .app-shell__main on the scrollable content zone (D-pad + right-stick navigate inside)
 *  - useGamepadPoll() mounted at component root
 *  - useGamepadAction() for semantic actions (confirm, back, refresh, select, start)
 *  - useGamepadMapper() for declarative action → adapter routing
 *
 * Activate: add ?gp to any URL in this app
 */
export default function DemoShell() {
  const [activeTab, setActiveTab] = useState<Tab>("Lobby");
  const [log, setLog] = useState<string[]>(["Ready — add ?gp to the URL to activate the simulator."]);
  const [inputValue, setInputValue] = useState("");
  const [mapperLog, setMapperLog] = useState<string[]>([
    "Mapper active — buttons fire both logs simultaneously.",
  ]);
  const [callbackHit, setCallbackHit] = useState<string | null>(null);

  // Mount the hardware polling loop once (works with real gamepad OR the simulator)
  useGamepadPoll();

  // ── Mapper: named callbacks for { type: "callback" } adapters ──────────
  // Register before installPsg1Mapper so the callbacks are ready when the
  // first action fires.
  useGamepadCallbacks({
    demoCallback: () => {
      setCallbackHit("demoCallback fired at " + new Date().toLocaleTimeString());
      setMapperLog((p) => ["[callback] demoCallback executed ✓", ...p.slice(0, 19)]);
    },
  });

  // ── Mapper: install DEMO_MAPPING (routes actions to custom-events) ──────
  // This runs alongside useGamepadAction — both receive every action.
  // The Mapper tab shows the routing; the main log shows all actions.
  useGamepadMapper(DEMO_MAPPING);

  // ── Listen for events emitted by custom-event adapters ──────────────────
  useEffect(() => {
    const DEMO_EVENTS = ["psg1demo:confirm", "psg1demo:back", "psg1demo:refresh", "psg1demo:select", "psg1demo:start"] as const;
    const handlers: Array<[string, EventListener]> = DEMO_EVENTS.map((evtName) => {
      const handler: EventListener = (e) => {
        const detail = (e as CustomEvent).detail;
        setMapperLog((p) => [
          `[custom-event] "${evtName}" dispatched  detail: ${JSON.stringify(detail)}`,
          ...p.slice(0, 19),
        ]);
      };
      window.addEventListener(evtName, handler);
      return [evtName, handler];
    });
    return () => {
      for (const [name, h] of handlers) window.removeEventListener(name, h);
    };
  }, []);

  // ── useGamepadAction: semantic actions from hardware / simulator ─────────
  useGamepadAction((action) => {
    setLog((prev) => [`[gamepad-action] ${action}`, ...prev.slice(0, 14)]);
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

        {activeTab === "Mapper" && (
          <section className="demo-section">
            <h2>PSG1 Mapper Demo</h2>
            <p className="demo-hint">
              Every PSG1 action fires in <em>two places simultaneously</em>:
              the ACTION LOG (via <code>useGamepadAction</code>) and the MAPPER LOG
              below (via <code>useGamepadMapper</code> → custom-event adapter → window listener).
              This shows both layers working in parallel.
            </p>

            {/* ── Active mapping display ─────────────────────────────── */}
            <div className="mapper-card">
              <p className="mapper-card__title">Active Mapping — <em>{DEMO_MAPPING.name}</em></p>
              <table className="mapper-table">
                <thead>
                  <tr>
                    <th>PSG1 Action</th>
                    <th>Adapter Type</th>
                    <th>Target</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(DEMO_MAPPING.actions).map(([action, adapter]) => (
                    <tr key={action}>
                      <td><code className="mapper-action">{action}</code></td>
                      <td><span className={`mapper-badge mapper-badge--${adapter.type}`}>{adapter.type}</span></td>
                      <td className="mapper-target">
                        {adapter.type === "custom-event" && <code>{adapter.event}</code>}
                        {adapter.type === "dom-click"    && <code>{adapter.selector}</code>}
                        {adapter.type === "postMessage"  && <code>{JSON.stringify(adapter.message)}</code>}
                        {adapter.type === "callback"     && <code>{adapter.callbackId}</code>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Callback adapter demo ──────────────────────────────── */}
            <div className="mapper-card">
              <p className="mapper-card__title">Callback Adapter — fire directly from a button</p>
              <p className="demo-hint">
                Add <code>{"{ type: \"callback\", callbackId: \"demoCallback\" }"}</code> to your
                mapping JSON. Register the function via <code>registerPsg1Callback()</code> or{" "}
                <code>useGamepadCallbacks()</code>.
              </p>
              <button
                id="mapper-demo-callback-btn"
                className="demo-btn demo-btn--primary"
                onClick={() => {
                  setCallbackHit("demoCallback fired at " + new Date().toLocaleTimeString());
                  setMapperLog((p) => ["[callback] demoCallback executed ✓ (click test)", ...p.slice(0, 19)]);
                }}
              >
                Fire demoCallback
              </button>
              {callbackHit && (
                <p className="mapper-callback-hit">✓ {callbackHit}</p>
              )}
            </div>

            {/* ── dom-click adapter demo ─────────────────────────────── */}
            <div className="mapper-card">
              <p className="mapper-card__title">DOM-Click Adapter — wire a mapping to any element</p>
              <p className="demo-hint">
                Add <code>{"{ type: \"dom-click\", selector: \"#mapper-target-btn\" }"}</code> to
                your mapping. When the mapped action fires, PSG1 calls{" "}
                <code>.click()</code> on the first visible match.
              </p>
              <button
                id="mapper-target-btn"
                className="demo-btn"
                onClick={() =>
                  setMapperLog((p) => ["[dom-click] #mapper-target-btn clicked ✓", ...p.slice(0, 19)])
                }
              >
                I am #mapper-target-btn
              </button>
            </div>

            {/* ── Mapper event log ──────────────────────────────────────── */}
            <div className="mapper-card mapper-card--log">
              <p className="mapper-card__title">MAPPER LOG</p>
              {mapperLog.map((entry, i) => (
                <p key={i} className="demo-log__entry">{entry}</p>
              ))}
            </div>
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
