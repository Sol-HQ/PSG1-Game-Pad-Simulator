/**
 * @psg1/core — PSG1 GamePad Simulator public API
 *
 * Install: pnpm add @psg1/core   (or workspace: "workspace:*")
 * CSS:     import "@psg1/styles/psg1.css" in your layout
 * Assets:  copy public/art/ into your project's public/art/
 *
 * Quick start:
 *   import { GameApp } from "@psg1/core";
 *   <GameApp>{children}</GameApp>
 *
 * See docs/INTEGRATE.md for the full guide.
 */

// ── Hooks ────────────────────────────────────────────────────────
export {
  useGamepadPoll,
  useGamepadAction,
  gamepadBus,
  type GamepadAction,
} from "./hooks/useGamepad";

export {
  useGamepadMapper,
  useGamepadCallbacks,
} from "./hooks/useGamepadMapper";

// ── Navigation utilities ─────────────────────────────────────────
export {
  configurePsg1,
  type Psg1Config,
  spatialNav,
  setGpFocus,
  clearGpFocus,
  getGpFocused,
  getFocusablesIn,
  getContentContainer,
  getHeaderItems,
  isModalOpen,
  closeModal,
  cycleHeader,
  cycleAll,
  scrollContent,
  FOCUSABLE,
  MODAL_SELECTOR,
} from "./lib/gamepad-nav";

// ── Mapper (declarative action routing) ──────────────────────────
export {
  installPsg1Mapper,
  loadPsg1Mapping,
  registerPsg1Callback,
  unregisterPsg1Callback,
  getActivePsg1Mapping,
  type Psg1Mapping,
  type Psg1Adapter,
  type DomClickAdapter,
  type CustomEventAdapter,
  type PostMessageAdapter,
  type CallbackAdapter,
} from "./lib/psg1-mapper";

// ── Virtual keyboard helpers ─────────────────────────────────────
export {
  openVirtualKeyboard,
  closeVirtualKeyboard,
  isVirtualKeyboardOpen,
  dispatchVkAction,
} from "./components/VirtualKeyboard";

// ── PSG1 Hardware Specification (immutable, single source of truth) ──
export {
  // Button index constants (Gamepad API)
  BTN_A, BTN_B, BTN_X, BTN_Y,
  BTN_L1, BTN_R1, BTN_L2, BTN_R2,
  BTN_SELECT, BTN_START,
  BTN_L3, BTN_R3,
  BTN_DPAD_UP, BTN_DPAD_DOWN, BTN_DPAD_LEFT, BTN_DPAD_RIGHT,
  BTN_HOME,
  // Axis constants
  AXIS_LX, AXIS_LY, AXIS_RX, AXIS_RY,
  STICK_DEADZONE,
  // Canonical definitions (frozen arrays)
  PSG1_BUTTONS,
  PSG1_STICKS,
  PSG1_SYSTEM_CONTEXTS,
  PSG1_INACCESSIBLE,
  PSG1_DEVICE,
  PADSIM_DEFAULTS,
  // Helpers
  getButtonById,
  getButtonByIndex,
  getGameButtons,
  getSystemButtons,
  getAbsentButtons,
  getPresentButtons,
  // Types
  type ButtonCategory,
  type PhysicalPosition,
  type Psg1ButtonDef,
  type Psg1StickDef,
  type SystemButtonContext,
} from "./lib/psg1-hardware";

// ── Components ───────────────────────────────────────────────────
// Default exports re-exported as named exports for barrel access.
// For dynamic imports (code splitting), use sub-path imports:
//   dynamic(() => import("@psg1/core/components/GamepadDebugBridge"))
//   dynamic(() => import("@psg1/core/components/VirtualKeyboard"))
export { default as GameApp } from "./components/GameApp";
export { default as GamepadDebugBridge } from "./components/GamepadDebugBridge";
export { default as VirtualKeyboard } from "./components/VirtualKeyboard";
