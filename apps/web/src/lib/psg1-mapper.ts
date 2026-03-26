/**
 * PSG1 Runtime Mapper
 * ===================
 * Declaratively routes PSG1 semantic actions to game-engine adapters.
 *
 * Supports four adapter types out of the box:
 *   dom-click     — querySelector + .click()   (DOM / React)
 *   custom-event  — window.dispatchEvent()      (cross-frame, Unity WebGL, Phaser)
 *   postMessage   — window.postMessage()        (iframe / WebWorker / game shell)
 *   callback      — named JS function           (registered via registerPsg1Callback)
 *
 * Usage (inline):
 *   import { installPsg1Mapper } from "@/lib/psg1-mapper";
 *   const uninstall = installPsg1Mapper({
 *     version: "1",
 *     actions: {
 *       confirm: { type: "custom-event", event: "game:confirm" },
 *       back:    { type: "callback",     callbackId: "goBack"  },
 *     },
 *   });
 *   // ...
 *   uninstall(); // when tearing down
 *
 * Usage (JSON file):
 *   import { loadPsg1Mapping } from "@/lib/psg1-mapper";
 *   const uninstall = await loadPsg1Mapping("/psg1.mapping.json");
 *
 * React hook:
 *   import { useGamepadMapper } from "@/hooks/useGamepadMapper";
 *   useGamepadMapper(myMapping);   // auto-uninstalls on component unmount
 */

import { gamepadBus, type GamepadAction } from "../hooks/useGamepad";

// ─── Adapter type definitions ─────────────────────────────────────────────

/**
 * Click the first visible DOM element matching `selector`.
 * Uses document.querySelector — returns silently if nothing matches.
 */
export interface DomClickAdapter {
  type: "dom-click";
  /** CSS selector for the element to click. E.g. "#start-btn", ".confirm-action" */
  selector: string;
}

/**
 * Dispatch a CustomEvent on `window` with an optional `detail` payload.
 * Ideal for communicating with Unity WebGL canvas, Phaser scenes, or other
 * non-React code that already listens for DOM events.
 *
 * Receiver:
 *   window.addEventListener("game:confirm", (e) => console.log(e.detail));
 */
export interface CustomEventAdapter {
  type: "custom-event";
  /** Name of the CustomEvent dispatched on window. */
  event: string;
  /** Optional detail payload. Any JSON-serialisable value. */
  detail?: unknown;
}

/**
 * Send a message via window.postMessage().
 * Use this to communicate with an iframe, WebWorker, or cross-origin game shell.
 *
 * The message always includes `_psg1: true` so receivers can filter it.
 *
 * Receiver:
 *   window.addEventListener("message", (e) => {
 *     if (e.data._psg1) handleGamepadAction(e.data);
 *   });
 */
export interface PostMessageAdapter {
  type: "postMessage";
  /** Payload sent via window.postMessage(). "_psg1: true" is appended automatically. */
  message: { type: string; [k: string]: unknown };
  /**
   * Target origin for postMessage security.
   * Defaults to window.location.origin (same-origin only).
   * Set to "*" only if you understand the security implications.
   */
  targetOrigin?: string;
}

/**
 * Call a named JavaScript function registered via registerPsg1Callback().
 * Use this for full React or JS integration without custom events.
 *
 * Setup:
 *   registerPsg1Callback("goBack", () => router.back());
 */
export interface CallbackAdapter {
  type: "callback";
  /** ID passed to registerPsg1Callback(). */
  callbackId: string;
}

/** Union of all supported adapter types. */
export type Psg1Adapter =
  | DomClickAdapter
  | CustomEventAdapter
  | PostMessageAdapter
  | CallbackAdapter;

// ─── Mapping schema ───────────────────────────────────────────────────────

/**
 * Full PSG1 mapping configuration.
 * Can be defined inline or loaded from a JSON file.
 *
 * Any action NOT listed will still fire normally via useGamepadAction().
 * The mapper adds routing ON TOP OF the existing action system.
 */
export interface Psg1Mapping {
  /** Schema version. Must be "1". */
  version: "1";
  /** Human-readable label shown in the debug overlay. */
  name?: string;
  /**
   * Map of PSG1 action names → adapters.
   * Valid keys: confirm | back | refresh | x | select | start | l3 | r3 | home
   */
  actions: Partial<Record<GamepadAction, Psg1Adapter>>;
}

// ─── Callback registry ────────────────────────────────────────────────────

const _callbacks = new Map<string, () => void>();

/**
 * Register a named callback for use with { type: "callback" } adapters.
 * Call BEFORE installPsg1Mapper().
 *
 * @example
 * registerPsg1Callback("openShop",  () => setShopOpen(true));
 * registerPsg1Callback("goBack",    () => router.back());
 * registerPsg1Callback("reloadMap", () => scene.restart());
 */
export function registerPsg1Callback(id: string, fn: () => void): void {
  _callbacks.set(id, fn);
}

/** Remove a previously registered callback. */
export function unregisterPsg1Callback(id: string): void {
  _callbacks.delete(id);
}

// ─── Mapper install / uninstall ───────────────────────────────────────────

/** Reference to the currently active mapper's cleanup fn (one at a time). */
let _activeCleanup: (() => void) | null = null;

/** The currently installed mapping (null if no mapper is active). */
let _activeMapping: Psg1Mapping | null = null;

/**
 * Returns the currently installed mapping, or null if no mapper is active.
 * Used by the PSG1 settings panel to display the active mapping table.
 */
export function getActivePsg1Mapping(): Psg1Mapping | null {
  return _activeMapping;
}

/**
 * Install the PSG1 mapper.
 *
 * Subscribes to all `gamepad-action` events on the internal event bus
 * and routes each action through the configured adapter.
 *
 * Returns an **uninstall function** — call it when you want to detach the mapper.
 * Installing a second mapper automatically uninstalls the previous one.
 *
 * @example
 * const uninstall = installPsg1Mapper({
 *   version: "1",
 *   name: "My Game",
 *   actions: {
 *     confirm: { type: "custom-event", event: "game:confirm" },
 *     back:    { type: "callback",     callbackId: "goBack"  },
 *     start:   { type: "dom-click",    selector:   "#menu-btn" },
 *   },
 * });
 *
 * // Tear down:
 * uninstall();
 */
export function installPsg1Mapper(mapping: Psg1Mapping): () => void {
  if (typeof window === "undefined") return () => {};

  if (mapping.version !== "1") {
    console.warn(
      `[PSG1 Mapper] Unknown mapping version "${mapping.version}". Expected "1". Proceeding anyway.`,
    );
  }

  // Uninstall any previous mapper before installing the new one.
  _activeCleanup?.();

  const bus = gamepadBus;
  if (!bus) return () => {};

  _activeMapping = mapping;

  const handler = (e: Event) => {
    const action = (e as CustomEvent<GamepadAction>).detail;
    const adapter = mapping.actions[action];
    if (!adapter) return; // no mapping for this action — useGamepadAction() handles it
    _executeAdapter(adapter, action);
  };

  bus.addEventListener("gamepad-action", handler);

  const uninstall = () => {
    bus.removeEventListener("gamepad-action", handler);
    if (_activeCleanup === uninstall) _activeCleanup = null;
    if (_activeMapping === mapping) _activeMapping = null;
  };

  _activeCleanup = uninstall;
  return uninstall;
}

/**
 * Load a mapping from a JSON URL and install it.
 * Returns a Promise that resolves to the uninstall function.
 *
 * @example
 * const uninstall = await loadPsg1Mapping("/psg1.mapping.json");
 */
export async function loadPsg1Mapping(url: string): Promise<() => void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `[PSG1 Mapper] Failed to fetch mapping from "${url}" — HTTP ${res.status}`,
    );
  }
  const mapping = (await res.json()) as Psg1Mapping;
  return installPsg1Mapper(mapping);
}

// ─── Adapter executor (internal) ───────────────────────────────────────────

function _executeAdapter(adapter: Psg1Adapter, action: string): void {
  switch (adapter.type) {
    case "dom-click": {
      const el = document.querySelector<HTMLElement>(adapter.selector);
      if (el && el.offsetParent !== null) {
        el.click();
      } else if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[PSG1 Mapper] dom-click: "${action}" — no visible element matches "${adapter.selector}"`,
        );
      }
      break;
    }

    case "custom-event": {
      window.dispatchEvent(
        new CustomEvent(adapter.event, {
          bubbles: true,
          detail: adapter.detail ?? null,
        }),
      );
      break;
    }

    case "postMessage": {
      const payload = { ...adapter.message, _psg1: true, _action: action };
      const origin = adapter.targetOrigin ?? window.location.origin;
      window.postMessage(payload, origin);
      break;
    }

    case "callback": {
      const fn = _callbacks.get(adapter.callbackId);
      if (fn) {
        fn();
      } else if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[PSG1 Mapper] callback: "${action}" — callbackId "${adapter.callbackId}" not registered. ` +
            `Call registerPsg1Callback("${adapter.callbackId}", fn) before installPsg1Mapper().`,
        );
      }
      break;
    }
  }
}
