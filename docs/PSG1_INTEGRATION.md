# PSG1 Integration Reference

> Complete technical reference for integrating PADSIM PSG1 into any web or WebView game.
> Covers every source file, every CSS class, every constant, the adapter/mapper system,
> TWA packaging for Android/PlayGate, and a passing test checklist.
>
> Cross-references: [INTEGRATE.md](INTEGRATE.md) (quick start) · [LAYMANS_MANUAL.md](LAYMANS_MANUAL.md) (step-by-step walkthrough) · [../PSG1/CONTROLLER_MAP.md](../PSG1/CONTROLLER_MAP.md) (hardware map) · [../PSG1/PLAYGATE.md](../PSG1/PLAYGATE.md) (submission)

---

## Table of Contents

1. [Repository Map](#1-repository-map)
2. [Files You Copy Into Your Game](#2-files-you-copy-into-your-game)
3. [Step-by-Step Integration](#3-step-by-step-integration)
4. [CSS Classes Reference](#4-css-classes-reference)
5. [Semantic Actions API](#5-semantic-actions-api)
6. [Gamepad Runtime Constants](#6-gamepad-runtime-constants)
7. [The Mapper / Adapter System](#7-the-mapper--adapter-system)
8. [Virtual Keyboard](#8-virtual-keyboard)
9. [TWA — Trusted Web Activity (Android / PlayGate)](#9-twa--trusted-web-activity-android--playgate)
10. [PlayGate Submission Checklist](#10-playgate-submission-checklist)
11. [Testing Checklist](#11-testing-checklist)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Repository Map

Every folder and file in this repo exists for a specific reason. Nothing is decorative.

```
PSG1-Game-Pad-Simulator/
│
├── apps/
│   └── web/                   Next.js 15 demo app — the live testbed for PSG1 integration.
│       ├── app/
│       │   ├── layout.tsx     Root layout. Wraps children in <GameApp>. This is the
│       │   │                  integration pattern you copy to your own layout.tsx.
│       │   ├── page.tsx       Placeholder ("Your game renders here"). Replace with your
│       │   │                  game component in the real integration.
│       │   ├── globals.css    Imports psg1.css. Required so the focus rings, pointer,
│       │   │                  overlay, and VK styles are present at runtime.
│       │   └── psg1.css       Symlink/copy of packages/styles/psg1.css for the Next.js
│       │                      app router. All gamepad visual styles live here.
│       ├── src/
│       │   ├── components/
│       │   │   ├── GameApp.tsx            ← COPY THIS or inline its pattern.
│       │   │   │   Mounts the hardware polling hook (useGamepadPoll) once at the app
│       │   │   │   root. Loads GamepadDebugBridge + VirtualKeyboard dynamically only
│       │   │   │   when ?gp is in the URL. Zero bytes added to the production bundle
│       │   │   │   unless the overlay is requested.
│       │   │   │   Props: contentZone?: string (CSS selector override for D-pad zone)
│       │   │   │
│       │   │   ├── GamepadDebugBridge.tsx ← COPY THIS.
│       │   │   │   The visual PSG1 simulator overlay. Renders floating button pad,
│       │   │   │   settings panel (Live Log / Button Map / Integrate tabs), and wires
│       │   │   │   keyboard shortcuts. Every button fires pressButton(id) which calls
│       │   │   │   the same spatialNav / cycleHeader / dispatch functions as real HW.
│       │   │   │
│       │   │   ├── VirtualKeyboard.tsx    ← COPY THIS.
│       │   │   │   Console-style on-screen keyboard (QWERTY + numeric keypad).
│       │   │   │   Auto-opens when A is pressed while a text <input> or <textarea>
│       │   │   │   has gamepad focus. Uses the native setter trick so React controlled
│       │   │   │   inputs receive onChange events correctly.
│       │   │   │
│       │   │   └── DemoShell.tsx          Demo-only. Not needed for integration.
│       │   │       Shows button press log and the "Your game renders here" placeholder.
│       │   │
│       │   ├── hooks/
│       │   │   ├── useGamepad.ts          ← COPY THIS.
│       │   │   │   Core polling loop (requestAnimationFrame). Reads all 17 buttons +
│       │   │   │   4 axes via navigator.getGamepads(). Exposes:
│       │   │   │     useGamepadPoll()     — mount once at root
│       │   │   │     useGamepadAction()   — subscribe from any component
│       │   │   │     gamepadBus           — raw EventTarget for synthetic inputs
│       │   │   │
│       │   │   └── useGamepadMapper.ts    ← COPY THIS.
│       │   │       React hook wrappers around psg1-mapper.ts. Exposes:
│       │   │         useGamepadMapper()   — install declarative mapping, auto-unmount
│       │   │         useGamepadCallbacks() — register named callbacks, auto-deregister
│       │   │
│       │   └── lib/
│       │       ├── gamepad-nav.ts         ← COPY THIS.
│       │       │   All navigation logic: spatial D-pad, L1/R1 header cycling,
│       │       │   modal detection, scroll, focus ring management, and
│       │       │   configurePsg1({ contentZone }). Pure TypeScript — no React.
│       │       │
│       │       └── psg1-mapper.ts         ← COPY THIS.
│       │           Declarative action-to-adapter routing engine. Four adapters:
│       │           dom-click · custom-event · postMessage · callback.
│       │           Exposes installPsg1Mapper(), loadPsg1Mapping(),
│       │           registerPsg1Callback(), getActivePsg1Mapping().
│       │
│       └── public/
│           ├── art/                       ← COPY THIS FOLDER.
│           │   Moju cursor sprite sheets (gold + teal variants, 5 sizes each: 16/24/32/48/64px).
│           │   Required: /art/moju-gold-32.png is hard-coded as the cursor image in
│           │   useGamepad.ts. If you rename the folder you must update that path.
│           │
│           └── brand/                     Demo branding only. Not needed for integration.
│
├── packages/
│   ├── core/
│   │   └── index.ts           Pre-npm API documentation + re-export barrel.
│   │                          Documents the full public API for when @psg1/core is
│   │                          eventually published. Read this for the API surface — do
│   │                          not depend on it as a package yet (copy files instead).
│   │
│   └── styles/
│       └── psg1.css           ← COPY THIS FILE.
│           The single CSS file you import into your project. Contains:
│           - .gp-focus ring (neon green, D-pad current element)
│           - .gp-moju-hover ring (cyan, left-stick cursor hover)
│           - .gp-cycleable ring (gold, L1/R1 active element)
│           - .gamepad-cursor (the floating pointer div, absolutely positioned)
│           - .gp-sim overlay layout (the floating PSG1 pad)
│           - .vk-* virtual keyboard styles
│           - All focus ring z-index and animation classes
│
├── PSG1/
│   ├── CONTROLLER_MAP.md      Official hardware button layout from Play Solana docs.
│   │                          PSG1 device specs: screen, touch, no L2/R2.
│   │                          Web Gamepad API index table (btn0=B, btn1=A — PSG1 layout).
│   │                          Axis mapping, deadzone, edge detection, stick behavior.
│   │
│   └── PLAYGATE.md            PlayGate submission guide. Hardware requirements, test
│                              checklist before submit, accepted formats (Web / PWA / TWA).
│
└── docs/
    ├── INTEGRATE.md           Quick-start integration guide (8 steps, code blocks).
    ├── LAYMANS_MANUAL.md      Step-by-step walkthrough for humans and AI agents.
    ├── PSG1_INTEGRATION.md    This file — full technical reference.
    └── PSG1_ORIGIN.md         Origin story: why this was extracted from RPS v2.
```

---

## 2. Files You Copy Into Your Game

Copy exactly these 8 items. Nothing more is required.

```
FROM this repo                                    → TO your game
───────────────────────────────────────────────────────────────────────────────
apps/web/src/hooks/useGamepad.ts         → src/hooks/useGamepad.ts
apps/web/src/hooks/useGamepadMapper.ts   → src/hooks/useGamepadMapper.ts
apps/web/src/lib/gamepad-nav.ts          → src/lib/gamepad-nav.ts
apps/web/src/lib/psg1-mapper.ts          → src/lib/psg1-mapper.ts
apps/web/src/components/GamepadDebugBridge.tsx  → src/components/GamepadDebugBridge.tsx
apps/web/src/components/VirtualKeyboard.tsx     → src/components/VirtualKeyboard.tsx
packages/styles/psg1.css                 → src/styles/psg1.css  (or wherever globals live)
apps/web/public/art/                     → public/art/           (entire folder)
───────────────────────────────────────────────────────────────────────────────
```

**Why each file is needed:**

| File | Why you need it |
|------|----------------|
| `useGamepad.ts` | Core polling loop. Without it, no button events fire. Mount once with `useGamepadPoll()`. |
| `useGamepadMapper.ts` | React hook wrappers for the mapper. Skip if you don't use declarative routing. |
| `gamepad-nav.ts` | D-pad navigation, L1/R1 cycling, modal detection, focus ring logic. Without it, buttons do nothing spatially. |
| `psg1-mapper.ts` | Routes actions to dom-click / custom-event / postMessage / callback adapters. Skip if you use only `useGamepadAction()`. |
| `GamepadDebugBridge.tsx` | The visual simulator overlay. Without it, you have no on-screen pad to test with. |
| `VirtualKeyboard.tsx` | On-screen keyboard for text inputs. Without it, text fields are unreachable via gamepad. |
| `psg1.css` | All visual styles — focus rings, cursor, overlay layout. Without it, focus state is invisible. |
| `public/art/` | Moju cursor sprite. `useGamepad.ts` loads `/art/moju-gold-32.png` at runtime. Missing it causes a broken cursor image. |

**Prerequisites — no extra npm packages:**

- React 18+
- Next.js 13+ (App Router or Pages Router both work)
- TypeScript 4.9+ (optional but the files are typed)
- `tsconfig.json` must have `@/*` path alias pointing to your source root

---

## 3. Step-by-Step Integration

### Step 1 — Import the CSS

In your `globals.css` (or `_app.tsx` / root CSS entry point):

```css
/* Adjust the relative path to where you placed psg1.css */
@import "./psg1.css";
```

This single import provides every visual class the system needs: focus rings, the moju pointer,
the overlay layout, and the Virtual Keyboard. No Tailwind or CSS modules required.

---

### Step 2 — Mount the polling hook once at your app root

The polling hook **must be mounted exactly once** in the React tree and **never unmounted** for
the lifetime of your app. It starts the `requestAnimationFrame` loop that reads
`navigator.getGamepads()` 60 times per second.

**Next.js App Router (`app/layout.tsx`):**

```tsx
// app/layout.tsx
"use client";
import { useGamepadPoll } from "@/hooks/useGamepad";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useGamepadPoll();
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

**Next.js Pages Router (`pages/_app.tsx`):**

```tsx
// pages/_app.tsx
"use client";
import type { AppProps } from "next/app";
import { useGamepadPoll } from "@/hooks/useGamepad";

export default function App({ Component, pageProps }: AppProps) {
  useGamepadPoll();
  return <Component {...pageProps} />;
}
```

---

### Step 3 — Load the simulator overlay (SSR-safe)

The simulator overlay reads `window.location.search` which does not exist during server-side
rendering. You **must** read it inside `useEffect`, not at render time.

**Inline pattern (if you are not using `<GameApp>`):**

```tsx
"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Dynamic imports: neither module ships in the production JS bundle
// unless ?gp is present in the URL. They are loaded only on mount,
// after the check below confirms the flag is set.
const GamepadDebugBridge = dynamic(
  () => import("@/components/GamepadDebugBridge"),
  { ssr: false }
);
const VirtualKeyboard = dynamic(
  () => import("@/components/VirtualKeyboard"),
  { ssr: false }
);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [gpDebug, setGpDebug] = useState(false);

  // Read ?gp AFTER mount. Using window directly during render causes a
  // hydration mismatch because the server renders false and the client
  // may render true. useEffect only runs on the client.
  useEffect(() => {
    setGpDebug(new URLSearchParams(window.location.search).has("gp"));
  }, []);

  return (
    <html lang="en">
      <body>
        {children}
        {gpDebug && (
          <>
            <GamepadDebugBridge />
            <VirtualKeyboard />
          </>
        )}
      </body>
    </html>
  );
}
```

**Or use `<GameApp>` — it does all of the above in one component:**

```tsx
// app/layout.tsx
import GameApp from "@/components/GameApp";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <GameApp contentZone=".my-game-content">
          {children}
        </GameApp>
      </body>
    </html>
  );
}
```

`<GameApp>` props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | — | Your app content |
| `contentZone` | `string` | `".app-shell__main"` | CSS selector for the D-pad / right-stick navigation zone |

---

### Step 4 — Mark your navigation elements

Two HTML attributes control how the gamepad navigates your UI:

**L1 / R1 — header cycling (`gp-cycleable`):**

Add this class to every button, tab, or link in your top navigation that should be reachable
with the shoulder buttons. The system picks them up by DOM order.

```tsx
<nav>
  <button className="gp-cycleable" onClick={() => setTab("game")}>Game</button>
  <button className="gp-cycleable" onClick={() => setTab("leaderboard")}>Leaderboard</button>
  <button className="gp-cycleable" onClick={() => setTab("profile")}>Profile</button>
</nav>
```

Rules:
- Add it only to top-level navigation — not to action buttons inside the game board
- Any number of elements is supported
- L1 / R1 stop at edges — they do not wrap around
- Works with any element type (button, a, div with onClick)

**D-pad / right stick — content zone (`.app-shell__main`):**

Wrap your scrollable game content in a container with this class (or configure a custom selector):

```tsx
<main className="app-shell__main">
  {/* D-pad navigates focusable elements in here */}
  {/* Right stick Y scrolls this zone */}
</main>
```

If your content root already has a different class, tell the system once at app boot:

```ts
// Call this BEFORE any gamepad events fire, e.g. inside a useEffect at your root.
import { configurePsg1 } from "@/lib/gamepad-nav";
configurePsg1({ contentZone: ".my-game-content" });
```

Or pass `contentZone` directly to `<GameApp>` as shown in Step 3.

---

### Step 5 — Respond to semantic actions (optional)

If you only need D-pad + A/B navigation and your routes are already handled by clicks,
you can skip this step. Wire it when you need buttons to trigger custom game logic
(e.g. Y = reload match list, Select = connect wallet, Start = return to main menu).

```tsx
import { useGamepadAction } from "@/hooks/useGamepad";

function MyGameComponent() {
  useGamepadAction((action) => {
    switch (action) {
      case "back":    router.back();       break; // B button
      case "refresh": reloadData();        break; // Y button
      case "select":  connectWallet();     break; // Select button
      case "start":   router.push("/");    break; // Start button
      // "confirm", "x", "l3", "r3", "home" — handle if your game uses them
    }
  });

  return <YourGame />;
}
```

`useGamepadAction` can be called in multiple components simultaneously. All listeners fire.
It auto-deregisters on component unmount.

See [Section 5](#5-semantic-actions-api) for the full action reference.

---

### Step 6 — Test with ?gp

Add `?gp` to any URL in your running game — local or deployed:

```
http://localhost:3000?gp
http://localhost:3000/lobby?gp
https://my-game.vercel.app?gp
https://my-game.vercel.app/game?gp
```

The PSG1 controller overlay appears in the lower right corner. Use the buttons to test
navigation, confirm, back, and text input. Every event fired by the simulator is identical
to what real PSG1 hardware fires.

**Keyboard shortcuts available when overlay is visible:**

| Key | Simulates |
|-----|-----------|
| ← ↑ → ↓ | D-pad |
| `Enter` | A (confirm) |
| `Backspace` | B (back/cancel) |
| `Y` | Y (refresh) |
| `X` | X (reserved) |
| `[` | L1 (cycle left) |
| `]` | R1 (cycle right) |
| `Tab` | Select |
| `Space` | Start |
| `Q` | L3 |
| `E` | R3 (secondary confirm) |
| `H` | Home |

---

## 4. CSS Classes Reference

### Classes you add to your markup

| Class | Applied by | What it does |
|-------|-----------|--------------|
| `.gp-cycleable` | You | Marks an element for L1/R1 header cycling. Add to nav tabs, header buttons. |
| `.app-shell__main` | You | Marks the scrollable content zone for D-pad + right-stick navigation. Override with `configurePsg1({ contentZone })`. |

### Classes added automatically by the system

| Class | Applied by | What it does |
|-------|-----------|--------------|
| `.gp-focus` | `setGpFocus()` in gamepad-nav.ts | Neon green focus ring on the D-pad-focused element. Only one element has this at a time. |
| `.gp-moju-hover` | Pointer update loop in useGamepad.ts | Cyan ring on the element currently under the left-stick moju cursor. |
| `.gamepad-cursor` | `useGamepadPoll()` | The floating moju sprite div injected into `document.body` at poll start. Do not add manually. |
| `.gp-sim` | `GamepadDebugBridge.tsx` | Root of the simulator overlay. D-pad navigation and `.gp-cycleable` queries explicitly exclude elements inside this div. |
| `.vk-*` | `VirtualKeyboard.tsx` | All on-screen keyboard elements. Do not style or reference these manually. |

### Important CSS behaviour

- `.gp-focus` does NOT call `element.focus()` — intentionally. Moving real browser focus
  allows the focus chain to escape to the URL bar on subsequent D-pad presses. The ring is
  CSS-only. The `setGpFocus()` function calls `document.activeElement.blur()` instead.
- `.gp-cycleable` elements outside the `.gp-sim` overlay are included in L1/R1 cycling by DOM order.
- Elements inside `[aria-hidden="true"]` and `.gp-sim` are excluded from `getFocusablesIn()`.
- Only elements with `getBoundingClientRect()` area > 0 are included (no hidden elements).

---

## 5. Semantic Actions API

### `useGamepadPoll()` — hardware polling loop

```ts
import { useGamepadPoll } from "@/hooks/useGamepad";
```

Mount **once** at app root. Starts the `requestAnimationFrame` loop.
Polls `navigator.getGamepads()` — picks the first connected gamepad (index 0–3).
Handles all button edge detection, stick deadzones, VK intercept, modal grace period,
pointer mode, and cursor edge-scroll internally.

Returns `void`. Has no props or return value to manage.

---

### `useGamepadAction(handler)` — event subscription

```ts
import { useGamepadAction } from "@/hooks/useGamepad";
useGamepadAction((action: GamepadAction) => { /* ... */ });
```

Subscribes to semantic actions dispatched by the polling loop. Fires when a mapped button
is pressed whose navigation is not handled internally (internal: D-pad nav, L1/R1 cycle, VK).

Auto-deregisters on component unmount. Multiple calls across different components all fire.

---

### `GamepadAction` — complete type reference

```ts
type GamepadAction =
  | "confirm"  // A btn (index 1) — click focused element or open Virtual Keyboard
  | "back"     // B btn (index 0) — findCancelButton → closeModal → dispatch "back"
  | "x"        // X btn (index 3) — context action, reserved, dispatch "x"
  | "refresh"  // Y btn (index 2) — dispatch "refresh" (try closeModal first)
  | "select"   // Select (index 8)  — dispatch "select"
  | "start"    // Start  (index 9)  — dispatch "start"
  | "l3"       // L3     (index 10) — dispatch "l3", reserved
  | "r3"       // R3     (index 11) — secondary confirm (same as A, no restrictions)
  | "home";    // Home   (index 16) — dispatch "home", reserved
```

**Actions NOT dispatched** (handled internally — they never reach `useGamepadAction`):

| Button | Why not dispatched |
|--------|--------------------|
| L1 (4) | Directly calls `cycleHeader(-1)` |
| R1 (5) | Directly calls `cycleHeader(1)` |
| D-pad 12–15 | Directly calls `spatialNav(direction)` |
| Left stick axes 0/1 | Updates moju cursor position directly |
| Right stick axis 3 Y | Calls `scrollContent()` directly |
| Right stick axis 2 X | Calls `spatialNav("left"/"right")` directly |

---

### `gamepadBus` — raw event bus

```ts
import { gamepadBus } from "@/hooks/useGamepad";

// Inject a synthetic action (e.g. from a test harness):
gamepadBus?.dispatchEvent(
  new CustomEvent("gamepad-action", { detail: "confirm" })
);

// Inject a cursor move (e.g. from touch input):
gamepadBus?.dispatchEvent(
  new CustomEvent("gamepad-cursor-move", { detail: { dx: 10, dy: -5 } })
);
```

`gamepadBus` is null during SSR (no `window`). Always use optional chaining (`?.`).

---

## 6. Gamepad Runtime Constants

These are hard-coded in source. If you need to change them, edit the source files directly.

| Constant | Value | File | What it controls |
|----------|-------|------|-----------------|
| `DEADZONE` | `0.25` | useGamepad.ts | Stick input below this magnitude is ignored. Range 0–1. |
| `POINTER_SPEED` | `6` | useGamepad.ts | CSS pixels per animation frame at full stick deflection for the moju cursor. |
| `DIALOG_GRACE_MS` | `500` | useGamepad.ts | Milliseconds to ignore B/Y close after a modal opens. Prevents the same press that opened a modal from immediately closing it. |
| `CURSOR_STEP` | `30` | GamepadDebugBridge.tsx | CSS pixels per click of a simulator left-stick button on the overlay. |
| `ROW_THRESHOLD` | `24` | gamepad-nav.ts | Items within this many px of vertical distance are considered the same D-pad row. |
| Cursor clamp | `16px` | useGamepad.ts | Cursor is clamped 16px from all viewport edges. The 32px sprite never visually enters browser chrome. |
| Cursor hide delay | `3000ms` | useGamepad.ts | Moju cursor auto-hides after 3 seconds of no stick movement. |
| L1/R1 wrap | **none** | gamepad-nav.ts | Cycling stops at the first and last `.gp-cycleable` element. It does not wrap. |
| Right stick scroll | `axis 3 × 4` | useGamepad.ts | Right stick Y axis value is multiplied by 4 for scroll speed. |
| Modal selector | `dialog[open], [role="dialog"]:not([aria-hidden="true"]), .wallet-adapter-modal-wrapper` | gamepad-nav.ts | Elements matching this are treated as modals (constrain D-pad, B/Y close). |

---

## 7. The Mapper / Adapter System

The mapper is an **optional** layer on top of `useGamepadAction()`. It lets you declare how
each action routes to your game engine without writing `switch` statements in every component.

Both systems run simultaneously. The mapper intercepts actions and fires adapters. If no
adapter is registered for an action, `useGamepadAction()` still receives it normally.

Only **one mapper** is active at a time. Installing a second mapper auto-uninstalls the
previous one.

---

### Adapter types

| Type | What it does | When to use |
|------|-------------|-------------|
| `dom-click` | Calls `.click()` on the first visible matching DOM element | Any existing button. Works without touching game code. |
| `custom-event` | Dispatches `new CustomEvent(name, {detail})` on `window` | Unity WebGL, Phaser scenes, any non-React JS code that listens to DOM events. |
| `postMessage` | Calls `window.postMessage(payload, origin)` | iframes, WebWorkers, cross-origin game shells. |
| `callback` | Calls a named function registered with `registerPsg1Callback()` | React / TypeScript full integration when you want type-safe callbacks. |

---

### Inline React mapping (recommended for React/Next.js)

```tsx
import { useGamepadMapper, useGamepadCallbacks } from "@/hooks/useGamepadMapper";
import type { Psg1Mapping } from "@/lib/psg1-mapper";

// Define OUTSIDE the component (or with useMemo) so the object reference is stable.
// A new reference on every render would reinstall the mapper on every render.
const MY_MAPPING: Psg1Mapping = {
  version: "1",
  name: "My Game",
  actions: {
    confirm: { type: "dom-click",    selector: "#confirm-btn"       },
    back:    { type: "callback",     callbackId: "goBack"           },
    refresh: { type: "custom-event", event: "game:reload"           },
    start:   { type: "postMessage",  message: { type: "OPEN_MENU" } },
  },
};

function MyGameRoot() {
  // Register callbacks BEFORE useGamepadMapper() so they exist before the
  // first action fires. useGamepadCallbacks auto-deregisters on unmount.
  useGamepadCallbacks({
    goBack: () => router.back(),
  });

  useGamepadMapper(MY_MAPPING);

  return <Game />;
}
```

---

### Installing the mapper imperatively (non-React)

```ts
import { installPsg1Mapper } from "@/lib/psg1-mapper";

const uninstall = installPsg1Mapper({
  version: "1",
  name: "Phaser Scene 1",
  actions: {
    confirm: { type: "custom-event", event: "game:confirm" },
    back:    { type: "custom-event", event: "game:back"    },
  },
});

// Later, when the scene ends:
uninstall();
```

---

### Loading a mapping from a JSON file

This lets designers edit button mappings without touching code. Host a JSON file at a
publicly reachable URL (e.g. `/psg1.mapping.json` in your `public/` folder):

```json
{
  "version": "1",
  "name": "My Game v1",
  "actions": {
    "confirm": { "type": "dom-click",    "selector": "#confirm-btn"      },
    "back":    { "type": "custom-event", "event":    "game:back"         },
    "start":   { "type": "postMessage",  "message":  { "type": "MENU" } }
  }
}
```

Load it at app boot:

```ts
import { loadPsg1Mapping } from "@/lib/psg1-mapper";

// loadPsg1Mapping fetches the URL, parses it, and calls installPsg1Mapper().
// Returns a Promise that resolves to the uninstall function.
const uninstall = await loadPsg1Mapping("/psg1.mapping.json");

// Swap mapping on route change:
uninstall();
const uninstall2 = await loadPsg1Mapping("/psg1.mapping.level2.json");
```

A sample mapping file is at `apps/web/public/psg1.mapping.sample.json`.

---

### Receiving custom events (Unity WebGL / Phaser)

```js
// In your Phaser scene (or Unity WebGL JS template):
window.addEventListener("game:reload", (e) => {
  // e.detail is the optional detail payload from the mapping.
  console.log("PSG1 refresh fired", e.detail);
  this.scene.restart();
});

window.addEventListener("game:confirm", (e) => {
  this.input.emit("gamepad-confirm");
});
```

---

### Receiving postMessage (iframe)

```js
// In the iframe document:
window.addEventListener("message", (e) => {
  // Always filter — only handle PSG1 messages.
  if (!e.data || !e.data._psg1) return;

  switch (e.data.type) {
    case "OPEN_MENU": openPauseMenu(); break;
    case "BACK":      returnToLobby(); break;
  }
});
```

The mapper automatically appends `_psg1: true` to every postMessage payload so you can
filter reliably without checking every incoming message.

**Security:** The mapper defaults `targetOrigin` to `window.location.origin`. This means
postMessages are only delivered to the same origin. Never set `targetOrigin: "*"` unless
you have audited the cross-origin implications — it allows any page to receive your gamepad
events.

---

### Registering callbacks imperatively

```ts
import { registerPsg1Callback, unregisterPsg1Callback } from "@/lib/psg1-mapper";

// Register before installing the mapper.
registerPsg1Callback("openShop",    () => setShopOpen(true));
registerPsg1Callback("goBack",      () => router.back());
registerPsg1Callback("togglePause", () => setPaused((p) => !p));

// Deregister when a scene or route unloads.
unregisterPsg1Callback("openShop");
```

---

### Reading the active mapping (debug)

```ts
import { getActivePsg1Mapping } from "@/lib/psg1-mapper";

// Returns the currently installed Psg1Mapping, or null if no mapper is active.
// The PSG1 simulator overlay's "Button Map" tab calls this to display the table.
const mapping = getActivePsg1Mapping();
console.log(mapping?.name, mapping?.actions);
```

---

## 8. Virtual Keyboard

The Virtual Keyboard (VK) opens automatically — no integration code required — when:

1. A gamepad is connected (or the simulator is open)
2. D-pad focus lands on an `<input>` or `<textarea>`
3. The user presses A (confirm)

It fires the correct keyboard **only** for the input type:
- `<input type="number">` or `inputMode="decimal"` / `inputMode="numeric"` → Numeric keypad
- Everything else → QWERTY layout

**QWERTY layout:**
```
1 2 3 4 5 6 7 8 9 0
Q W E R T Y U I O P
A S D F G H J K L '
Z X C V B N M . - _
[SPACE] [⌫ Backspace] [✓ DONE]
```

**Numeric layout:**
```
1 2 3
4 5 6
7 8 9
. 0 ⌫
  ✓ DONE
```

**React controlled inputs:** The VK uses the native setter trick to fire `onChange` events
on React controlled inputs. It reads the prototype setter directly and dispatches an `input`
event so React's synthetic event system picks up the change:

```ts
const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
setter?.call(el, newValue);
el.dispatchEvent(new Event("input", { bubbles: true }));
```

This is necessary because setting `element.value = "..."` directly does not trigger React's
`onChange` handler.

**Module-level API** (used internally by `useGamepadPoll` and `GamepadDebugBridge`):

```ts
import {
  openVirtualKeyboard,   // openVirtualKeyboard(el) — focus a specific input
  closeVirtualKeyboard,  // closeVirtualKeyboard()  — dismiss and return to nav
  isVirtualKeyboardOpen, // isVirtualKeyboardOpen() → boolean
  dispatchVkAction,      // dispatchVkAction(id)    — route a button to VK internally
} from "@/components/VirtualKeyboard";
```

These are low-level — you should not need to call them directly.

---

## 9. TWA — Trusted Web Activity (Android / PlayGate)

A **Trusted Web Activity (TWA)** is an Android app that opens a full-screen Chrome Custom Tab
pointed at your HTTPS web game URL. The browser chrome (address bar, tabs) is completely hidden.
The user sees only your game. On PSG1, this means your web game runs with the native Android
gamepad stack, and the Web Gamepad API inside Chrome receives real PSG1 hardware events.

PlayGate accepts TWA APKs as a submission format alongside hosted web URLs and PWAs.

---

### Why TWA for PSG1?

| Approach | Pros | Cons |
|----------|------|------|
| Hosted web URL | Simplest — just a URL | Requires internet, browser chrome visible unless fullscreen API used |
| PWA (manifest) | Installable, offline support | Still limited by WebView capabilities on some Android versions |
| **TWA (APK)** | **App store listing, native fullscreen, verified domain, real gamepad events** | Requires build step, keystore management, assetlinks.json |

On PSG1 hardware, TWA is the recommended path for production games because:
1. The PSG1 firmware delivers gamepad events as standard Android gamepad (no L2/R2 axes)
2. Chrome Custom Tab inside a TWA receives Web Gamepad API events correctly
3. `navigator.getGamepads()` works inside TWA the same as in a desktop browser
4. `useGamepadPoll()` polls at 60fps via `requestAnimationFrame` — same as any Chrome tab

---

### Prerequisites

| Requirement | Details |
|-------------|---------|
| HTTPS game URL | Must be live and publicly accessible. `localhost` does not work for TWA. |
| Web App Manifest | `public/manifest.json` with `name`, `short_name`, `start_url`, `display: "standalone"`, `icons`. |
| `.well-known/assetlinks.json` | Hosted at `https://yourdomain.com/.well-known/assetlinks.json`. Links the APK's signing cert to the domain. |
| Java JDK 11+ | Required by Bubblewrap and Android build tools. |
| Android SDK | Or use the Docker path in Bubblewrap. |
| Node.js 18+ | Bubblewrap CLI runs on Node. |

---

### Step 1 — Web App Manifest

Create `public/manifest.json` in your Next.js game:

```json
{
  "name": "My PSG1 Game",
  "short_name": "MyGame",
  "description": "My game for PSG1",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#000000",
  "orientation": "landscape",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Link it in your HTML `<head>`:

```html
<link rel="manifest" href="/manifest.json" />
```

In Next.js App Router, add to `app/layout.tsx`:

```tsx
export const metadata = {
  manifest: "/manifest.json",
};
```

---

### Step 2 — Install Bubblewrap

```bash
npm install -g @bubblewrap/cli
```

Bubblewrap is Google's official CLI tool for generating TWA Android projects.

---

### Step 3 — Initialise the TWA project

```bash
mkdir my-game-twa
cd my-game-twa
bubblewrap init --manifest=https://my-game.vercel.app/manifest.json
```

Bubblewrap fetches your manifest and asks a series of prompts:
- **Application ID** — e.g. `com.yourstudio.mygame` (Android package name, no spaces, lowercase)
- **App version** — e.g. `1` (integer, increment on each release)
- **Display mode** — choose `standalone` (matches your manifest)
- **Signing key** — Bubblewrap will generate one, or you can provide an existing keystore

It generates an `twa-manifest.json` and a Gradle Android project.

---

### Step 4 — Generate Digital Asset Links

Bubblewrap needs the SHA-256 fingerprint of your signing key to generate the
`.well-known/assetlinks.json` file. It prints it during `bubblewrap init`.

Get it at any time:

```bash
keytool -list -v -keystore ./android.keystore -alias android -storepass [your-password]
```

Look for the line: `SHA256: AA:BB:CC:...` (32 colon-separated hex pairs)

Create the file at the path `my-game/public/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.yourstudio.mygame",
    "sha256_cert_fingerprints": [
      "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99"
    ]
  }
}]
```

This file must be reachable at exactly:
`https://yourdomain.com/.well-known/assetlinks.json`

In Next.js App Router, Next.js serves `public/` files at `/`, so the file at
`public/.well-known/assetlinks.json` is served at `/.well-known/assetlinks.json` automatically.

**Verify it works before building:**

```bash
curl https://my-game.vercel.app/.well-known/assetlinks.json
# Should return your JSON. 404 = TWA will not trust the domain.
```

---

### Step 5 — Build the APK

```bash
bubblewrap build
```

This runs Gradle and produces:
- `app-release-unsigned.apk` — needs signing
- `app-release-signed.apk` — signed with the keystore from Step 3

If Bubblewrap automatically signed it, you are done. If not, sign manually:

```bash
apksigner sign \
  --ks android.keystore \
  --ks-key-alias android \
  --out app-release-signed.apk \
  app-release-unsigned.apk
```

---

### Step 6 — Verify the APK before submission

Install on any Android device or emulator:

```bash
adb install app-release-signed.apk
```

When the TWA opens:
1. The browser URL bar should **not** be visible (means assetlinks.json is valid)
2. Connect a USB gamepad or PSG1 — `navigator.getGamepads()` should return the device
3. Add `?gp` to the app's start URL temporarily to test with the overlay before switching to hardware

**Common TWA failure: URL bar shows during loading.** This always means assetlinks.json
is either unreachable, has the wrong fingerprint, or has the wrong package name. Fix the
assetlinks.json file, redeploy, wait for Vercel CDN cache to clear, then re-test.

---

### Step 7 — Submit to PlayGate

Upload the signed APK at: https://playgate.playsolana.com/

PlayGate also accepts hosted HTTPS URLs and PWA manifest submissions. If you are not
targeting an app store listing, a hosted URL is simpler. Use TWA when you specifically want
a downloadable APK with a store listing.

See [../PSG1/PLAYGATE.md](../PSG1/PLAYGATE.md) for the full submission checklist.

---

### TWA + PADSIM notes

- The `?gp` overlay works inside TWA. During development, set
  `"start_url": "/?gp"` in your manifest, build the APK, test, then revert to `"/"` for release.
- `window.location.search` is readable inside TWA Chrome Custom Tab — the SSR-safe
  `useEffect` pattern in `GameApp.tsx` works correctly.
- Real PSG1 hardware delivers gamepad events via the standard Android gamepad protocol.
  `navigator.getGamepads()[0]` returns the device. The `useGamepadPoll()` loop reads it
  identically to a desktop browser.
- PSG1 has no L2/R2 (indices 6 and 7). Ensure no game flow requires those buttons.

---

## 10. PlayGate Submission Checklist

| # | Check | How to verify |
|---|-------|---------------|
| 1 | All buttons tested | Open `?gp` overlay, press every button, confirm your game responds correctly |
| 2 | No L2/R2 required | PSG1 has no trigger buttons. Remove any flow that depends on indices 6 or 7. |
| 3 | Viewport set | `<meta name="viewport" content="width=1240, initial-scale=1">` matches PSG1 screen |
| 4 | Screenshots at 1240×1080 | Use browser DevTools device mode or the PSG1 device resolution |
| 5 | App icon ready | 512×512 PNG |
| 6 | Cover image ready | 1200×600 PNG (verify current spec at PlayGate portal) |
| 7 | Privacy policy URL active | Required for PlayGate submission |
| 8 | HTTPS live | Your game URL is HTTPS. `localhost` is not accepted. |
| 9 | No console errors | Open DevTools, play through all flows, fix any errors |
| 10 | TWA assetlinks.json valid (if APK) | `curl https://yourdomain.com/.well-known/assetlinks.json` returns 200 |

---

## 11. Testing Checklist

Use this before pushing to production. Every item can be verified with the `?gp` overlay.

### Navigation

- [ ] L1 moves focus left through `.gp-cycleable` tabs/buttons
- [ ] R1 moves focus right through `.gp-cycleable` tabs/buttons
- [ ] L1 at the first item does nothing (no wrap)
- [ ] R1 at the last item does nothing (no wrap)
- [ ] D-pad Down from header drops into content zone
- [ ] D-pad Up from top of content zone returns to header
- [ ] D-pad navigates through a grid correctly (row clustering, no diagonal)
- [ ] D-pad stops at content zone edges without throwing errors
- [ ] Right stick Y scrolls content zone continuously
- [ ] Right stick X moves D-pad focus left/right (single fire per deflection)

### Confirm / Back

- [ ] A confirms (clicks) the currently focused element
- [ ] A on a text input opens the Virtual Keyboard
- [ ] B closes an open modal/dialog
- [ ] B dispatches "back" when no modal is open
- [ ] Pressing B while a modal is opening (within 500ms) does not immediately close it

### Virtual Keyboard

- [ ] VK opens automatically when A is pressed on a text input
- [ ] VK shows numeric layout for `<input type="number">`
- [ ] D-pad navigates VK keys
- [ ] A selects a key (types the character)
- [ ] ⌫ deletes the last character
- [ ] SPACE inserts a space (QWERTY only)
- [ ] ✓ DONE submits and closes VK
- [ ] React `onChange` fires correctly after each keystroke
- [ ] VK closes and D-pad returns to normal after DONE

### Left stick / Moju cursor

- [ ] Moving the left stick shows the moju cursor sprite
- [ ] Cursor is clamped 16px from all viewport edges
- [ ] A while cursor is visible clicks the element under the cursor
- [ ] Cursor auto-hides after 3 seconds of inactivity
- [ ] Mouse click clears gamepad focus (seamless switch to pointer)

### Production

- [ ] `?gp` absent → zero overlay bytes loaded
- [ ] `?gp` absent → no `window.location.search` errors in SSR logs
- [ ] No hydration mismatch warnings in browser console

---

## 12. Troubleshooting

### "Hydration mismatch" error

**Cause:** `window.location.search` read during server render (where `window` is undefined).

**Fix:** Move the `?gp` check into `useEffect`:

```tsx
const [gpDebug, setGpDebug] = useState(false);
useEffect(() => {
  setGpDebug(new URLSearchParams(window.location.search).has("gp"));
}, []);
```

Never read `window.*` at render time in Next.js App Router components.

---

### D-pad focus escapes to browser URL bar

**Cause:** Calling `element.focus()` moves real browser focus, which the browser then routes
to the address bar when D-pad keys are pressed.

**Fix:** `setGpFocus()` in `gamepad-nav.ts` intentionally does NOT call `element.focus()`.
If you copied an older version of the file that does, remove that call. The `.gp-focus` CSS
class handles the visual highlight exclusively.

---

### Buttons fire but nothing navigates

**Cause:** Content zone not found. `spatialNav()` calls `getContentContainer()` which looks
for `.app-shell__main` by default.

**Fix:** Either add `class="app-shell__main"` to your scrollable content container, or:

```ts
import { configurePsg1 } from "@/lib/gamepad-nav";
configurePsg1({ contentZone: ".your-game-content" });
```

---

### Moju cursor image not showing

**Cause:** `/art/moju-gold-32.png` is not in your `public/art/` folder.

**Fix:** Copy the entire `apps/web/public/art/` folder from this repo into your project's
`public/art/`. The polling loop creates an `<img src="/art/moju-gold-32.png">` element at runtime.

---

### VK doesn't trigger React `onChange`

**Cause:** Using `element.value = "..."` directly without the native setter trick.

**Fix:** The VK already uses the correct pattern. If you have a custom input integration, use:

```ts
const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
setter?.call(inputEl, newValue);
inputEl.dispatchEvent(new Event("input", { bubbles: true }));
```

---

### TWA shows URL bar (not full-screen)

**Cause:** Digital Asset Links verification failed. The app package name or SHA-256
fingerprint in `assetlinks.json` does not match the APK's signing cert.

**Fix:**
1. Get the exact fingerprint: `keytool -list -v -keystore ./android.keystore -alias android`
2. Update `.well-known/assetlinks.json` with the exact colon-separated hex string
3. Redeploy and verify: `curl https://yourdomain.com/.well-known/assetlinks.json`
4. Rebuild APK with `bubblewrap build`

---

### `navigator.getGamepads()` returns all nulls

**Cause:** No button has been pressed yet. The Web Gamepad API requires a button press before
it exposes the gamepad for security reasons (browser security policy, not a bug).

**Fix:** Press any button on the physical gamepad. The polling loop handles this — `pads[0]`
being null is a normal initial state. The first button press will make it available.

---

*Last updated: March 26, 2026. Source-verified against commit b36b062.*
