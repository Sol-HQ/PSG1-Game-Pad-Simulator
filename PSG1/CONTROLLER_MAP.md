# PSG1 Controller Map — RPS v2

## Standard Gamepad API Mapping

The PSG1 exposes a standard gamepad via the Web Gamepad API (`navigator.getGamepads()`).
Chrome's Android WebView supports this natively — no plugins needed.

## Button Index Reference

| Index | PSG1 Button | Standard Name | RPS Action |
|-------|-------------|---------------|------------|
| 0 | A (bottom face) | Cross / A | Confirm / Submit |
| 1 | B (right face) | Circle / B | Cancel / Back |
| 2 | X (left face) | Square / X | (reserved) |
| 3 | Y (top face) | Triangle / Y | (reserved) |
| 4 | L shoulder | L1 / LB | Previous Tab |
| 5 | R shoulder | R1 / RB | Next Tab |
| 6 | — | L2 / LT | N/A (PSG1 has no L2) |
| 7 | — | R2 / RT | N/A (PSG1 has no R2) |
| 8 | Select | Back / Select | (reserved) |
| 9 | Start | Start / Menu | (reserved) |
| 10 | L3 | Left stick press | (unused) |
| 11 | R3 | Right stick press | (unused) |
| 12 | D-pad Up | DPad Up | Paper |
| 13 | D-pad Down | DPad Down | Next item / Scroll down |
| 14 | D-pad Left | DPad Left | Rock |
| 15 | D-pad Right | DPad Right | Scissors |

## Analog Sticks

### Left Stick — Virtual Pointer (✊)
Deflect the left stick to move a virtual rock-fist cursor across the screen.
Press **A** while the cursor is visible to click the element underneath.
- Speed: 6 CSS px/frame at full deflection
- Deadzone: 0.25
- Auto-hides after 3 seconds of inactivity

### Right Stick — Scroll + Tab Switch
| Axis | Direction | Action |
|------|-----------|--------|
| Y | Up / Down | Scroll page up / down |
| X | Left | Previous tab |
| X | Right | Next tab |
- Scroll speed: 12 px/frame at full deflection
- Tab switch is edge-detected (fires once per deflection, not on hold)

## D-pad Layout

```
            Paper
             [UP]
              ^
  Rock     <     >    Scissors
  [LEFT]      v       [RIGHT]
            [DOWN]
          Next Item
```

## Edge Detection

The gamepad hook uses frame-to-frame edge detection:
- Fires **once** on button press (not on hold)
- Prevents accidental double-inputs
- Polls via `requestAnimationFrame` (~60fps)

## Touchscreen Fallback

The PSG1 has a multi-touch screen. All existing tap/click interactions remain fully functional.
The gamepad is an **additive** input method — it doesn't replace touch, it augments it.
