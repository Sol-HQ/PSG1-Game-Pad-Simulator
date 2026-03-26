# PSG1 Controller Map

## Standard Gamepad API Mapping

The PSG1 exposes a standard gamepad via the Web Gamepad API (`navigator.getGamepads()`).
Chrome's Android WebView supports this natively — no plugins needed.

## ⚠️ Non-Standard Face Button Layout

The PSG1 face buttons are **physically swapped** vs Xbox/PlayStation convention:

| Index | PSG1 Physical | Standard Equivalent | PSG1 Action |
|-------|--------------|---------------------|-------------|
| **0** | **B** (bottom face) | Cross / A on Xbox | **Cancel / Back** |
| **1** | **A** (right face) | Circle / B on Xbox | **Confirm / Click** |
| 2 | Y (left face) | Square / X | Refresh / close modal |
| 3 | X (top face) | Triangle / Y | Reserved |

> **Why?** The PSG1's physical button positions differ from Xbox layout.
> The code maps by physical position, not by label chromed onto the housing.
> On Xbox: btn0=A(bottom). On PSG1: btn0=B(bottom), btn1=A(right).
> This was an intentional mapping decision; see `useGamepad.ts` comments.

## Full Button Index Reference

| Index | PSG1 Button | Standard Gamepad API Name | Action |
|-------|-------------|---------------------------|--------|
| 0 | B (bottom face) | Button 0 | Cancel / Back / close modal |
| 1 | A (right face) | Button 1 | Confirm / click / open VK |
| 2 | Y (left face) | Button 2 | Refresh (close modal first) |
| 3 | X (top face) | Button 3 | Reserved (no-op) |
| 4 | L shoulder | L1 / LB | Cycle header left |
| 5 | R shoulder | R1 / RB | Cycle header right |
| 6 | — | L2 / LT | N/A (PSG1 has no L2 trigger) |
| 7 | — | R2 / RT | N/A (PSG1 has no R2 trigger) |
| 8 | Select | Back / Select | Dispatch "select" (e.g. wallet) |
| 9 | Start | Start / Menu | Dispatch "start" (e.g. mode gate) |
| 10 | L3 | Left stick press | Dispatch "l3" (reserved) |
| 11 | R3 | Right stick press | Secondary confirm (same as A) |
| 12 | D-pad Up | DPad Up | Spatial nav up |
| 13 | D-pad Down | DPad Down | Spatial nav down |
| 14 | D-pad Left | DPad Left | Spatial nav left |
| 15 | D-pad Right | DPad Right | Spatial nav right |
| 16 | Home | Home / Guide | Dispatch "home" (app menu, reserved) |

## Analog Sticks

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
