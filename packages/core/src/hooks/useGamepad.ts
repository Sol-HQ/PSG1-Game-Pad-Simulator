"use client";

import { useEffect, useRef } from "react";
import {
  clearGpFocus,
  closeModal,
  cycleHeader,
  findCancelButton,
  getGpFocused,
  isModalOpen,
  isTextEditable,
  MODAL_SELECTOR,
  resolveInteractiveAt,
  scrollContent,
  spatialNav,
} from "../lib/gamepad-nav";
import {
  isVirtualKeyboardOpen,
  openVirtualKeyboard,
  dispatchVkAction,
} from "../components/VirtualKeyboard";
import {
  BTN_A, BTN_B, BTN_X, BTN_Y,
  BTN_L1, BTN_R1,
  BTN_SELECT, BTN_START,
  BTN_L3, BTN_R3,
  BTN_DPAD_UP, BTN_DPAD_DOWN, BTN_DPAD_LEFT, BTN_DPAD_RIGHT,
  BTN_HOME,
  AXIS_LX, AXIS_LY, AXIS_RX, AXIS_RY,
  STICK_DEADZONE,
} from "../lib/psg1-hardware";

/**
 * Gamepad actions dispatched by the polling loop.
 * Components subscribe via useGamepadAction().
 *
 * Zone navigation (L1/R1 header, D-pad/right-stick content)
 * is handled internally — only semantic actions are dispatched.
 */
export type GamepadAction =
  | "confirm"    // A  (btn1, right face)  → click focused element
  | "back"       // B  (btn0, bottom face) → cancel / go back
  | "x"          // X  (btn3, top face)    → context action (reserved)
  | "refresh"    // Y  (btn2, left face)   → refresh current zone
  | "select"     // Select (btn8)          → wallet connect/disconnect
  | "start"      // Start  (btn9)          → navigate to terms / mode-select gate
  | "l3"         // L3 (btn10)             → left stick press (reserved)
  | "r3"         // R3 (btn11)             → secondary confirm (click, no wallet)
  | "home";      // Home (btn16)           → NOT accessible on real PSG1

/** Stick deadzone — from PSG1 hardware spec. */
const DEADZONE = STICK_DEADZONE;

/** Pointer speed multiplier — CSS pixels per frame at full deflection. */
const POINTER_SPEED = 4;

/** Shared event bus for gamepad actions — singleton per window. */
export const gamepadBus =
  typeof window !== "undefined" ? new EventTarget() : null;

/**
 * Mount once at the app level (AppShell). Polls navigator.getGamepads()
 * every animation frame with zone-based navigation:
 *
 * **Header zone** (L1/R1): linear cycle through gp-cycleable items (tabs + utilities)
 * **Content zone** (D-pad / right stick): spatial navigation in active tab or modal
 * **Pointer mode** (left stick): virtual moju cursor, A clicks at cursor position
 *
 * A → click focused element (on tab buttons: activate + drop focus to content)
 * B → close modal if open; otherwise dispatch "back"
 * Y → dispatch "refresh" (closes modal first if open)
 * Select → dispatch "select" (wallet connect/disconnect)
 * Start → dispatch "start" (return to terms / mode-select gate)
 */
export function useGamepadPoll() {
  const prev = useRef<boolean[]>([]);
  const pointerPos = useRef({ x: 0, y: 0, visible: false });
  const cursorEl = useRef<HTMLDivElement | null>(null);
  const rightStickFired = useRef({ x: false, y: false });

  useEffect(() => {
    if (typeof navigator === "undefined" || !("getGamepads" in navigator)) return;
    if (typeof document === "undefined") return;

    // ── Virtual cursor element (moju pointer) ────────────────────
    const cursor = document.createElement("div");
    cursor.className = "gamepad-cursor";
    cursor.setAttribute("aria-hidden", "true");
    const img = document.createElement("img");
    img.src = "/art/moju-gold-32.png";
    img.alt = "";
    img.width = 32;
    img.height = 32;
    img.style.cssText = "pointer-events:none;";
    cursor.appendChild(img);
    cursor.style.cssText =
      "position:fixed;top:0;left:0;z-index:99999;pointer-events:none;" +
      "transform:translate(-50%,-50%);" +
      "opacity:0;transition:opacity 0.2s;filter:drop-shadow(0 2px 6px rgba(212,175,55,0.7));";
    document.body.appendChild(cursor);
    cursorEl.current = cursor;

    pointerPos.current = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      visible: false,
    };

    let raf: number;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let lastHoveredEl: HTMLElement | null = null;

    // Pointer-hiding callback passed to shared nav functions.
    const hidePointer = () => {
      pointerPos.current.visible = false;
      cursor.style.opacity = "0";
      if (lastHoveredEl) { lastHoveredEl.classList.remove("gp-moju-hover"); lastHoveredEl = null; }
    };

    // Update moju hover highlight on the element under the cursor.
    const updateMojuHover = () => {
      if (!pointerPos.current.visible) {
        if (lastHoveredEl) { lastHoveredEl.classList.remove("gp-moju-hover"); lastHoveredEl = null; }
        return;
      }
      const target = resolveInteractiveAt(pointerPos.current.x, pointerPos.current.y);
      if (target === lastHoveredEl) return;
      if (lastHoveredEl) lastHoveredEl.classList.remove("gp-moju-hover");
      if (target) { target.classList.add("gp-moju-hover"); lastHoveredEl = target; }
      else lastHoveredEl = null;
    };

    // Touch / mouse click clears gamepad focus (seamless mode switch)
    // Ignore clicks inside the simulator overlay — those set focus intentionally.
    const onPointerDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement)?.closest?.('.gp-sim')) return;
      clearGpFocus();
    };
    document.addEventListener("pointerdown", onPointerDown);

    // ── Cursor move from simulator left-stick ───────────────────
    const onCursorMove = (e: Event) => {
      const { dx, dy } = (e as CustomEvent).detail;
      // Clamp 16px from edges so the 32px cursor never visually bleeds into browser chrome
      pointerPos.current.x = Math.max(16, Math.min(window.innerWidth - 16, pointerPos.current.x + dx));
      pointerPos.current.y = Math.max(16, Math.min(window.innerHeight - 16, pointerPos.current.y + dy));
      // Edge-scroll: cursor at top/bottom edge scrolls the page
      const EDGE_ZONE = 40;
      const SCROLL_SPEED = 4;
      if (pointerPos.current.y <= EDGE_ZONE) {
        window.scrollBy(0, -SCROLL_SPEED * (1 - pointerPos.current.y / EDGE_ZONE));
      } else if (pointerPos.current.y >= window.innerHeight - EDGE_ZONE) {
        window.scrollBy(0, SCROLL_SPEED * (1 - (window.innerHeight - pointerPos.current.y) / EDGE_ZONE));
      }
      if (!pointerPos.current.visible) {
        pointerPos.current.visible = true;
        cursor.style.opacity = "1";
      }
      cursor.style.transform =
        `translate(${pointerPos.current.x}px, ${pointerPos.current.y}px) translate(-50%, -50%)`;
      clearGpFocus();
      updateMojuHover();
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        pointerPos.current.visible = false;
        cursor.style.opacity = "0";
        if (lastHoveredEl) { lastHoveredEl.classList.remove("gp-moju-hover"); lastHoveredEl = null; }
      }, 10000);
    };
    gamepadBus?.addEventListener("gamepad-cursor-move", onCursorMove);

    // ── Polling loop ────────────────────────────────────────────
    let dialogOpenAt = 0;          // timestamp when modal first appeared
    const DIALOG_GRACE_MS = 500;   // ignore B/Y close within this window

    const poll = () => {
      const pads = navigator.getGamepads();
      const gp = pads[0] ?? pads[1] ?? pads[2] ?? pads[3];

      if (gp) {
        const modal = isModalOpen();

        // Track when modal first opens to prevent accidental close on same frame.
        if (modal && dialogOpenAt === 0) dialogOpenAt = performance.now();
        else if (!modal) dialogOpenAt = 0;
        const modalSafe = modal && performance.now() - dialogOpenAt > DIALOG_GRACE_MS;

        // ── Virtual keyboard intercept ──
        // When the VK is open, route D-pad / A / B / Y to it.
        // Left stick pointer still works so you can move the cursor over VK keys.
        const vkOpen = isVirtualKeyboardOpen();
        if (vkOpen) {
          if ((gp.buttons[BTN_DPAD_UP]?.pressed ?? false) && !prev.current[BTN_DPAD_UP]) dispatchVkAction("up");
          if ((gp.buttons[BTN_DPAD_DOWN]?.pressed ?? false) && !prev.current[BTN_DPAD_DOWN]) dispatchVkAction("down");
          if ((gp.buttons[BTN_DPAD_LEFT]?.pressed ?? false) && !prev.current[BTN_DPAD_LEFT]) dispatchVkAction("left");
          if ((gp.buttons[BTN_DPAD_RIGHT]?.pressed ?? false) && !prev.current[BTN_DPAD_RIGHT]) dispatchVkAction("right");
          // A — if pointer visible, click element under pointer (e.g. VK key); else D-pad select
          if ((gp.buttons[BTN_A]?.pressed ?? false) && !prev.current[BTN_A]) {
            if (pointerPos.current.visible) {
              const target = resolveInteractiveAt(pointerPos.current.x, pointerPos.current.y);
              if (target) target.click(); else dispatchVkAction("a");
            } else { dispatchVkAction("a"); }
          }
          if ((gp.buttons[BTN_B]?.pressed ?? false) && !prev.current[BTN_B]) dispatchVkAction("b");
          if ((gp.buttons[BTN_Y]?.pressed ?? false) && !prev.current[BTN_Y]) dispatchVkAction("y");
          if ((gp.buttons[BTN_START]?.pressed ?? false) && !prev.current[BTN_START]) dispatchVkAction("start");

          // Left stick pointer — keep cursor moving even with VK open
          const vlx = gp.axes[AXIS_LX] ?? 0;
          const vly = gp.axes[AXIS_LY] ?? 0;
          if (Math.sqrt(vlx * vlx + vly * vly) > DEADZONE) {
            pointerPos.current.x = Math.max(16, Math.min(window.innerWidth - 16, pointerPos.current.x + vlx * POINTER_SPEED));
            pointerPos.current.y = Math.max(16, Math.min(window.innerHeight - 16, pointerPos.current.y + vly * POINTER_SPEED));
            if (!pointerPos.current.visible) { pointerPos.current.visible = true; cursor.style.opacity = "1"; }
            cursor.style.transform = `translate(${pointerPos.current.x}px, ${pointerPos.current.y}px) translate(-50%, -50%)`;
            updateMojuHover();
            if (hideTimer) clearTimeout(hideTimer);
            hideTimer = setTimeout(() => {
              pointerPos.current.visible = false; cursor.style.opacity = "0";
              if (lastHoveredEl) { lastHoveredEl.classList.remove("gp-moju-hover"); lastHoveredEl = null; }
            }, 10000);
          }

          // Still update prev state so edge detection works after VK closes
          const btns = gp.buttons;
          if (prev.current.length !== btns.length) prev.current = new Array(btns.length);
          for (let i = 0; i < btns.length; i++) prev.current[i] = btns[i].pressed;
          raf = requestAnimationFrame(poll);
          return;
        }

        // ── L1 → cycle header left ──
        if ((gp.buttons[BTN_L1]?.pressed ?? false) && !prev.current[BTN_L1] && !modal) {
          cycleHeader(-1, hidePointer);
        }

        // ── R1 → cycle header right ──
        if ((gp.buttons[BTN_R1]?.pressed ?? false) && !prev.current[BTN_R1] && !modal) {
          cycleHeader(1, hidePointer);
        }

        // ── D-pad → spatial content navigation (L1/R1 handle header cycling) ──
        if ((gp.buttons[BTN_DPAD_UP]?.pressed ?? false) && !prev.current[BTN_DPAD_UP]) {
          spatialNav("up", hidePointer);
        }
        if ((gp.buttons[BTN_DPAD_DOWN]?.pressed ?? false) && !prev.current[BTN_DPAD_DOWN]) {
          spatialNav("down", hidePointer);
        }
        if ((gp.buttons[BTN_DPAD_LEFT]?.pressed ?? false) && !prev.current[BTN_DPAD_LEFT]) {
          spatialNav("left", hidePointer);
        }
        if ((gp.buttons[BTN_DPAD_RIGHT]?.pressed ?? false) && !prev.current[BTN_DPAD_RIGHT]) {
          spatialNav("right", hidePointer);
        }

        // ── A (right face) → click focused element or open VK for text inputs ──
        if ((gp.buttons[BTN_A]?.pressed ?? false) && !prev.current[BTN_A]) {
          const focused = getGpFocused();
          if (focused && document.contains(focused)) {
            const tag = focused.tagName;
            const inputType = (focused as HTMLInputElement).type?.toLowerCase() ?? "";
            const isTextInput = (tag === "INPUT" && !["checkbox", "radio", "submit", "button", "reset", "file", "range", "color"].includes(inputType)) || tag === "TEXTAREA";
            if (isTextInput) {
              openVirtualKeyboard(focused as HTMLInputElement | HTMLTextAreaElement);
            } else {
              focused.click();
              // Focus stays on the clicked element — user moves it with D-pad
            }
          } else if (pointerPos.current.visible) {
            const target = resolveInteractiveAt(pointerPos.current.x, pointerPos.current.y);
            if (target) {
              if (isTextEditable(target)) {
                openVirtualKeyboard(target);
              } else {
                target.click();
              }
            }
          } else {
            gamepadBus?.dispatchEvent(new CustomEvent("gamepad-action", { detail: "confirm" }));
          }
        }

        // ── B (bottom face) → cancel / back / close modal ──
        if ((gp.buttons[BTN_B]?.pressed ?? false) && !prev.current[BTN_B]) {
          const cancel = findCancelButton();
          if (cancel) cancel.click();
          else if (modalSafe) closeModal();
          else if (!modal) gamepadBus?.dispatchEvent(new CustomEvent("gamepad-action", { detail: "back" }));
        }

        // ── Y (left face) → close modal if open, then dispatch "refresh" ──
        if ((gp.buttons[BTN_Y]?.pressed ?? false) && !prev.current[BTN_Y]) {
          if (modalSafe) closeModal();
          if (!modal) gamepadBus?.dispatchEvent(new CustomEvent("gamepad-action", { detail: "refresh" }));
        }

        // ── X (top face) → reserved ──



        // ── Select → wallet connect/disconnect ──
        if ((gp.buttons[BTN_SELECT]?.pressed ?? false) && !prev.current[BTN_SELECT]) {
          gamepadBus?.dispatchEvent(new CustomEvent("gamepad-action", { detail: "select" }));
        }

        // ── Start → navigate to terms / mode-select gate ──
        if ((gp.buttons[BTN_START]?.pressed ?? false) && !prev.current[BTN_START]) {
          gamepadBus?.dispatchEvent(new CustomEvent("gamepad-action", { detail: "start" }));
        }

        // ── L3 → dispatch "l3" ──
        if ((gp.buttons[BTN_L3]?.pressed ?? false) && !prev.current[BTN_L3]) {
          gamepadBus?.dispatchEvent(new CustomEvent("gamepad-action", { detail: "l3" }));
        }

        // ── R3 → same as A (click focused/hovered). Wallet signing
        //    confirm lives in the extension popup, outside our DOM — A-only there. ──
        if ((gp.buttons[BTN_R3]?.pressed ?? false) && !prev.current[BTN_R3]) {
          const focused = getGpFocused();
          if (focused && document.contains(focused)) {
            if (isTextEditable(focused)) {
              openVirtualKeyboard(focused);
            } else {
              focused.click();
            }
          } else if (pointerPos.current.visible) {
            const target = resolveInteractiveAt(pointerPos.current.x, pointerPos.current.y);
            if (target) {
              if (isTextEditable(target)) {
                openVirtualKeyboard(target);
              } else {
                target.click();
              }
            }
          }
        }

        // ── Home (NOT accessible on real PSG1 — firmware only) ──
        if ((gp.buttons[BTN_HOME]?.pressed ?? false) && !prev.current[BTN_HOME]) {
          gamepadBus?.dispatchEvent(new CustomEvent("gamepad-action", { detail: "home" }));
        }

        // Update prev state in-place (avoids per-frame array allocation)
        const btns = gp.buttons;
        if (prev.current.length !== btns.length) prev.current = new Array(btns.length);
        for (let i = 0; i < btns.length; i++) prev.current[i] = btns[i].pressed;

        // ── Left stick (360° analog) → virtual pointer (clears D-pad focus) ──
        const lx = gp.axes[AXIS_LX] ?? 0;
        const ly = gp.axes[AXIS_LY] ?? 0;
        const leftMag = Math.sqrt(lx * lx + ly * ly);

        if (leftMag > DEADZONE) {
          clearGpFocus(); // Switch to pointer mode

          const dx = lx * POINTER_SPEED;
          const dy = ly * POINTER_SPEED;
          // Clamp 16px from edges so the 32px cursor never visually bleeds into browser chrome
          pointerPos.current.x = Math.max(16, Math.min(window.innerWidth - 16, pointerPos.current.x + dx));
          pointerPos.current.y = Math.max(16, Math.min(window.innerHeight - 16, pointerPos.current.y + dy));

          // Edge-scroll: when cursor hits top/bottom 40px, scroll the page
          const EDGE_ZONE = 40;
          const SCROLL_SPEED = 4;
          if (pointerPos.current.y <= EDGE_ZONE) {
            window.scrollBy(0, -SCROLL_SPEED * (1 - pointerPos.current.y / EDGE_ZONE));
          } else if (pointerPos.current.y >= window.innerHeight - EDGE_ZONE) {
            window.scrollBy(0, SCROLL_SPEED * (1 - (window.innerHeight - pointerPos.current.y) / EDGE_ZONE));
          }

          if (!pointerPos.current.visible) {
            pointerPos.current.visible = true;
            cursor.style.opacity = "1";
          }
          cursor.style.transform =
            `translate(${pointerPos.current.x}px, ${pointerPos.current.y}px) translate(-50%, -50%)`;

          updateMojuHover();
          if (hideTimer) clearTimeout(hideTimer);
          hideTimer = setTimeout(() => {
            pointerPos.current.visible = false;
            cursor.style.opacity = "0";
            if (lastHoveredEl) { lastHoveredEl.classList.remove("gp-moju-hover"); lastHoveredEl = null; }
          }, 10000);
        }

        // ── Right stick (360° analog): up/down continuous scroll, left/right spatial nav ──
        const rx = gp.axes[AXIS_RX] ?? 0;
        const ry = gp.axes[AXIS_RY] ?? 0;

        // Continuous scroll while held — speed scales with deflection
        if (Math.abs(ry) > DEADZONE) {
          const scrollSpeed = ry * 4; // px per frame, sign = direction
          const modal = document.querySelector(MODAL_SELECTOR);
          if (modal && modal instanceof HTMLElement) {
            modal.scrollBy(0, scrollSpeed);
          } else {
            window.scrollBy(0, scrollSpeed);
          }
        }

        // Left/right behaves like D-pad (spatial nav)
        if (Math.abs(rx) > DEADZONE) {
          if (!rightStickFired.current.x) {
            rightStickFired.current.x = true;
            spatialNav(rx < 0 ? "left" : "right", hidePointer);
          }
        } else {
          rightStickFired.current.x = false;
        }
      }

      // ── Reparent cursor into open <dialog> (top-layer escape) ─────
      // dialog.showModal() renders in the browser top layer, above ALL
      // z-index values in normal flow.  Moving the cursor inside the
      // dialog keeps it visible and interactive over wallet modals etc.
      const openDialog = document.querySelector<HTMLDialogElement>("dialog[open]");
      if (openDialog && cursor.parentElement !== openDialog) {
        openDialog.appendChild(cursor);
      } else if (!openDialog && cursor.parentElement !== document.body) {
        document.body.appendChild(cursor);
      }

      raf = requestAnimationFrame(poll);
    };

    const onConnect = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(poll);
    };

    window.addEventListener("gamepadconnected", onConnect);
    raf = requestAnimationFrame(poll);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("gamepadconnected", onConnect);
      document.removeEventListener("pointerdown", onPointerDown);
      gamepadBus?.removeEventListener("gamepad-cursor-move", onCursorMove);
      if (hideTimer) clearTimeout(hideTimer);
      clearGpFocus();
      if (lastHoveredEl) { lastHoveredEl.classList.remove("gp-moju-hover"); lastHoveredEl = null; }
      cursor.remove();
    };
  }, []);
}

/**
 * Subscribe to gamepad actions (confirm, back, refresh, start).
 * Zone navigation (L1/R1 header, D-pad content) is handled by the polling loop.
 *
 * @example
 * useGamepadAction((action) => {
 *   if (action === "back") goBack();
 *   if (action === "start") toggleWallet();
 *   if (action === "refresh") reloadData();
 * });
 */
export function useGamepadAction(handler: (action: GamepadAction) => void) {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    if (!gamepadBus) return;

    const listener = (e: Event) => {
      ref.current((e as CustomEvent<GamepadAction>).detail);
    };

    gamepadBus.addEventListener("gamepad-action", listener);
    return () => gamepadBus.removeEventListener("gamepad-action", listener);
  }, []);
}
