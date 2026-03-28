"use client";

import { useEffect, useRef } from "react";
import {
  clearGpFocus,
  closeModal,
  cycleHeader,
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

/**
 * Gamepad actions dispatched by the polling loop.
 * Components subscribe via useGamepadAction().
 *
 * Zone navigation (L1/R1 header, D-pad/right-stick content)
 * is handled internally — only semantic actions are dispatched.
 */
export type GamepadAction =
  | "confirm"    // A  → click focused element
  | "back"       // B  → cancel / go back
  | "x"          // X  → context action (reserved)
  | "refresh"    // Y  → refresh current zone
  | "select"     // Select → wallet connect/disconnect
  | "start"      // Start → navigate to terms / mode-select gate
  | "l3"         // L3 → left stick press (reserved)
  | "r3"         // R3 → secondary confirm (click, no wallet)
  | "home";      // Home → Solana logo / app menu (reserved)

/** Stick deadzone — ignore small drifts below this threshold (0–1). */
const DEADZONE = 0.25;

/** Cancel-type keywords (case-insensitive). */
const CANCEL_WORDS = /^(cancel|cancel transaction|no|close|back|dismiss|nevermind|not now)$/i;

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

/** Pointer speed multiplier — CSS pixels per frame at full deflection. */
const POINTER_SPEED = 6;

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
          if ((gp.buttons[12]?.pressed ?? false) && !prev.current[12]) dispatchVkAction("up");
          if ((gp.buttons[13]?.pressed ?? false) && !prev.current[13]) dispatchVkAction("down");
          if ((gp.buttons[14]?.pressed ?? false) && !prev.current[14]) dispatchVkAction("left");
          if ((gp.buttons[15]?.pressed ?? false) && !prev.current[15]) dispatchVkAction("right");
          // A — if pointer visible, click element under pointer (e.g. VK key); else D-pad select
          if ((gp.buttons[1]?.pressed ?? false) && !prev.current[1]) {
            if (pointerPos.current.visible) {
              const target = resolveInteractiveAt(pointerPos.current.x, pointerPos.current.y);
              if (target) target.click(); else dispatchVkAction("a");
            } else { dispatchVkAction("a"); }
          }
          if ((gp.buttons[0]?.pressed ?? false) && !prev.current[0]) dispatchVkAction("b");
          if ((gp.buttons[2]?.pressed ?? false) && !prev.current[2]) dispatchVkAction("y");
          if ((gp.buttons[9]?.pressed ?? false) && !prev.current[9]) dispatchVkAction("start");

          // Left stick pointer — keep cursor moving even with VK open
          const vlx = gp.axes[0] ?? 0;
          const vly = gp.axes[1] ?? 0;
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

        // ── L1 (button 4) → cycle header left ──
        if ((gp.buttons[4]?.pressed ?? false) && !prev.current[4] && !modal) {
          cycleHeader(-1, hidePointer);
        }

        // ── R1 (button 5) → cycle header right ──
        if ((gp.buttons[5]?.pressed ?? false) && !prev.current[5] && !modal) {
          cycleHeader(1, hidePointer);
        }

        // ── D-pad → spatial content navigation (L1/R1 handle header cycling) ──
        if ((gp.buttons[12]?.pressed ?? false) && !prev.current[12]) {
          spatialNav("up", hidePointer);
        }
        if ((gp.buttons[13]?.pressed ?? false) && !prev.current[13]) {
          spatialNav("down", hidePointer);
        }
        if ((gp.buttons[14]?.pressed ?? false) && !prev.current[14]) {
          spatialNav("left", hidePointer);
        }
        if ((gp.buttons[15]?.pressed ?? false) && !prev.current[15]) {
          spatialNav("right", hidePointer);
        }

        // ── A (button 1 — PSG1 right face) → click focused element or open VK for text inputs ──
        if ((gp.buttons[1]?.pressed ?? false) && !prev.current[1]) {
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

        // ── B (button 0 — PSG1 bottom face) → cancel / back / close modal ──
        if ((gp.buttons[0]?.pressed ?? false) && !prev.current[0]) {
          const cancel = findCancelButton();
          if (cancel) cancel.click();
          else if (modalSafe) closeModal();
          else if (!modal) gamepadBus?.dispatchEvent(new CustomEvent("gamepad-action", { detail: "back" }));
        }

        // ── Y (button 2 — PSG1 left face) → close modal if open, then dispatch "refresh" ──
        if ((gp.buttons[2]?.pressed ?? false) && !prev.current[2]) {
          if (modalSafe) closeModal();
          if (!modal) gamepadBus?.dispatchEvent(new CustomEvent("gamepad-action", { detail: "refresh" }));
        }

        // ── X (button 3 — PSG1 top face) → reserved ──



        // ── Select (button 8) → wallet connect/disconnect ──
        if ((gp.buttons[8]?.pressed ?? false) && !prev.current[8]) {
          gamepadBus?.dispatchEvent(new CustomEvent("gamepad-action", { detail: "select" }));
        }

        // ── Start (button 9) → navigate to terms / mode-select gate ──
        if ((gp.buttons[9]?.pressed ?? false) && !prev.current[9]) {
          gamepadBus?.dispatchEvent(new CustomEvent("gamepad-action", { detail: "start" }));
        }

        // ── L3 (button 10) → dispatch "l3" ──
        if ((gp.buttons[10]?.pressed ?? false) && !prev.current[10]) {
          gamepadBus?.dispatchEvent(new CustomEvent("gamepad-action", { detail: "l3" }));
        }

        // ── R3 (button 11) → same as A (click focused/hovered). Wallet signing
        //    confirm lives in the extension popup, outside our DOM — A-only there. ──
        if ((gp.buttons[11]?.pressed ?? false) && !prev.current[11]) {
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

        // ── Home (button 16) → dispatch "home" ──
        if ((gp.buttons[16]?.pressed ?? false) && !prev.current[16]) {
          gamepadBus?.dispatchEvent(new CustomEvent("gamepad-action", { detail: "home" }));
        }

        // Update prev state in-place (avoids per-frame array allocation)
        const btns = gp.buttons;
        if (prev.current.length !== btns.length) prev.current = new Array(btns.length);
        for (let i = 0; i < btns.length; i++) prev.current[i] = btns[i].pressed;

        // ── Left stick → virtual pointer (clears D-pad focus) ──
        const lx = gp.axes[0] ?? 0;
        const ly = gp.axes[1] ?? 0;
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

        // ── Right stick: up/down continuous scroll, left/right spatial nav ──
        const rx = gp.axes[2] ?? 0;
        const ry = gp.axes[3] ?? 0;

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
