/**
 * @psg1/core — PSG1 GamePad Simulator public API
 * ================================================
 *
 * STATUS: Pre-npm documentation + re-export barrel.
 *
 * Until `@psg1/core` is published on npm, copy these files into your project:
 *
 *   apps/web/src/hooks/useGamepad.ts      → your-game/src/hooks/useGamepad.ts
 *   apps/web/src/hooks/useGamepadMapper.ts → your-game/src/hooks/useGamepadMapper.ts
 *   apps/web/src/lib/gamepad-nav.ts        → your-game/src/lib/gamepad-nav.ts
 *   apps/web/src/lib/psg1-mapper.ts        → your-game/src/lib/psg1-mapper.ts
 *   apps/web/src/components/GamepadDebugBridge.tsx  → your-game/src/components/
 *   apps/web/src/components/VirtualKeyboard.tsx     → your-game/src/components/
 *   packages/styles/psg1.css              → your-game/src/styles/psg1.css
 *   apps/web/public/art/                  → your-game/public/art/
 *
 * Then in your globals.css: @import "./psg1.css"
 * Then add ?gp to any URL — the overlay appears.
 *
 * See docs/INTEGRATE.md for the full Quick Start guide.
 *
 * ────────────────────────────────────────────────────────────────
 * PUBLIC API REFERENCE
 * ────────────────────────────────────────────────────────────────
 *
 * FROM: apps/web/src/hooks/useGamepad.ts
 * ─────────────────────────────────────
 *
 *   useGamepadPoll()
 *     Mount ONCE at your app root. Starts the rAF polling loop for
 *     navigator.getGamepads() and the simulator keyboard bridge.
 *
 *   useGamepadAction(handler: (action: GamepadAction) => void)
 *     Subscribe to semantic gamepad actions from any component.
 *     Cleans up on unmount automatically.
 *
 *   gamepadBus: EventTarget
 *     Raw event bus. Dispatch "gamepad-action" CustomEvents to inject
 *     synthetic inputs from tests or other input sources.
 *
 *   type GamepadAction =
 *     | "confirm"   // A  — click focused element
 *     | "back"      // B  — cancel / close modal / go back
 *     | "x"         // X  — context action (reserved)
 *     | "refresh"   // Y  — refresh current zone
 *     | "select"    // Select — wallet connect/disconnect
 *     | "start"     // Start  — terms / mode-select gate
 *     | "l3"        // L3 stick press (reserved)
 *     | "r3"        // R3 stick press — secondary confirm
 *     | "home";     // Home  — app menu (reserved)
 *
 * FROM: apps/web/src/lib/psg1-mapper.ts
 * ──────────────────────────────────────
 *
 *   installPsg1Mapper(mapping: Psg1Mapping): () => void
 *     Install a declarative action → adapter mapping.
 *     Returns an uninstall function. Only one mapper is active at a time.
 *
 *   loadPsg1Mapping(url: string): Promise<() => void>
 *     Fetch a mapping from a JSON URL and install it.
 *
 *   registerPsg1Callback(id: string, fn: () => void): void
 *     Register a named callback for { type: "callback" } adapters.
 *
 *   unregisterPsg1Callback(id: string): void
 *     Remove a previously registered callback.
 *
 *   type Psg1Mapping = {
 *     version:  "1";
 *     name?:    string;
 *     actions:  Partial<Record<GamepadAction, Psg1Adapter>>;
 *   }
 *
 *   type Psg1Adapter =
 *     | { type: "dom-click";     selector: string }
 *     | { type: "custom-event";  event: string; detail?: unknown }
 *     | { type: "postMessage";   message: { type: string; … }; targetOrigin?: string }
 *     | { type: "callback";      callbackId: string }
 *
 * FROM: apps/web/src/hooks/useGamepadMapper.ts
 * ─────────────────────────────────────────────
 *
 *   useGamepadMapper(mapping: Psg1Mapping)
 *     React hook — installs the mapper on mount, auto-uninstalls on unmount.
 *     Pass a stable reference (module-level const or useMemo) to avoid re-installs.
 *
 *   useGamepadCallbacks(callbacks: Record<string, () => void>)
 *     React hook — registers named callbacks, auto-deregisters on unmount.
 *     Call before useGamepadMapper() in the same component.
 *
 * FROM: apps/web/src/lib/gamepad-nav.ts
 * ──────────────────────────────────────
 *
 *   configurePsg1(config: Psg1Config)
 *     Call ONCE at app boot. Tells the navigator where your scrollable
 *     content zone lives. Default: ".app-shell__main"
 *     Example: configurePsg1({ contentZone: ".my-game-content" })
 *
 *   type Psg1Config = { contentZone?: string }
 *
 *   setGpFocus(el: Element)   — programmatically set the focus ring
 *   clearGpFocus()             — remove the focus ring
 *   getGpFocused()             — returns focused element or null
 *   getHeaderItems()           — all visible .gp-cycleable elements
 *   cycleHeader(dir: 1 | -1)   — L1 (dir=-1) / R1 (dir=1) cycle
 *   isModalOpen()              — true if a dialog is open
 *   closeModal()               — close the topmost dialog
 *   spatialNav(dir: "up"|"down"|"left"|"right")  — D-pad navigation
 *   scrollContent(dir: "up"|"down")  — smooth-scroll the content zone
 *   FOCUSABLE: string          — CSS selector for focusable elements
 *   MODAL_SELECTOR: string     — CSS selector for modal detection
 *
 * FROM: apps/web/src/components/VirtualKeyboard.tsx
 * ──────────────────────────────────────────────────
 *
 *   openVirtualKeyboard(target: HTMLInputElement | HTMLTextAreaElement)
 *   closeVirtualKeyboard()
 *   isVirtualKeyboardOpen(): boolean
 *   dispatchVkAction(buttonId: string)
 */

// This file is intentionally empty at runtime.
// Exports are provided by the source files listed above.
// When @psg1/core is published to npm, this barrel will wire everything together.
export {};
