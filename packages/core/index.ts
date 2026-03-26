/**
 * @psg1/core — PSG1 GamePad Simulator public API
 * ================================================
 *
 * STATUS: Pre-npm documentation barrel.
 * This file documents the full public API that will be published as
 * `npm install @psg1/core` once the package is spun out.
 *
 * RIGHT NOW — copy these files into your project:
 *   apps/web/src/hooks/useGamepad.ts      → your-game/src/hooks/useGamepad.ts
 *   apps/web/src/lib/gamepad-nav.ts       → your-game/src/lib/gamepad-nav.ts
 *   apps/web/src/components/GamepadDebugBridge.tsx  → your-game/src/components/
 *   apps/web/src/components/VirtualKeyboard.tsx     → your-game/src/components/
 *   packages/styles/psg1.css              → your-game/src/styles/psg1.css
 *   apps/web/public/art/                  → your-game/public/art/
 * Then in your globals.css: @import "./psg1.css"
 * Then add ?gp to any URL — the overlay appears.
 *
 * See README.md for the full Quick Start guide.
 *
 * ────────────────────────────────────────────────────────────────
 * PUBLIC API REFERENCE (what will be exported from @psg1/core)
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
 *     Raw event bus. Dispatch "gp:action" CustomEvents to inject
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
 *   scrollContent(dy: number)  — smooth-scroll the content zone
 *   FOCUSABLE: string          — CSS selector for focusable elements
 *   MODAL_SELECTOR: string     — CSS selector for modal detection
 *
 * FROM: apps/web/src/components/VirtualKeyboard.tsx
 * ──────────────────────────────────────────────────
 *
 *   openVirtualKeyboard(target: HTMLInputElement)
 *   closeVirtualKeyboard()
 *   isVirtualKeyboardOpen(): boolean
 *   dispatchVkAction(buttonId: string)
 */

// This file is intentionally empty at runtime.
// Exports are provided by the source files listed above.
// When @psg1/core is published to npm, this barrel will wire everything together.
export {};
