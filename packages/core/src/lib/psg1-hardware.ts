/**
 * PSG1 Hardware Specification — IMMUTABLE
 * ========================================
 *
 * This file is the SINGLE SOURCE OF TRUTH for every physical input on the
 * PSG1 handheld gaming console made by Play Solana (playsolana.com).
 *
 *   Screen:   3.92" diagonal, 1240×1080, multi-touch capacitive
 *   SDK:      PlaySolana-Unity.SDK (Unity New Input System)
 *   Publish:  PlayGate — playgate.playsolana.com
 *   Firmware: Mimics standard Android gamepad (Web Gamepad API compatible)
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  DO NOT MODIFY THESE DEFINITIONS.                              │
 * │  They represent PHYSICAL HARDWARE — not software preferences.  │
 * │                                                                │
 * │  Games map their actions TO these buttons via the PSG1 Mapper. │
 * │  The buttons themselves never change.                          │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Source: https://developers.playsolana.com/psg1-keys
 */

// ═══════════════════════════════════════════════════════════════════
//  GAMEPAD API BUTTON INDICES
//  PSG1 firmware maps to standard Android gamepad → Web Gamepad API.
//
//  CRITICAL: PSG1 maps by PHYSICAL POSITION, not Xbox label order.
//  Bottom face = index 0 = B (on PSG1). NOT A like Xbox.
//  Right face  = index 1 = A (on PSG1). The confirm button.
// ═══════════════════════════════════════════════════════════════════

/** Face buttons — by Gamepad API index */
export const BTN_B     = 0;   // Bottom face — Back / Cancel / Jump
export const BTN_A     = 1;   // Right face  — Confirm / Interact / Talk
export const BTN_Y     = 2;   // Left face   — Attack / Shoot / Run / Grab
export const BTN_X     = 3;   // Top face    — Secondary abilities / Menus / Items

/** Shoulder buttons */
export const BTN_L1    = 4;   // Left shoulder
export const BTN_R1    = 5;   // Right shoulder

/** L2/R2 — NOT PRESENT on PSG1. Indices 6 & 7 are never pressed. */
export const BTN_L2    = 6;   // ❌ Does not exist on PSG1 hardware
export const BTN_R2    = 7;   // ❌ Does not exist on PSG1 hardware

/** Center cluster */
export const BTN_SELECT = 8;  // Select / View — secondary menus, overlays
export const BTN_START  = 9;  // Menu / Start  — pause, system menu, options

/** Stick presses */
export const BTN_L3    = 10;  // Left stick press
export const BTN_R3    = 11;  // Right stick press

/** D-Pad */
export const BTN_DPAD_UP    = 12;
export const BTN_DPAD_DOWN  = 13;
export const BTN_DPAD_LEFT  = 14;
export const BTN_DPAD_RIGHT = 15;

/** Home — ❌ NOT accessible via PSG1 SDK. OS-level only. */
export const BTN_HOME  = 16;

// ═══════════════════════════════════════════════════════════════════
//  ANALOG STICK AXES
//  Both sticks are true 360° analog joysticks.
//  Values range from -1.0 (left/up) to +1.0 (right/down).
// ═══════════════════════════════════════════════════════════════════

export const AXIS_LX = 0;   // Left stick horizontal
export const AXIS_LY = 1;   // Left stick vertical
export const AXIS_RX = 2;   // Right stick horizontal
export const AXIS_RY = 3;   // Right stick vertical

/** Stick deadzone — ignore input below this magnitude (0–1). */
export const STICK_DEADZONE = 0.25;

// ═══════════════════════════════════════════════════════════════════
//  BUTTON CATEGORY: "system" vs "game"
//
//  System buttons have device-level behavior that games cannot
//  override. Their firmware-level function is always active.
//
//  Game buttons are available for mapping. The PSG1 Mapper routes
//  semantic game actions to these buttons.
// ═══════════════════════════════════════════════════════════════════

export type ButtonCategory = "game" | "system" | "absent";

/**
 * Physical position on the PSG1 device.
 * Used for rendering the simulator layout and documentation.
 */
export type PhysicalPosition =
  | "face-right"        // A
  | "face-bottom"       // B
  | "face-top"          // X
  | "face-left"         // Y
  | "shoulder-left"     // L1
  | "shoulder-right"    // R1
  | "dpad-up" | "dpad-down" | "dpad-left" | "dpad-right"
  | "center-select"     // Select
  | "center-start"      // Start
  | "center-home"       // Home (OS-only)
  | "lstick-press"      // L3
  | "rstick-press"      // R3
  | "absent";           // L2/R2 — not on device

// ═══════════════════════════════════════════════════════════════════
//  CANONICAL BUTTON DEFINITIONS
//  Every physical input on the PSG1, frozen and immutable.
// ═══════════════════════════════════════════════════════════════════

export interface Psg1ButtonDef {
  /** Gamepad API button index */
  readonly index: number;
  /** Internal ID used in PADSIM code */
  readonly id: string;
  /** Label printed on the physical device */
  readonly label: string;
  /** Physical position on the hardware */
  readonly position: PhysicalPosition;
  /** system = firmware-level, game = mappable, absent = not on device */
  readonly category: ButtonCategory;
  /** What this button does at the device/firmware level */
  readonly deviceAction: string;
  /**
   * Official purpose from Play Solana docs.
   * This is the INTENDED use documented by the hardware maker.
   */
  readonly officialPurpose: string;
  /** Keyboard shortcut in PADSIM simulator (empty string if none) */
  readonly simKey: string;
  /** Short description for the simulator UI */
  readonly simLabel: string;
}

export const PSG1_BUTTONS: readonly Psg1ButtonDef[] = Object.freeze([
  // ── Face buttons (right side of device) ──
  {
    index: BTN_A,
    id: "a",
    label: "A",
    position: "face-right" as const,
    category: "game" as const,
    deviceAction: "Confirm / Interact / Talk",
    officialPurpose: "Primary confirm — interact, talk, select menu items",
    simKey: "Enter",
    simLabel: "Confirm / Click",
  },
  {
    index: BTN_B,
    id: "b",
    label: "B",
    position: "face-bottom" as const,
    category: "game" as const,
    deviceAction: "Jump / Cancel / Back",
    officialPurpose: "Most accessible button — jump, cancel, back navigation",
    simKey: "Backspace",
    simLabel: "Back / Cancel",
  },
  {
    index: BTN_X,
    id: "x",
    label: "X",
    position: "face-top" as const,
    category: "game" as const,
    deviceAction: "Secondary abilities / Menus / Items",
    officialPurpose: "Secondary actions — menus, items, special abilities",
    simKey: "X",
    simLabel: "Secondary",
  },
  {
    index: BTN_Y,
    id: "y",
    label: "Y",
    position: "face-left" as const,
    category: "game" as const,
    deviceAction: "Attack / Shoot / Run / Grab",
    officialPurpose: "Action button — attack, shoot, run, grab",
    simKey: "Y",
    simLabel: "Action",
  },

  // ── Shoulder buttons ──
  {
    index: BTN_L1,
    id: "l1",
    label: "L",
    position: "shoulder-left" as const,
    category: "game" as const,
    deviceAction: "Quick action / Modifier",
    officialPurpose: "Left shoulder — quick action or input modifier",
    simKey: "[",
    simLabel: "L Shoulder",
  },
  {
    index: BTN_R1,
    id: "r1",
    label: "R",
    position: "shoulder-right" as const,
    category: "game" as const,
    deviceAction: "Quick action / Modifier",
    officialPurpose: "Right shoulder — quick action or input modifier",
    simKey: "]",
    simLabel: "R Shoulder",
  },

  // ── ABSENT: L2/R2 — NOT on PSG1 ──
  {
    index: BTN_L2,
    id: "l2",
    label: "L2",
    position: "absent" as const,
    category: "absent" as const,
    deviceAction: "N/A — NOT PRESENT on PSG1",
    officialPurpose: "Does not exist. PSG1 has shoulder buttons only, no triggers.",
    simKey: "",
    simLabel: "N/A",
  },
  {
    index: BTN_R2,
    id: "r2",
    label: "R2",
    position: "absent" as const,
    category: "absent" as const,
    deviceAction: "N/A — NOT PRESENT on PSG1",
    officialPurpose: "Does not exist. PSG1 has shoulder buttons only, no triggers.",
    simKey: "",
    simLabel: "N/A",
  },

  // ── Center cluster ──
  {
    index: BTN_SELECT,
    id: "select",
    label: "Select",
    position: "center-select" as const,
    category: "system" as const,
    deviceAction: "Secondary menus / Overlays / Utility",
    officialPurpose: "System: secondary menus, overlays, utility actions",
    simKey: "Tab",
    simLabel: "Select",
  },
  {
    index: BTN_START,
    id: "start",
    label: "Start",
    position: "center-start" as const,
    category: "system" as const,
    deviceAction: "Pause / System menu / Options",
    officialPurpose: "System: pause menus, system menus, in-game options",
    simKey: "Space",
    simLabel: "Start / Menu",
  },

  // ── Stick presses ──
  {
    index: BTN_L3,
    id: "l3",
    label: "L3",
    position: "lstick-press" as const,
    category: "game" as const,
    deviceAction: "Left stick press",
    officialPurpose: "Press left analog stick — sprint, crouch, game-defined",
    simKey: "Q",
    simLabel: "L-Stick Press",
  },
  {
    index: BTN_R3,
    id: "r3",
    label: "R3",
    position: "rstick-press" as const,
    category: "game" as const,
    deviceAction: "Right stick press",
    officialPurpose: "Press right analog stick — game-defined action",
    simKey: "E",
    simLabel: "R-Stick Press",
  },

  // ── D-Pad ──
  {
    index: BTN_DPAD_UP,
    id: "up",
    label: "D-Up",
    position: "dpad-up" as const,
    category: "game" as const,
    deviceAction: "Directional Up",
    officialPurpose: "Navigation, movement, menu selection",
    simKey: "ArrowUp",
    simLabel: "D-Pad Up",
  },
  {
    index: BTN_DPAD_DOWN,
    id: "down",
    label: "D-Down",
    position: "dpad-down" as const,
    category: "game" as const,
    deviceAction: "Directional Down",
    officialPurpose: "Navigation, movement, menu selection",
    simKey: "ArrowDown",
    simLabel: "D-Pad Down",
  },
  {
    index: BTN_DPAD_LEFT,
    id: "left",
    label: "D-Left",
    position: "dpad-left" as const,
    category: "game" as const,
    deviceAction: "Directional Left",
    officialPurpose: "Navigation, movement, menu selection",
    simKey: "ArrowLeft",
    simLabel: "D-Pad Left",
  },
  {
    index: BTN_DPAD_RIGHT,
    id: "right",
    label: "D-Right",
    position: "dpad-right" as const,
    category: "game" as const,
    deviceAction: "Directional Right",
    officialPurpose: "Navigation, movement, menu selection",
    simKey: "ArrowRight",
    simLabel: "D-Pad Right",
  },

  // ── Home — NOT accessible via SDK ──
  {
    index: BTN_HOME,
    id: "home",
    label: "Home",
    position: "center-home" as const,
    category: "system" as const,
    deviceAction: "OS-level: return to PSG1 home screen",
    officialPurpose: "NOT accessible via PSG1 SDK. Handled by device firmware only. Volume Up/Down and Fingerprint are also inaccessible.",
    simKey: "H",
    simLabel: "Home (OS)",
  },
]) as readonly Psg1ButtonDef[];

// ═══════════════════════════════════════════════════════════════════
//  ANALOG STICK DEFINITIONS
// ═══════════════════════════════════════════════════════════════════

export interface Psg1StickDef {
  readonly id: string;
  readonly label: string;
  /** Gamepad API axis indices: [horizontal, vertical] */
  readonly axes: readonly [number, number];
  /** True — both PSG1 sticks are full 360° analog joysticks. */
  readonly analog: true;
  /** Description of default device-level behavior */
  readonly deviceAction: string;
  /** Deadzone threshold (0–1) */
  readonly deadzone: number;
}

export const PSG1_STICKS: readonly Psg1StickDef[] = Object.freeze([
  {
    id: "lstick",
    label: "Left Stick",
    axes: [AXIS_LX, AXIS_LY] as const,
    analog: true as const,
    deviceAction: "Primary movement / Directional control (360° analog)",
    deadzone: STICK_DEADZONE,
  },
  {
    id: "rstick",
    label: "Right Stick",
    axes: [AXIS_RX, AXIS_RY] as const,
    analog: true as const,
    deviceAction: "Camera control / Secondary movement / Cursor (360° analog)",
    deadzone: STICK_DEADZONE,
  },
]) as readonly Psg1StickDef[];

// ═══════════════════════════════════════════════════════════════════
//  DEVICE-LEVEL CONTEXT: IN-GAME vs HOME SCREEN
//
//  Some system buttons behave differently depending on whether the
//  user is inside a game or on the PSG1 home screen.
//  This is FIRMWARE behavior — games cannot change it.
// ═══════════════════════════════════════════════════════════════════

export interface SystemButtonContext {
  readonly buttonId: string;
  readonly inGame: string;
  readonly onHomeScreen: string;
  readonly accessible: boolean;
}

export const PSG1_SYSTEM_CONTEXTS: readonly SystemButtonContext[] = Object.freeze([
  {
    buttonId: "home",
    inGame: "Returns to PSG1 home screen (exits game). NOT accessible to game code.",
    onHomeScreen: "No action (already on home screen).",
    accessible: false,
  },
  {
    buttonId: "start",
    inGame: "Pause menu / in-game options. Game CAN receive this input.",
    onHomeScreen: "System settings / device options.",
    accessible: true,
  },
  {
    buttonId: "select",
    inGame: "Secondary overlay / utility action. Game CAN receive this input.",
    onHomeScreen: "System-level secondary menu.",
    accessible: true,
  },
]) as readonly SystemButtonContext[];

// ═══════════════════════════════════════════════════════════════════
//  INACCESSIBLE INPUTS
//  These exist on the physical device but are NOT available via SDK.
// ═══════════════════════════════════════════════════════════════════

export const PSG1_INACCESSIBLE: readonly string[] = Object.freeze([
  "Volume Up",
  "Volume Down",
  "Fingerprint sensor",
  "Home button (firmware-only)",
]);

// ═══════════════════════════════════════════════════════════════════
//  HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/** Look up a button definition by its internal ID. */
export function getButtonById(id: string): Psg1ButtonDef | undefined {
  return PSG1_BUTTONS.find((b) => b.id === id);
}

/** Look up a button definition by its Gamepad API index. */
export function getButtonByIndex(index: number): Psg1ButtonDef | undefined {
  return PSG1_BUTTONS.find((b) => b.index === index);
}

/** All buttons available for game mapping (category === "game"). */
export function getGameButtons(): readonly Psg1ButtonDef[] {
  return PSG1_BUTTONS.filter((b) => b.category === "game");
}

/** System buttons with hard-coded firmware behavior. */
export function getSystemButtons(): readonly Psg1ButtonDef[] {
  return PSG1_BUTTONS.filter((b) => b.category === "system");
}

/** Buttons not present on the PSG1 (L2/R2). */
export function getAbsentButtons(): readonly Psg1ButtonDef[] {
  return PSG1_BUTTONS.filter((b) => b.category === "absent");
}

/** All buttons actually present on the device (game + system). */
export function getPresentButtons(): readonly Psg1ButtonDef[] {
  return PSG1_BUTTONS.filter((b) => b.category !== "absent");
}

// ═══════════════════════════════════════════════════════════════════
//  PADSIM DEFAULTS
//  What the PADSIM simulator maps each button to when NO game
//  mapper is installed. These are the "out of box" behaviors
//  for web navigation.
// ═══════════════════════════════════════════════════════════════════

export const PADSIM_DEFAULTS: Readonly<Record<string, string>> = Object.freeze({
  a:      "Click focused element / Open virtual keyboard for text inputs",
  b:      "Cancel button click / Close modal / Dispatch 'back'",
  x:      "Reserved (no default action)",
  y:      "Close modal if open / Dispatch 'refresh'",
  l1:     "Cycle header tabs left",
  r1:     "Cycle header tabs right",
  up:     "Spatial navigation up in content zone",
  down:   "Spatial navigation down in content zone",
  left:   "Spatial navigation left in content zone",
  right:  "Spatial navigation right in content zone",
  select: "Dispatch 'select' (wallet connect/disconnect in web3 apps)",
  start:  "Dispatch 'start' (navigate to gate/menu)",
  l3:     "Dispatch 'l3' (reserved)",
  r3:     "Click element under pointer / Same as A",
  home:   "Dispatch 'home' (reserved — not accessible on real device)",
  // Sticks
  lstick: "Move virtual pointer (moju cursor) — 360° analog",
  rstick: "Y-axis: scroll content, X-axis: spatial nav left/right",
});

// ═══════════════════════════════════════════════════════════════════
//  DEVICE SPECS (for rendering / documentation)
// ═══════════════════════════════════════════════════════════════════

export const PSG1_DEVICE = Object.freeze({
  name: "PSG1",
  manufacturer: "Play Solana",
  website: "https://playsolana.com",
  devPortal: "https://developers.playsolana.com",
  keysReference: "https://developers.playsolana.com/psg1-keys",
  submissionPortal: "https://playgate.playsolana.com",
  screen: {
    diagonal: "3.92 inches",
    width: 1240,
    height: 1080,
    touch: "Multi-touch capacitive",
  },
  sdk: "PlaySolana-Unity.SDK",
  sdkFramework: "Unity (New Input System)",
  firmware: "Standard Android gamepad (Web Gamepad API compatible)",
  hasTriggers: false,          // No L2/R2
  stickCount: 2,               // Left + Right, both analog 360°
  dpadDirections: 4,           // Up, Down, Left, Right
  faceButtons: 4,              // A, B, X, Y
  shoulderButtons: 2,          // L, R (no triggers)
  centerButtons: 3,            // Select, Start, Home
  stickPresses: 2,             // L3, R3
});
