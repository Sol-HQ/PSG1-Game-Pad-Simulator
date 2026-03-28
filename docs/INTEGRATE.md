# PSG1 — Integration Guide for Solana Game Devs

> **The scenario this guide is written for:**
> You have a working web game (React, Next.js, Phaser, Unity WebGL, whatever).
> You want it to run on the PSG1 handheld with full button support.
> You don't have the hardware yet — or you just want to test without it.
>
> That's exactly what PADSIM PSG1 solves. Drop in 8 files, add `?gp` to any URL,
> and a virtual PSG1 pad appears in the corner of your browser.
> Every button fires the same events as real hardware.
> Build, test, and submit to PlayGate — no device required.

---

## Two integration paths

| Path | How | Best for |
|------|-----|----------|
| **Path 1 — Copy files** | Copy source files into your project | Any React app, no package manager needed |
| **Path 2 — npm install** | `pnpm add @psg1/core` (once published) | Monorepos, version-locked deps, cleaner updates |

Both paths give you the exact same API. Path 2 is not yet published to npm — use Path 1 for now.

---

## Path 1 — Files to copy

```
FROM this repo → TO your game
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
packages/core/src/hooks/useGamepad.ts        → src/hooks/useGamepad.ts
packages/core/src/hooks/useGamepadMapper.ts  → src/hooks/useGamepadMapper.ts
packages/core/src/lib/gamepad-nav.ts         → src/lib/gamepad-nav.ts
packages/core/src/lib/psg1-mapper.ts         → src/lib/psg1-mapper.ts
packages/core/src/components/
  GamepadDebugBridge.tsx               → src/components/GamepadDebugBridge.tsx
  VirtualKeyboard.tsx                  → src/components/VirtualKeyboard.tsx
packages/styles/psg1.css                   → src/styles/psg1.css   (or app/psg1.css)
apps/web/public/art/                    → public/art/            (moju cursor sprites)
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
import { useGamepadPoll } from "@psg1/core";

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
import { configurePsg1 } from "@psg1/core";
configurePsg1({ contentZone: ".my-game-main" });
```

---

## Step 5 — Respond to semantic actions (optional)

```tsx
import { useGamepadAction } from "@psg1/core";

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
import GameApp from "@psg1/core";

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
| L2 | 6 | (no physical button on PSG1) |
| R2 | 7 | (no physical button on PSG1) |
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

---

## Step 7 — Mapper (declarative action routing)

The **PSG1 Mapper** lets you declare how each button action routes to your game engine or UI — without writing a big `switch` statement everywhere.

It sits on top of `useGamepadAction()`. Both run simultaneously — the mapper adds routing, it doesn't replace existing handlers.

### Adapter types

| Type | What it does | Use for |
|------|-------------|---------|
| `dom-click` | `querySelector(selector).click()` | Any DOM button |
| `custom-event` | `window.dispatchEvent(new CustomEvent(event, …))` | Unity WebGL, Phaser, any JS |
| `postMessage` | `window.postMessage(message, origin)` | iframes, WebWorkers |
| `callback` | Named JS function registered in code | Full React / TS integration |

### Inline mapping (React)

```tsx
import { useGamepadMapper, useGamepadCallbacks } from "@psg1/core";
import type { Psg1Mapping } from "@psg1/core";

// Define OUTSIDE the component — stable reference avoids re-installs.
const MY_MAPPING: Psg1Mapping = {
  version: "1",
  name: "My Game",
  actions: {
    confirm: { type: "dom-click",    selector: "#confirm-btn"      },
    back:    { type: "callback",     callbackId: "goBack"          },
    refresh: { type: "custom-event", event: "game:reload"          },
    start:   { type: "postMessage",  message: { type: "GAME_MENU" } },
  },
};

function MyGameRoot() {
  // Register callbacks BEFORE the mapper so they're ready on first action.
  useGamepadCallbacks({
    goBack: () => router.back(),
  });

  useGamepadMapper(MY_MAPPING);

  return <Game />;
}
```

### JSON file mapping (load from URL)

```ts
import { loadPsg1Mapping } from "@psg1/core";

// Load async — call at app boot or on route change.
const uninstall = await loadPsg1Mapping("/psg1.mapping.json");

// Uninstall later (e.g. on route change):
uninstall();
```

A sample mapping file lives at `apps/web/public/psg1.mapping.sample.json`.

### Custom-event receiver (Unity WebGL / Phaser)

```js
// In your Phaser scene or Unity WebGL glue code:
window.addEventListener("game:reload", (e) => {
  console.log("PSG1 refresh →", e.detail);
  this.scene.restart();
});
```

### PostMessage receiver (iframe)

```js
window.addEventListener("message", (e) => {
  if (!e.data._psg1) return;          // filter: only PSG1 messages
  if (e.data.type === "GAME_MENU") openPauseMenu();
});
```

### Security note for `postMessage`

The mapper defaults to `window.location.origin` as the target origin.
Never set `targetOrigin: "*"` unless you understand the cross-origin implications.
For same-origin games the default is always correct.

---

## Live demo

Run the demo app (`pnpm dev` → add `?gp` to any URL). The settings panel has three tabs:

- **Live Log** — every button press and action fires in real-time
- **Button Map** — shows the active mapping (action → adapter type → target)
- **Integrate** — quick-start reference copied from this guide

---

## Which adapter should I use?

| Your game is built with | Use this adapter |
|-------------------------|------------------|
| React / Next.js | `callback` — register a JS function, call whatever you need |
| Phaser / PixiJS | `custom-event` — fire `window.CustomEvent`, receive it in your scene |
| Unity WebGL | `custom-event` — Unity's `SendMessage` bridge or `window.dispatchEvent` |
| iframe embed | `postMessage` — safe cross-origin message, filter by `e.data._psg1` |
| Any DOM button | `dom-click` — just pass a CSS selector, no code changes in game |

When in doubt: start with `dom-click`. It works with any existing button without touching game code.
