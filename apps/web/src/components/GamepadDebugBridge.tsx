"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { gamepadBus, type GamepadAction } from "../hooks/useGamepad";
import {
  getFocusablesIn,
  getGpFocused,
  setGpFocus,
  cycleHeader,
  getContentContainer,
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

/** Pixels per press for left-stick simulator buttons (single tap). */
const CURSOR_STEP = 30;

/** Continuous movement speed while a L-stick direction is held (px/frame). Matches hardware POINTER_SPEED. */
const CONTINUOUS_SPEED = 6;

/** Returns per-frame delta for L-stick hold movement, or null if not an L-stick direction. */
function stickDelta(id: string): { dx: number; dy: number } | null {
  switch (id) {
    case "lstick-up":    return { dx: 0,                 dy: -CONTINUOUS_SPEED };
    case "lstick-down":  return { dx: 0,                 dy:  CONTINUOUS_SPEED };
    case "lstick-left":  return { dx: -CONTINUOUS_SPEED, dy: 0 };
    case "lstick-right": return { dx:  CONTINUOUS_SPEED, dy: 0 };
    default: return null;
  }
}

/** Cancel-type keywords matched in button text (case-insensitive). */
const CANCEL_WORDS = /^(cancel|no|close|back|dismiss|nevermind|not now)$/i;

/**
 * Find the nearest visible cancel-type button in the CURRENT context only.
 * When a modal/dialog is open, searches ONLY within it — never behind it.
 * Never searches document.body to avoid clicking unrelated transaction buttons.
 */
function findCancelButton(): HTMLElement | null {
  // If a dialog/modal is open, search ONLY within it.
  const dialog = document.querySelector<HTMLElement>("dialog[open], .modal--open, [role='dialog']");
  if (dialog) {
    for (const btn of dialog.querySelectorAll<HTMLElement>("button")) {
      const text = (btn.textContent ?? "").trim();
      if (CANCEL_WORDS.test(text) && btn.offsetParent !== null) return btn;
    }
    // No cancel-text match in modal — return null so caller uses closeModal() instead.
    return null;
  }

  // No modal — search only the focused element's immediate section/form.
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

  // Never fall through to document.body — too dangerous (can click unrelated tx buttons).
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

/* ── Shared button press handler ─────────────────────────────── */

function pressButton(id: string) {
  /* If the virtual keyboard is open, route everything to it */
  if (isVirtualKeyboardOpen()) {
    dispatchVkAction(id);
    return;
  }

  const modal = isModalOpen();

  switch (id) {
    /* Shoulder: header zone cycling */
    case "l1":
      if (!modal) cycleHeader(-1);
      break;
    case "r1":
      if (!modal) cycleHeader(1);
      break;

    /* D-pad: spatial content navigation (L1/R1 handle header cycling) */
    case "up": spatialNav("up"); break;
    case "down": spatialNav("down"); break;
    case "left": spatialNav("left"); break;
    case "right": spatialNav("right"); break;

    /* A: click focused element or open virtual keyboard for text inputs */
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
        // Focus stays on the clicked element — user moves it with D-pad
      } else {
        // Moju pointer fallback — click element under cursor (matches hardware)
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

    /* B: cancel / back / close modal */
    case "b": {
      const cancel = findCancelButton();
      if (cancel) cancel.click();
      else if (modal) closeModal();
      else dispatch("back");
      break;
    }

    /* Y: close modal if open, otherwise dispatch refresh */
    case "y":
      if (modal) closeModal();
      else dispatch("refresh");
      break;

    /* X: reserved (unused) */
    case "x":
      break;


    /* Select: wallet connect/disconnect */
    case "select":
      dispatch("select");
      break;

    /* Start: navigate to terms / mode-select gate */
    case "start":
      dispatch("start");
      break;

    /* L3: left stick press (reserved) */
    case "l3": dispatch("l3"); break;

    /* R3: same as A — click focused/hovered. Wallet signing confirm is in
       the extension popup (outside DOM), so A-only there by nature. */
    case "r3": {
      const focused = document.querySelector<HTMLElement>(".gp-focus");
      if (focused && document.contains(focused)) { focused.click(); break; }
      // Fall back to moju pointer target
      const cursor = document.querySelector<HTMLElement>(".gamepad-cursor");
      if (cursor && cursor.style.opacity !== "0") {
        const rect = cursor.getBoundingClientRect();
        const el = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        if (el instanceof HTMLElement) el.click();
      }
      break;
    }

    /* Home: Solana logo / app menu (reserved) */
    case "home":
      dispatch("home");
      break;

    /* Left stick: move virtual pointer */
    case "lstick-up": moveCursor(0, -CURSOR_STEP); break;
    case "lstick-down": moveCursor(0, CURSOR_STEP); break;
    case "lstick-left": moveCursor(-CURSOR_STEP, 0); break;
    case "lstick-right": moveCursor(CURSOR_STEP, 0); break;

    /* Right stick: up/down scroll, left/right spatial nav (like D-pad) */
    case "rstick-up": scrollContent("up"); break;
    case "rstick-down": scrollContent("down"); break;
    case "rstick-left": spatialNav("left"); break;
    case "rstick-right": spatialNav("right"); break;
  }
}

/* ── Keyboard mapping ──────────────────────────────────────────── */

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

/* ── Component ─────────────────────────────────────────────────── */

/**
 * PSG1 gamepad simulator overlay + keyboard bridge.
 * Activated by ?gp in the URL. Dynamic-imported — zero bytes in prod.
 *
 * Keyboard: ←↑→↓=D-pad, Enter=A, Backspace=B, X=Context, Y=Refresh,
 * []=L1/R1, Tab=Select, Space=Start, Q/E=L3/R3, H=Home
 */
export default function GamepadDebugBridge() {
  const [collapsed, setCollapsed] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>();
  const holdRafRef = useRef<number | null>(null);
  const holdIdRef = useRef<string | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  // ── Portal into modal dialogs so simulator stays interactive ───────
  // dialog.showModal() renders in the browser top layer and makes ALL
  // non-dialog content inert (blocks pointer events).  By portaling the
  // simulator inside the dialog it escapes inertness and stays clickable.
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

  // ── L-stick hold: continuous pointer movement while button is held ──────
  const stopHold = useCallback(() => {
    holdIdRef.current = null;
    if (holdRafRef.current !== null) {
      cancelAnimationFrame(holdRafRef.current);
      holdRafRef.current = null;
    }
  }, []);

  const startHold = useCallback(
    (id: string) => {
      stopHold();
      const delta = stickDelta(id);
      if (!delta) {
        // Not an L-stick direction — normal single press
        handlePress(id);
        return;
      }
      // Immediate first step: tap = one visible unit (CURSOR_STEP)
      handlePress(id);
      holdIdRef.current = id;

      // After 250 ms hold-delay, run frame-by-frame continuous movement (CONTINUOUS_SPEED px/frame)
      const holdStart = performance.now();
      let continuous = false;

      const loop = () => {
        if (holdIdRef.current !== id) return;
        if (!continuous) {
          if (performance.now() - holdStart >= 250) {
            continuous = true;
          } else {
            holdRafRef.current = requestAnimationFrame(loop);
            return;
          }
        }
        moveCursor(delta.dx, delta.dy);
        holdRafRef.current = requestAnimationFrame(loop);
      };
      holdRafRef.current = requestAnimationFrame(loop);
    },
    [handlePress, stopHold],
  );

  // Stop any running hold loop on unmount
  useEffect(() => {
    return () => { stopHold(); };
  }, [stopHold]);

  // Keyboard bridge
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return; // Prevent rapid-fire on held keys

      // When VK is open, intercept mapped keys regardless of target
      if (isVirtualKeyboardOpen()) {
        const id = KEY_MAP[e.key];
        if (!id) return;
        e.preventDefault();
        handlePress(id); // pressButton will route to dispatchVkAction
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

  /** L-stick directional button — single step on tap, continuous 6px/frame while held. */
  const stickBtn = (id: string, label: string, sub?: string) => (
    <button
      className={`gp-sim__btn gp-sim__btn--${id}${flash === id ? " gp-sim__btn--flash" : ""}`}
      onPointerDown={(e) => { e.stopPropagation(); startHold(id); }}
      onPointerUp={(e) => { e.stopPropagation(); stopHold(); }}
      onPointerLeave={(e) => { e.stopPropagation(); stopHold(); }}
      onPointerCancel={(e) => { e.stopPropagation(); stopHold(); }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      aria-label={label}
    >
      <span className="gp-sim__label">{label}</span>
      {sub && <span className="gp-sim__sub">{sub}</span>}
    </button>
  );

  const sim = (
    <div className={`gp-sim${collapsed ? " gp-sim--collapsed" : ""}`}>
      <button
        className="gp-sim__toggle"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? "Expand PSG1 simulator" : "Collapse PSG1 simulator"}
      >
        {collapsed ? "🎮" : "✕"}
      </button>

      {!collapsed && (
        <div className="gp-sim__body">
          {/* Centered I.O. watermark behind glass buttons */}
          <div className="gp-sim__watermark" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/io-logo-80.png" alt="" width={256} height={256} className="gp-sim__watermark-img" />
            <span className="gp-sim__watermark-credit">By: i.O.</span>
          </div>
          <div className="gp-sim__title">PSG1 MAPPING SIM</div>
          <div className="gp-sim__subtitle">PlaySolana Gamepad 1</div>

          {/* ── SHOULDERS + TRIGGERS ── */}
          <div className="gp-sim__section-label">SHOULDERS</div>
          <div className="gp-sim__shoulders">
            {btn("l1", "L1", "Hdr ←")}
            {btn("r1", "R1", "Hdr →")}
          </div>


          {/* ── D-PAD + FACE ── */}
          <div className="gp-sim__main">
            <div className="gp-sim__zone">
              <div className="gp-sim__section-label">D-PAD</div>
              <div className="gp-sim__dpad">
                {btn("up", "↑", "Nav")}
                <div className="gp-sim__dpad-row">
                  {btn("left", "←", "Nav")}
                  <div className="gp-sim__dpad-gap" />
                  {btn("right", "→", "Nav")}
                </div>
                {btn("down", "↓", "Nav")}
              </div>
            </div>

            <div className="gp-sim__zone">
              <div className="gp-sim__section-label">FACE</div>
              <div className="gp-sim__face">
                {btn("x", "X", "—")}
                <div className="gp-sim__face-row">
                  {btn("y", "Y", "Refresh")}
                  {btn("a", "A", "Confirm")}
                </div>
                {btn("b", "B", "Back")}
              </div>
            </div>
          </div>

          {/* ── CENTER — credit + buttons ── */}
          <div className="gp-sim__credit">By: I.O.</div>
          <div className="gp-sim__bottom">
            {btn("select", "Sel", "Wallet")}
            {btn("home", "◎", "Menu")}
            {btn("start", "Start", "Gate")}
          </div>

          {/* ── STICKS ── */}
          <div className="gp-sim__sticks">
            <div className="gp-sim__stick">
              <div className="gp-sim__section-label">L-STICK</div>
              <div className="gp-sim__stick-sublabel">Pointer (moju)</div>
              <div className="gp-sim__dpad gp-sim__dpad--stick">
                {stickBtn("lstick-up", "↑", "Move")}
                <div className="gp-sim__dpad-row">
                  {stickBtn("lstick-left", "←", "Move")}
                  {btn("l3", "L3", "Push")}
                  {stickBtn("lstick-right", "→", "Move")}
                </div>
                {stickBtn("lstick-down", "↓", "Move")}
              </div>
            </div>

            <div className="gp-sim__stick">
              <div className="gp-sim__section-label">R-STICK</div>
              <div className="gp-sim__stick-sublabel">Scroll / Nav</div>
              <div className="gp-sim__dpad gp-sim__dpad--stick">
                {btn("rstick-up", "↑", "Scroll ↑")}
                <div className="gp-sim__dpad-row">
                  {btn("rstick-left", "←", "Nav")}
                  {btn("r3", "R3", "Click")}
                  {btn("rstick-right", "→", "Nav")}
                </div>
                {btn("rstick-down", "↓", "Scroll ↓")}
              </div>
            </div>
          </div>

          {/* Zone legend */}
          <div className="gp-sim__mode">
            PSG1 · L1/R1 Shoulders · D-Pad Nav · Face A/B/X/Y · L3/R3 Push
          </div>
        </div>
      )}
    </div>
  );

  return portalTarget ? createPortal(sim, portalTarget) : sim;
}
