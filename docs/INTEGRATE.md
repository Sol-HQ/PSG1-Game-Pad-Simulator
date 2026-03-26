# PSG1 — Integration Guide for Solana Game Devs

Copy these 6 files into your Next.js/React game — no npm package needed.

---

## Files to copy

```
FROM this repo → TO your game
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
apps/web/src/hooks/useGamepad.ts     → src/hooks/useGamepad.ts
apps/web/src/lib/gamepad-nav.ts      → src/lib/gamepad-nav.ts
apps/web/src/components/
  GamepadDebugBridge.tsx             → src/components/GamepadDebugBridge.tsx
  VirtualKeyboard.tsx                → src/components/VirtualKeyboard.tsx
apps/web/app/psg1.css                → src/styles/psg1.css   (or app/psg1.css)
apps/web/public/art/                 → public/art/            (moju cursor sprites)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

No extra npm packages. All you need is React 18+ and Next.js 13+.

---

## Step 1 — Import the CSS

In your `globals.css` (or equivalent):

```css
@import "./psg1.css";
```

---

## Step 2 — Mount the polling hook once at your app root

```tsx
// app/layout.tsx (or _app.tsx / root provider) — must be "use client"
"use client";
import { useGamepadPoll } from "@/hooks/useGamepad";

export default function RootLayout({ children }) {
  useGamepadPoll();   // starts hardware polling + simulator key bridge
  return <html><body>{children}</body></html>;
}
```

---

## Step 3 — Load the simulator overlay

```tsx
// Same root component, add after useGamepadPoll():
import dynamic from "next/dynamic";

const GamepadDebugBridge = dynamic(() => import("@/components/GamepadDebugBridge"), { ssr: false });
const VirtualKeyboard    = dynamic(() => import("@/components/VirtualKeyboard"),    { ssr: false });

// Read ?gp once on mount — zero cost in production
const gpDebug = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("gp");

return (
  <html><body>
    {children}
    {gpDebug && <><GamepadDebugBridge /><VirtualKeyboard /></>}
  </body></html>
);
```

Or just drop `<GameApp>` from this repo around your children — it does all of the above in one component.

---

## Step 4 — Mark your navigation elements

**Header tabs (L1 / R1 cycles these):**
```tsx
<button className="gp-cycleable" onClick={() => setTab("Lobby")}>Lobby</button>
<button className="gp-cycleable" onClick={() => setTab("Play")}>Play</button>
<button className="gp-cycleable" onClick={() => setTab("Profile")}>Profile</button>
```

**Scrollable content zone (D-pad + right stick navigate inside this):**
```tsx
<main className="app-shell__main">
  {/* your game content */}
</main>
```

If your content root has a different class, tell the navigator once at boot:
```ts
import { configurePsg1 } from "@/lib/gamepad-nav";
configurePsg1({ contentZone: ".my-game-main" });
```

---

## Step 5 — Respond to semantic actions (optional)

```tsx
import { useGamepadAction } from "@/hooks/useGamepad";

function MyComponent() {
  useGamepadAction((action) => {
    switch (action) {
      case "confirm":  handleConfirm(); break;   // A button
      case "back":     router.back();   break;   // B button
      case "refresh":  reloadData();    break;   // Y button
      case "select":   connectWallet(); break;   // Select
      case "start":    router.push("/"); break;  // Start
    }
  });
}
```

---

## Step 6 — Test it

Add `?gp` to any URL in your game:

```
http://localhost:3000?gp
http://localhost:3000/lobby?gp
```

The PSG1 controller overlay appears. Every button dispatches the same events as real hardware — so your integration is tested before any hardware arrives.

---

## What the classes do

| Class you add | What it does |
|---------------|-------------|
| `.gp-cycleable` | L1 / R1 cycles through these (your nav tabs/buttons) |
| `.app-shell__main` | D-pad + right stick navigate focusable elements inside |

| Class added for you | What it is |
|---------------------|-----------|
| `.gp-focus` | Neon green focus ring on D-pad-focused element |
| `.gp-moju-hover` | Cyan ring on element under the left-stick cursor |

---

## Virtual Keyboard

Fires automatically when A is pressed while a text `<input>` has focus. No setup needed. Uses console-style OSK with D-pad navigation, Backspace, Enter, and a Submit key.

---

## Using `<GameApp>` wrapper (optional)

Instead of wiring everything manually, you can wrap your app with the included `GameApp` component:

```tsx
import GameApp from "@/components/GameApp";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <GameApp contentZone=".my-game-content">
          {children}
        </GameApp>
      </body>
    </html>
  );
}
```

Props:
- `contentZone` (optional) — CSS selector for your scrollable content zone. Default: `".app-shell__main"`

---

## Full button reference

| Button | Gamepad index | Semantic action |
|--------|--------------|----------------|
| A | 1 | `confirm` — click / open VK |
| B | 0 | `back` — cancel / close modal |
| Y | 2 | `refresh` |
| X | 3 | `x` (reserved) |
| L1 | 4 | Cycle header left |
| R1 | 5 | Cycle header right |
| L2 | 6 | (reserved) |
| R2 | 7 | (reserved) |
| Select | 8 | `select` |
| Start | 9 | `start` |
| L3 | 10 | `l3` |
| R3 | 11 | `r3` — secondary confirm |
| D-pad ↑ | 12 | Navigate up |
| D-pad ↓ | 13 | Navigate down |
| D-pad ← | 14 | Navigate left |
| D-pad → | 15 | Navigate right |
| Home | 16 | `home` |
| Left stick X/Y | axes 0/1 | Moju cursor |
| Right stick X | axis 2 | Spatial nav (same as D-pad ←→) |
| Right stick Y | axis 3 | Continuous scroll |

---

## Keyboard shortcuts (when overlay is open)

| Key | Simulates |
|-----|----------|
| ←↑→↓ | D-pad |
| Enter | A |
| Backspace | B |
| Y | Y |
| X | X |
| `[` | L1 |
| `]` | R1 |
| Tab | Select |
| Space | Start |
| Q | L3 |
| E | R3 |
| H | Home |
