# PSG1 Hardware — Controller Map

> **Canonical source of truth:** [`packages/core/src/lib/psg1-hardware.ts`](../packages/core/src/lib/psg1-hardware.ts)
>
> All button indices, labels, categories, default actions, and device specs
> in this document are derived from that file. If this document and the
> TypeScript file ever disagree, **the TypeScript file wins**.

> **PSG1** is a handheld gaming console made by **Play Solana** (playsolana.com) —
> the first gaming console on Solana. It is NOT a PC peripheral or phone accessory.
> Games are built with the **PlaySolana-Unity.SDK** and published via **PlayGate**.
> Source: https://developers.playsolana.com/psg1-keys

---

## Physical Device Facts (official, from Play Solana)

| Spec | Value |
|------|-------|
| Screen | 3.92" diagonal, 1240×1080 resolution |
| Touch | Multi-touch capacitive |
| Triggers | **No L2/R2** — shoulder buttons only (L / R) |
| SDK | PlaySolana-Unity.SDK (Unity New Input System compatible) |
| Submission | PlayGate — playgate.playsolana.com |
| SDK internals | Firmware mimics standard Android gamepad with D-pad buttons |
| Inaccessible | Volume Up/Down, Fingerprint, Home button — NOT in SDK |

---

## Official Button Layout (from developers.playsolana.com/psg1-keys)

### Face Buttons (Right Side of Device)

| PSG1 Button | Physical Position | Official Purpose |
|-------------|-------------------|------------------|
| **A** | Right face | Confirm, interact, talk |
| **B** | Bottom face | Jump, Cancel, Back — **most accessible button** |
| **X** | Top face | Secondary abilities, menus, items |
| **Y** | Left face | Attack, shoot, run, grab |

### All Physical Inputs

| Input | Description |
|-------|-------------|
| D-Pad (Up/Down/Left/Right) | Directional navigation, menus, movement |
| Left Analog Stick | Primary movement / directional control |
| Right Analog Stick | Camera control / secondary movement / cursor |
| Menu / Start | Pause menus, system menus, in-game options |
| Select / View | Secondary menus, overlays, utility actions |
| L Button | Left shoulder — quick actions or modifiers |
| R Button | Right shoulder — quick actions or modifiers |

---

## PADSIM PSG1 — Web Gamepad API Mapping

> **PADSIM PSG1** is Sol-HQ's web-based browser simulator for building PSG1-compatible
> web/WebView games without physical hardware. The mapping below reflects how the
> PSG1 firmware presents to a browser via standard Web Gamepad API `navigator.getGamepads()`.

> **Note on face button indices:** Standard Gamepad API (Xbox layout) maps btn0=A(bottom).
> PSG1 maps btn0=B(bottom) and btn1=A(right) — matching physical position, not label order.
> This is an intentional mapping; see comments in `useGamepad.ts`.

| Index | PSG1 Button | Physical Position | PADSIM Action |
|-------|-------------|-------------------|---------------|
| **1** | **A** | Right face | Confirm / click / open VK |
| **0** | **B** | Bottom face | Cancel / Back / close modal |
| **3** | **X** | Top face | Secondary / reserved |
| **2** | **Y** | Left face | Refresh / close modal |
| 4 | L Button | Left shoulder | Cycle header left |
| 5 | R Button | Right shoulder | Cycle header right |
| 6 | — | (L2 — not present on PSG1) | N/A |
| 7 | — | (R2 — not present on PSG1) | N/A |
| 8 | Select / View | Select | Dispatch `select` |
| 9 | Menu / Start | Start | Dispatch `start` |
| 10 | L3 | Left stick press | Dispatch `l3` (reserved) |
| 11 | R3 | Right stick press | Secondary confirm |
| 12 | D-pad Up | D-pad | Spatial nav up |
| 13 | D-pad Down | D-pad | Spatial nav down |
| 14 | D-pad Left | D-pad | Spatial nav left |
| 15 | D-pad Right | D-pad | Spatial nav right |
| 16 | Home | (Home — not in PSG1 SDK) | N/A / reserved |

---

## Analog Sticks (PADSIM PSG1 Behavior)

### Left Stick — Virtual Pointer (moju cursor)
Deflect the left stick to move a floating moju character sprite across the screen.
Press **A** (btn1) while the cursor is visible to click the element underneath.
- Speed: 6 CSS px/frame at full deflection
- Deadzone: 0.25
- Clamped 16px from viewport edges (cursor never bleeds into browser chrome)
- Auto-hides after 3 seconds of inactivity

### Right Stick — Scroll + Spatial Nav
| Axis | Direction | Action |
|------|-----------|--------|
| Y | Up / Down | Continuous scroll (speed scales with deflection × 4 px/frame) |
| X | Left / Right | Spatial nav left/right (same as D-pad, single-fire per deflection) |
- Deadzone: 0.25
- R-stick X fires once per deflection (edge detection prevents hold-repeat)

## D-pad Layout

```
              ↑ Nav Up
               ^
  ← Nav Left <   > Nav Right →
               v
              ↓ Nav Down
```

D-pad navigates within the **content zone** (`.app-shell__main` by default).
L1/R1 handles the **header zone** (elements marked `.gp-cycleable`).
Pressing D-pad Up from the top of the content zone jumps into the header.

## Edge Detection

The gamepad hook uses frame-to-frame edge detection:
- Fires **once** on button press (not on hold)
- Prevents accidental double-inputs
- Polls via `requestAnimationFrame` (~60fps)

## Touchscreen Fallback

The PSG1 has a multi-touch screen. All existing tap/click interactions remain fully functional.
The gamepad is an **additive** input method — it doesn't replace touch, it augments it.
