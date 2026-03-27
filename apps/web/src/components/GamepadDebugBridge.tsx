"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { gamepadBus, useGamepadAction, type GamepadAction } from "../hooks/useGamepad";
import {
  getGpFocused,
  cycleHeader,
  spatialNav,
  scrollContent,
  closeModal,
  isModalOpen,
} from "../lib/gamepad-nav";
import {
  isVirtualKeyboardOpen,
  openVirtualKeyboard,
  dispatchVkAction,
} from "./VirtualKeyboard";
import { getActivePsg1Mapping } from "../lib/psg1-mapper";

/** Pixels per press for left-stick simulator buttons. */
const CURSOR_STEP = 30;

/** Cancel-type keywords matched in button text (case-insensitive). */
const CANCEL_WORDS = /^(cancel|no|close|back|dismiss|nevermind|not now)$/i;

/**
 * Find the nearest visible cancel-type button in the CURRENT context only.
 * When a modal/dialog is open, searches ONLY within it - never behind it.
 * Never searches document.body to avoid clicking unrelated transaction buttons.
 */
function findCancelButton(): HTMLElement | null {
  const dialog = document.querySelector<HTMLElement>("dialog[open], .modal--open, [role='dialog']");
  if (dialog) {
    for (const btn of dialog.querySelectorAll<HTMLElement>("button")) {
      const text = (btn.textContent ?? "").trim();
      if (CANCEL_WORDS.test(text) && btn.offsetParent !== null) return btn;
    }
    return null;
  }

  const focused = getGpFocused();
  if (focused) {
    const section = focused.closest(".profile-edit, .wallet-panel, .admin-reset, .admin-ban, form, section");
    if (section) {
      for (const btn of section.querySelectorAll<HTMLElement>("button")) {
        const text = (btn.textContent ?? "").trim();
        if (CANCEL_WORDS.test(text) && btn.offsetParent !== null) return btn;
      }
    }
  }

  return null;
}

function dispatch(action: GamepadAction) {
  gamepadBus?.dispatchEvent(new CustomEvent("gamepad-action", { detail: action }));
}

function moveCursor(dx: number, dy: number) {
  gamepadBus?.dispatchEvent(
    new CustomEvent("gamepad-cursor-move", { detail: { dx, dy } }),
  );
}

/* â”€â”€ Shared button press handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function pressButton(id: string) {
  if (isVirtualKeyboardOpen()) {
    dispatchVkAction(id);
    return;
  }

  const modal = isModalOpen();

  switch (id) {
    case "l1":
      if (!modal) cycleHeader(-1);
      break;
    case "r1":
      if (!modal) cycleHeader(1);
      break;

    case "up": spatialNav("up"); break;
    case "down": spatialNav("down"); break;
    case "left": spatialNav("left"); break;
    case "right": spatialNav("right"); break;

    case "a": {
      const focused = getGpFocused();
      if (focused && document.contains(focused)) {
        const tag = focused.tagName;
        const inputType = (focused as HTMLInputElement).type?.toLowerCase() ?? "";
        const isTextInput = (tag === "INPUT" && !["checkbox", "radio", "submit", "button", "reset", "file", "range", "color"].includes(inputType)) || tag === "TEXTAREA";
        if (isTextInput) {
          openVirtualKeyboard(focused as HTMLInputElement | HTMLTextAreaElement);
          break;
        }
        focused.click();
      } else {
        const cursor = document.querySelector<HTMLElement>(".gamepad-cursor");
        if (cursor && cursor.style.opacity !== "0") {
          const rect = cursor.getBoundingClientRect();
          const el = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
          if (el instanceof HTMLElement) el.click();
        } else {
          dispatch("confirm");
        }
      }
      break;
    }

    case "b": {
      const cancel = findCancelButton();
      if (cancel) cancel.click();
      else if (modal) closeModal();
      else dispatch("back");
      break;
    }

    case "y":
      if (modal) closeModal();
      else dispatch("refresh");
      break;

    case "x":
      break;

    case "select":
      dispatch("select");
      break;

    case "start":
      dispatch("start");
      break;

    case "l3": dispatch("l3"); break;

    case "r3": {
      const focused = document.querySelector<HTMLElement>(".gp-focus");
      if (focused && document.contains(focused)) { focused.click(); break; }
      const cursor = document.querySelector<HTMLElement>(".gamepad-cursor");
      if (cursor && cursor.style.opacity !== "0") {
        const rect = cursor.getBoundingClientRect();
        const el = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        if (el instanceof HTMLElement) el.click();
      }
      break;
    }

    case "home":
      dispatch("home");
      break;

    case "lstick-up": moveCursor(0, -CURSOR_STEP); break;
    case "lstick-down": moveCursor(0, CURSOR_STEP); break;
    case "lstick-left": moveCursor(-CURSOR_STEP, 0); break;
    case "lstick-right": moveCursor(CURSOR_STEP, 0); break;

    case "rstick-up": scrollContent("up"); break;
    case "rstick-down": scrollContent("down"); break;
    case "rstick-left": spatialNav("left"); break;
    case "rstick-right": spatialNav("right"); break;
  }
}

/* â”€â”€ Keyboard mapping â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const KEY_MAP: Record<string, string> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  Enter: "a",
  Backspace: "b",
  x: "x",
  X: "x",
  y: "y",
  Y: "y",
  "[": "l1",
  "]": "r1",
  Tab: "select",
  " ": "start",
  q: "l3",
  Q: "l3",
  e: "r3",
  E: "r3",
  h: "home",
  H: "home",
};

/* â”€â”€ Settings panel data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

type SettingsPanel = "log" | "map" | "guide";

const BTN_REF: [string, string, string][] = [
  ["A",         "Confirm / Click",  "Enter"],
  ["B",         "Back / Cancel",    "Bksp"],
  ["X",         "Reserved",         "X"],
  ["Y",         "Refresh",          "Y"],
  ["L1",        "<- Cycle tabs",     "["],
  ["R1",        "-> Cycle tabs",     "]"],
  ["D-Pad",     "Navigate",         "Arrows"],
  ["L-Stick",   "Move pointer",     "-"],
  ["R-Stick U/D", "Scroll",           "-"],
  ["R-Stick L/R", "Navigate",         "-"],
  ["Select",    "Wallet",           "Tab"],
  ["Start",     "Gate / Menu",      "Space"],
  ["Home",      "App menu",         "H"],
  ["L3",        "Reserved",         "Q"],
  ["R3",        "Click cursor",     "E"],
];

const GUIDE_STEPS: [string, string, string][] = [
  ["1", "Wrap your app root", "<GameApp>\n  {children}\n</GameApp>"],
  ["2", "Mark nav tabs", 'className="gp-cycleable"'],
  ["3", "Mark content zone", 'className="app-shell__main"'],
  ["4", "React to actions (optional)", "useGamepadAction(action => {\n  if (action === 'confirm') ...\n})"],
  ["5", "Install a mapper (optional)", "installPsg1Mapper({\n  version: '1',\n  actions: {\n    confirm: {\n      type: 'custom-event',\n      event: 'game:confirm'\n    }\n  }\n})"],
];

/* â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/**
 * PSG1 gamepad simulator - fixed bottom-right corner widget.
 *
 * Contains:
 *  - The physical controller pad (tap buttons or use keyboard shortcuts)
 *  - "PADSIM Map Settings" toggle above the pad
 *  - Settings panel with three tabs:
 *      Live Log   - real-time stream of every PSG1 action fired
 *      Button Map - default action + keyboard shortcut for every input
 *      Integrate  - copy-paste integration guide for devs
 *
 * Keyboard: â†â†‘â†’â†“=D-pad, Enter=A, Backspace=B, X=Context, Y=Refresh,
 * []=L1/R1, Tab=Select, Space=Start, Q/E=L3/R3, H=Home
 */
export default function GamepadDebugBridge() {
  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<SettingsPanel>("log");
  const [actionLog, setActionLog] = useState<string[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  // â”€â”€ Live action log for the settings panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useGamepadAction((action) => {
    setActionLog((prev) => [
      `${new Date().toLocaleTimeString("en-US", { hour12: false })} - ${action}`,
      ...prev.slice(0, 29),
    ]);
  });

  // â”€â”€ Portal into modal dialogs so simulator stays interactive â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const check = () => {
      const dialog = document.querySelector<HTMLDialogElement>("dialog[open]");
      if (dialog) {
        let container = dialog.querySelector<HTMLElement>(".gp-sim-portal");
        if (!container) {
          container = document.createElement("div");
          container.className = "gp-sim-portal";
          container.style.display = "contents";
          dialog.appendChild(container);
        }
        setPortalTarget(container);
      } else {
        setPortalTarget(null);
      }
    };

    const observer = new MutationObserver(check);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["open"],
    });
    check();
    return () => observer.disconnect();
  }, []);

  const handlePress = useCallback((id: string) => {
    pressButton(id);
    setFlash(id);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 150);
  }, []);

  // â”€â”€ Keyboard bridge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (isVirtualKeyboardOpen()) {
        const id = KEY_MAP[e.key];
        if (!id) return;
        e.preventDefault();
        handlePress(id);
        return;
      }

      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const id = KEY_MAP[e.key];
      if (!id) return;
      e.preventDefault();
      handlePress(id);
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handlePress]);

  const btn = (id: string, label: string, sub?: string) => (
    <button
      className={`gp-sim__btn gp-sim__btn--${id}${flash === id ? " gp-sim__btn--flash" : ""}`}
      onPointerDown={(e) => { e.stopPropagation(); handlePress(id); }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      aria-label={label}
    >
      <span className="gp-sim__label">{label}</span>
      {sub && <span className="gp-sim__sub">{sub}</span>}
    </button>
  );

  // Read active mapping snapshot only when the map tab is open
  const mapping = settingsOpen && activePanel === "map" ? getActivePsg1Mapping() : null;

  const sim = (
    <div className={`gp-sim${collapsed ? " gp-sim--collapsed" : ""}`}>

      {/* â”€â”€ Settings panel - shown above controller when open â”€â”€ */}
      {settingsOpen && !collapsed && (
        <div className="gp-sim__panel">
          <div className="gp-sim__panel-header">
            <span className="gp-sim__panel-title">PADSIM Map Settings</span>
            <button
              className="gp-sim__panel-close"
              onClick={() => setSettingsOpen(false)}
              aria-label="Close settings"
            >X</button>
          </div>

          <div className="gp-sim__panel-tabs">
            {(["log", "map", "guide"] as SettingsPanel[]).map((tab) => (
              <button
                key={tab}
                className={`gp-sim__panel-tab${activePanel === tab ? " gp-sim__panel-tab--active" : ""}`}
                onClick={() => setActivePanel(tab)}
              >
                {tab === "log" ? "Live Log" : tab === "map" ? "Button Map" : "Integrate"}
              </button>
            ))}
          </div>

          <div className="gp-sim__panel-body">

            {/* â”€â”€ Live Log tab â”€â”€ */}
            {activePanel === "log" && (
              <div className="gp-sim__log">
                {actionLog.length === 0
                  ? <p className="gp-sim__log-empty">Press any button to see events here...</p>
                  : actionLog.map((entry, i) => (
                      <p key={i} className={`gp-sim__log-entry${i === 0 ? " gp-sim__log-entry--new" : ""}`}>
                        {entry}
                      </p>
                    ))
                }
              </div>
            )}

            {/* â”€â”€ Button Map tab â”€â”€ */}
            {activePanel === "map" && (
              <div className="gp-sim__ref">
                <table className="gp-sim__ref-table">
                  <thead>
                    <tr>
                      <th>Button</th>
                      <th>Default action</th>
                      <th>Key</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BTN_REF.map(([b, action, key]) => (
                      <tr key={b}>
                        <td><code className="gp-sim__ref-btn">{b}</code></td>
                        <td className="gp-sim__ref-action">{action}</td>
                        <td><kbd className="gp-sim__ref-kbd">{key}</kbd></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {mapping && (
                  <div className="gp-sim__ref-mapping">
                    <p className="gp-sim__ref-mapping-title">
                      Active mapping: <em>{mapping.name ?? "Unnamed"}</em>
                    </p>
                    <table className="gp-sim__ref-table">
                      <thead>
                        <tr><th>Action</th><th>Adapter to target</th></tr>
                      </thead>
                      <tbody>
                        {Object.entries(mapping.actions).map(([action, adapter]) => (
                          <tr key={action}>
                            <td><code className="gp-sim__ref-btn">{action}</code></td>
                            <td className="gp-sim__ref-action">
                              {adapter.type === "custom-event" && adapter.event}
                              {adapter.type === "dom-click"    && adapter.selector}
                              {adapter.type === "postMessage"  && `postMessage:${adapter.message.type}`}
                              {adapter.type === "callback"     && `cb:${adapter.callbackId}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* â”€â”€ Integration guide tab â”€â”€ */}
            {activePanel === "guide" && (
              <div className="gp-sim__guide">
                {GUIDE_STEPS.map(([num, label, code]) => (
                  <div key={num} className="gp-sim__guide-step">
                    <span className="gp-sim__guide-num">{num}</span>
                    <div>
                      <p className="gp-sim__guide-label">{label}</p>
                      <pre className="gp-sim__guide-code">{code}</pre>
                    </div>
                  </div>
                ))}
                <p className="gp-sim__guide-hint">
                  Full docs: <code>docs/INTEGRATE.md</code>
                </p>
              </div>
            )}

          </div>
        </div>
      )}

      {/* â”€â”€ Settings toggle button - between panel and controller â”€â”€ */}
      {!collapsed && (
        <button
          className={`gp-sim__settings-btn${settingsOpen ? " gp-sim__settings-btn--open" : ""}`}
          onClick={() => setSettingsOpen((s) => !s)}
          aria-label={settingsOpen ? "Close PSG1 settings" : "Open PSG1 map settings"}
        >
          PADSIM Map Settings {settingsOpen ? "[-]" : "[+]"}
        </button>
      )}

      {/* â”€â”€ Controller pad â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="gp-sim__controller">
        <button
          className="gp-sim__toggle"
          onClick={() => {
            setCollapsed((c) => {
              if (!c) setSettingsOpen(false);
              return !c;
            });
          }}
          aria-label={collapsed ? "Expand PSG1 simulator" : "Collapse PSG1 simulator"}
        >
          {collapsed ? "PSG1" : "X"}
        </button>

        {!collapsed && (
          <div className="gp-sim__body">
            {/* Centred I.O. watermark behind glass buttons */}
            <div className="gp-sim__watermark" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/io-logo-80.png" alt="" width={256} height={256} className="gp-sim__watermark-img" />
              <span className="gp-sim__watermark-credit">By: i.O.</span>
            </div>
            <div className="gp-sim__title">PSG1 MAPPING SIM</div>
            <div className="gp-sim__subtitle">PlaySolana Gamepad 1</div>

            {/* â”€â”€ SHOULDERS â”€â”€ */}
            <div className="gp-sim__section-label">SHOULDERS</div>
            <div className="gp-sim__shoulders">
              {btn("l1", "L1", "Hdr <")}
              {btn("r1", "R1", "Hdr >")}
            </div>

            {/* â”€â”€ D-PAD + FACE â”€â”€ */}
            <div className="gp-sim__main">
              <div className="gp-sim__zone">
                <div className="gp-sim__section-label">D-PAD</div>
                <div className="gp-sim__dpad">
                  {btn("up", "Up", "Nav")}
                  <div className="gp-sim__dpad-row">
                    {btn("left", "Lt", "Nav")}
                    <div className="gp-sim__dpad-gap" />
                    {btn("right", "Rt", "Nav")}
                  </div>
                  {btn("down", "Dn", "Nav")}
                </div>
              </div>

              <div className="gp-sim__zone">
                <div className="gp-sim__section-label">FACE</div>
                <div className="gp-sim__face">
                  {btn("x", "X", "-")}
                  <div className="gp-sim__face-row">
                    {btn("y", "Y", "Refresh")}
                    {btn("a", "A", "Confirm")}
                  </div>
                  {btn("b", "B", "Back")}
                </div>
              </div>
            </div>

            {/* â”€â”€ CENTER â”€â”€ */}
            <div className="gp-sim__credit">By: I.O.</div>
            <div className="gp-sim__bottom">
              {btn("select", "Sel", "Wallet")}
              {btn("home", "Home", "Menu")}
              {btn("start", "Start", "Gate")}
            </div>

            {/* â”€â”€ STICKS â”€â”€ */}
            <div className="gp-sim__sticks">
              <div className="gp-sim__stick">
                <div className="gp-sim__section-label">L-STICK</div>
                <div className="gp-sim__stick-sublabel">Pointer (moju)</div>
                <div className="gp-sim__dpad gp-sim__dpad--stick">
                  {btn("lstick-up", "Up", "Move")}
                  <div className="gp-sim__dpad-row">
                    {btn("lstick-left", "Lt", "Move")}
                    {btn("l3", "L3", "Push")}
                    {btn("lstick-right", "Rt", "Move")}
                  </div>
                  {btn("lstick-down", "Dn", "Move")}
                </div>
              </div>

              <div className="gp-sim__stick">
                <div className="gp-sim__section-label">R-STICK</div>
                <div className="gp-sim__stick-sublabel">Scroll / Nav</div>
                <div className="gp-sim__dpad gp-sim__dpad--stick">
                  {btn("rstick-up", "Up", "Scroll")}
                  <div className="gp-sim__dpad-row">
                    {btn("rstick-left", "Lt", "Nav")}
                    {btn("r3", "R3", "Click")}
                    {btn("rstick-right", "Rt", "Nav")}
                  </div>
                  {btn("rstick-down", "Dn", "Scroll")}
                </div>
              </div>
            </div>

            {/* Zone legend */}
            <div className="gp-sim__mode">
              PSG1 | L1/R1 Shoulders | D-Pad Nav | Face A/B/X/Y | L3/R3 Push
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return portalTarget ? createPortal(sim, portalTarget) : sim;
}
