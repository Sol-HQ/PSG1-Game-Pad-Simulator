# PADSIM PSG1 — Layman's Wiring Manual

> **Who this is for:** Any developer with a working web game (React, Next.js, Phaser, Unity
> WebGL, vanilla JS) deployed on Vercel with or without Supabase. You want it to run on the
> PSG1 handheld with full button support. You do not have the hardware yet.
>
> **What this gives you:** A fully wired game that responds to every PSG1 button, navigates
> with the D-pad and sticks, and can be tested in any browser before hardware arrives.
>
> **Time to complete:** 20–60 minutes depending on your game's complexity.

---

## Table of Contents

1. [What You Are Actually Doing](#1-what-you-are-actually-doing)
2. [Pre-Flight Checklist](#2-pre-flight-checklist)
3. [The 8 Files: What Each One Does](#3-the-8-files-what-each-one-does)
4. [Phase 1: Copy the Files](#phase-1-copy-the-files)
5. [Phase 2: Import the CSS](#phase-2-import-the-css)
6. [Phase 3: Mount the Controller Brain](#phase-3-mount-the-controller-brain)
7. [Phase 4: Activate the Simulator Overlay](#phase-4-activate-the-simulator-overlay)
8. [Phase 5: Label Your Navigation Elements](#phase-5-label-your-navigation-elements)
9. [Phase 6: Wire Buttons to Game Actions](#phase-6-wire-buttons-to-game-actions)
10. [Phase 7: Wire the Mapper (Non-React Engines)](#phase-7-wire-the-mapper-non-react-engines)
11. [Phase 8: Test Everything](#phase-8-test-everything)
12. [Phase 9: Deploy to Vercel](#phase-9-deploy-to-vercel)
13. [Phase 10: Submit to PlayGate](#phase-10-submit-to-playgate)
14. [Button Reference: Every Input Defined](#button-reference-every-input-defined)
15. [Keyboard Shortcuts (Simulator Overlay)](#keyboard-shortcuts-simulator-overlay)
16. [Which Adapter Do I Use?](#which-adapter-do-i-use)
17. [Framework Variations](#framework-variations)
18. [Supabase: What You Do and Don't Need to Change](#supabase-what-you-do-and-dont-need-to-change)
19. [Common Errors and Exact Fixes](#common-errors-and-exact-fixes)
20. [Agent Integration Script: Full Automated Path](#agent-integration-script-full-automated-path)

---

## 1. What You Are Actually Doing

The PSG1 is a physical handheld console. When a player holds it and presses A, the device
fires a Web Gamepad API event — the same standard browsers already support.

PADSIM PSG1 is a browser overlay that **pretends to be that physical hardware**.
Every button on the on-screen pad fires the exact same event that real hardware would fire.

Your game never knows the difference. You wire it once. It works both with the simulator in
a browser and with real hardware on device.

```
REAL HARDWARE PATH:
  PSG1 Button pressed → Web Gamepad API → useGamepadPoll() → your game code

SIMULATOR PATH:
  On-screen button clicked → useGamepadPoll() → your game code
         (identical from here →)
```

You are not adding a new input system. You are plugging your existing buttons, navigation,
and actions into an adapter layer that the PSG1 and the simulator both speak.

---

## 2. Pre-Flight Checklist

Check every item before touching a file. If any item is NO, fix it first.

| # | Check | Required version | How to verify |
|---|-------|-----------------|---------------|
| 1 | Node.js installed | v18 or higher | `node -v` in terminal |
| 2 | Package manager | npm, pnpm, or yarn | `pnpm -v` or `npm -v` |
| 3 | React version | 18 or higher | Check `package.json` → `"react"` |
| 4 | Framework | Next.js 13+ OR plain React (CRA/Vite) | Check `package.json` → `"next"` |
| 5 | TypeScript | 4.9+ (optional but strongly recommended) | `npx tsc --version` |
| 6 | Project builds without errors | — | `pnpm build` or `npm run build` |
| 7 | You know your root layout file | — | See [Framework Variations](#framework-variations) |
| 8 | You know your global CSS file | — | Usually `globals.css` or `app.css` |

> **If your project does not compile before you start, stop and fix it first.**
> Do not add PADSIM files into a broken project.

---

## 3. The 8 Files: What Each One Does

You are copying 8 things from this repository into your game. Here is what each one is and
why it must be included.

```
THIS REPO LOCATION                               PURPOSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
apps/web/src/hooks/useGamepad.ts            The controller brain. Polls the
                                            hardware 60×/sec. Also powers the
                                            simulator keyboard shortcuts.

apps/web/src/hooks/useGamepadMapper.ts      React hook wrapper for the mapper.
                                            Installs/uninstalls routing rules
                                            when components mount/unmount.

apps/web/src/lib/gamepad-nav.ts             Navigation engine. Handles D-pad
                                            spatial focus, L1/R1 tab cycling,
                                            modal detection, scroll, and the
                                            moju cursor position.

apps/web/src/lib/psg1-mapper.ts             Declarative router. Maps button
                                            actions to dom-click / custom-event
                                            / postMessage / callback adapters.

apps/web/src/components/GamepadDebugBridge.tsx
                                            The floating overlay UI. Renders the
                                            on-screen PSG1 pad, handles key
                                            shortcuts, shows the settings panel.

apps/web/src/components/VirtualKeyboard.tsx Console-style on-screen keyboard.
                                            Opens automatically when A is pressed
                                            on a text input.

apps/web/app/psg1.css                       All visual styles: focus rings, moju
                                            hover glow, overlay layout, cursor.
                                            Must be imported or nothing looks right.

apps/web/public/art/   (whole folder)       10 moju cursor sprite images (gold +
                                            teal, 5 sizes each). Required. Missing
                                            images = broken cursor.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

> **Do not modify these files.** They are designed to work as a unit. Customize
> your game's responses to them (see [Phase 6](#phase-6-wire-buttons-to-game-actions)),
> not the files themselves.

---

## Phase 1: Copy the Files

### Step 1.1 — Hooks and lib files

Create the target folders if they do not exist, then copy:

```
FROM (this repo)                                    TO (your game)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
apps/web/src/hooks/useGamepad.ts         →   src/hooks/useGamepad.ts
apps/web/src/hooks/useGamepadMapper.ts   →   src/hooks/useGamepadMapper.ts
apps/web/src/lib/gamepad-nav.ts          →   src/lib/gamepad-nav.ts
apps/web/src/lib/psg1-mapper.ts          →   src/lib/psg1-mapper.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 1.2 — Components

```
FROM (this repo)                                         TO (your game)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
apps/web/src/components/GamepadDebugBridge.tsx  →  src/components/GamepadDebugBridge.tsx
apps/web/src/components/VirtualKeyboard.tsx     →  src/components/VirtualKeyboard.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 1.3 — CSS

```
FROM (this repo)               TO (your game)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
apps/web/app/psg1.css   →   src/styles/psg1.css
                              (OR app/psg1.css — wherever globals.css lives is fine)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 1.4 — Sprite assets

Copy the entire `art/` folder. There are 10 files. All 10 are required.

```
FROM (this repo)               TO (your game)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
apps/web/public/art/   →   public/art/
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Files inside:
  moju-gold-16.png   moju-gold-24.png   moju-gold-32.png
  moju-gold-48.png   moju-gold-64.png
  moju-teal-16.png   moju-teal-24.png   moju-teal-32.png
  moju-teal-48.png   moju-teal-64.png
```

> **Verify:** open `public/art/` in your file explorer after copying.
> If any of the 10 files are missing, the cursor will be broken.

### Step 1.5 — Verify paths alias

Open your `tsconfig.json`. Find the `paths` (or `baseUrl`) section. It must map `@/*` to
your source root. Most Next.js projects already have this. Confirm it looks like this:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

If your project uses a different alias (e.g., `~/*` or no alias at all), update every
`@/hooks/...` and `@/lib/...` import in the four copied files to match your convention.

---

## Phase 2: Import the CSS

Open your global CSS file. This is usually:

| Framework | Global CSS file location |
|-----------|--------------------------|
| Next.js App Router | `app/globals.css` |
| Next.js Pages Router | `styles/globals.css` |
| Create React App | `src/index.css` |
| Vite + React | `src/index.css` or `src/App.css` |

Add this line **at the top** of that file, above all other rules:

```css
@import "./psg1.css";
```

Adjust the relative path to wherever you placed `psg1.css` relative to your globals file.

Examples:
```css
/* If psg1.css is at src/styles/psg1.css and globals is at src/index.css */
@import "./styles/psg1.css";

/* If psg1.css is right next to globals.css in the same folder */
@import "./psg1.css";
```

> **Do not skip this step.** Without the CSS the focus rings, hover glows, and overlay
> layout will be completely broken.

---

## Phase 3: Mount the Controller Brain

This is the most critical step. The polling hook (`useGamepadPoll`) must run **continuously
for the entire lifetime of your app**. This means it belongs at the very top — in the root
layout, not inside any page or game component.

### Rule: Mount it ONCE at ROOT and never unmount it

---

### 3-A: Next.js App Router (most common — `app/layout.tsx`)

The App Router root is a Server Component by default. You must add a client wrapper.

**Option A (recommended) — use the included `<GameApp>` wrapper:**

```tsx
// app/layout.tsx
import GameApp from "@/components/GameApp";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <GameApp>
          {children}
        </GameApp>
      </body>
    </html>
  );
}
```

`GameApp` is a pre-built client component in this repo that calls `useGamepadPoll()`,
mounts the overlay when `?gp` is in the URL, and handles hydration safety.
Source: `apps/web/src/components/GameApp.tsx` → copy to `src/components/GameApp.tsx`.

**Option B — create a thin client shell manually:**

```tsx
// src/components/GameClientShell.tsx  ← NEW FILE you create
"use client";
import { useEffect, useState } from "react";
import { useGamepadPoll } from "@/hooks/useGamepad";
import dynamic from "next/dynamic";

const GamepadDebugBridge = dynamic(
  () => import("./GamepadDebugBridge"),
  { ssr: false }
);
const VirtualKeyboard = dynamic(
  () => import("./VirtualKeyboard"),
  { ssr: false }
);

export function GameClientShell({ children }: { children: React.ReactNode }) {
  useGamepadPoll();  // ← controller brain starts here

  // Read ?gp AFTER mount only — prevents hydration mismatch.
  const [showPad, setShowPad] = useState(false);
  useEffect(() => {
    setShowPad(new URLSearchParams(window.location.search).has("gp"));
  }, []);

  return (
    <>
      {children}
      {showPad && <><GamepadDebugBridge /><VirtualKeyboard /></>}
    </>
  );
}
```

Then use it in your root layout:

```tsx
// app/layout.tsx
import { GameClientShell } from "@/components/GameClientShell";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <GameClientShell>
          {children}
        </GameClientShell>
      </body>
    </html>
  );
}
```

---

### 3-B: Next.js Pages Router (`pages/_app.tsx`)

`_app.tsx` is already a client file — no wrapper needed.

```tsx
// pages/_app.tsx
import type { AppProps } from "next/app";
import { useEffect, useState } from "react";
import { useGamepadPoll } from "@/hooks/useGamepad";
import dynamic from "next/dynamic";
import "../styles/globals.css";

const GamepadDebugBridge = dynamic(
  () => import("@/components/GamepadDebugBridge"),
  { ssr: false }
);
const VirtualKeyboard = dynamic(
  () => import("@/components/VirtualKeyboard"),
  { ssr: false }
);

export default function App({ Component, pageProps }: AppProps) {
  useGamepadPoll();  // ← controller brain

  const [showPad, setShowPad] = useState(false);
  useEffect(() => {
    setShowPad(new URLSearchParams(window.location.search).has("gp"));
  }, []);

  return (
    <>
      <Component {...pageProps} />
      {showPad && <><GamepadDebugBridge /><VirtualKeyboard /></>}
    </>
  );
}
```

---

### 3-C: Vite + React / Create React App (`src/main.tsx` or `src/App.tsx`)

```tsx
// src/main.tsx (or index.tsx)
import React from "react";
import ReactDOM from "react-dom/client";
import { useGamepadPoll } from "./hooks/useGamepad";
import GamepadDebugBridge from "./components/GamepadDebugBridge";
import VirtualKeyboard from "./components/VirtualKeyboard";
import App from "./App";
import "./index.css";

// Note: no dynamic import needed in Vite — no SSR to worry about.
function Root() {
  useGamepadPoll();  // ← controller brain

  const showPad = new URLSearchParams(window.location.search).has("gp");

  return (
    <>
      <App />
      {showPad && <><GamepadDebugBridge /><VirtualKeyboard /></>}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
```

> **Why `ssr: false` / no SSR in Vite?** The Web Gamepad API and `window.location` do not
> exist on a server. In Next.js we use `dynamic({ ssr: false })` to prevent server-side
> rendering of these components. In Vite there is no SSR by default, so import normally.

---

## Phase 4: Activate the Simulator Overlay

The overlay is already included in the code you wrote in Phase 3. It activates with a URL
query parameter. There is nothing else to configure.

**To show the overlay:**

```
http://localhost:3000?gp
http://localhost:3000/any-page?gp
https://your-game.vercel.app?gp
```

**To hide the overlay (production use):**

Remove `?gp` from the URL. The overlay loads zero bytes when `?gp` is absent.

> **The `?gp` flag is intentionally not protected.** It is a developer tool. It does not
> add any gameplay advantage — it only shows a controller UI. The events it fires are
> identical to what real hardware would fire anyway.

---

## Phase 5: Label Your Navigation Elements

Think of this phase as putting sticker labels on the areas of your game so the controller
knows which direction to move.

There are exactly **two things to label** in your HTML/JSX:

---

### Label 1 — Your Tab / Menu Buttons (for L1 and R1)

L1 and R1 cycle through a list of buttons in your header/nav bar. You tell the system which
buttons are cycleable by adding a CSS class.

**Before:**
```tsx
<nav>
  <button onClick={() => setView("game")}>Game</button>
  <button onClick={() => setView("shop")}>Shop</button>
  <button onClick={() => setView("leaderboard")}>Leaderboard</button>
</nav>
```

**After:**
```tsx
<nav>
  <button className="gp-cycleable" onClick={() => setView("game")}>Game</button>
  <button className="gp-cycleable" onClick={() => setView("shop")}>Shop</button>
  <button className="gp-cycleable" onClick={() => setView("leaderboard")}>Leaderboard</button>
</nav>
```

Rules for `gp-cycleable`:
- Add it to every button/tab/link in your top nav that should be reachable with shoulder buttons
- Add it to as many or as few as you like — they are picked up automatically by DOM order
- Do NOT add it to action buttons inside the game board itself — only top-level nav
- If you use a conditional className, append it: `className={`nav-tab ${active ? "active" : ""} gp-cycleable`}`

---

### Label 2 — Your Main Content Zone (for D-pad and Right Stick)

The D-pad and right stick move focus and scroll within a designated content container.
You mark that container with a CSS class.

**Before:**
```tsx
<main>
  {/* game board, cards, list, etc. */}
</main>
```

**After:**
```tsx
<main className="app-shell__main">
  {/* game board, cards, list, etc. */}
</main>
```

If your element already has a different class and you cannot rename it, call this function
once at startup instead (put it inside a `useEffect` in your root component):

```tsx
import { configurePsg1 } from "@/lib/gamepad-nav";

// In your root component, inside useEffect(() => { ... }, []):
configurePsg1({ contentZone: ".my-existing-game-class" });
```

> **Only one content zone is active at a time.** If a modal/dialog is open, D-pad
> automatically navigates within the modal and ignores the content behind it.
> This is built in — you do not configure it.

---

### Visual feedback classes (added automatically — you do not need to add these)

| Class | What it means | Applied to |
|-------|--------------|-----------|
| `.gp-focus` | Neon green ring | Element currently focused by D-pad |
| `.gp-moju-hover` | Cyan ring | Element under the left-stick cursor |

---

## Phase 6: Wire Buttons to Game Actions

This is where you define what each button actually does **in the context of your specific game**.

The system dispatches named semantic actions. Your game components subscribe to them.

### The action names

| Action name | Fired by | What it means |
|-------------|----------|---------------|
| `"confirm"` | A button | Confirm, submit, interact, click |
| `"back"` | B button | Cancel, go back, close modal |
| `"refresh"` | Y button | Refresh, reload, restart |
| `"x"` | X button | Secondary / custom use |
| `"select"` | Select button | Wallet connect / utility |
| `"start"` | Start button | Main menu / pause |
| `"l3"` | Left stick press | Reserved / custom use |
| `"r3"` | Right stick press | Secondary confirm |
| `"home"` | Home button | App menu (reserved) |

### How to subscribe in a React component

```tsx
import { useGamepadAction } from "@/hooks/useGamepad";

function GameScreen() {
  useGamepadAction((action) => {
    switch (action) {
      case "confirm":
        // What should happen when the player presses A?
        // Example: submit their move, place a piece, confirm a choice
        submitPlayerMove();
        break;

      case "back":
        // What should happen when the player presses B?
        // Example: open pause menu, go to previous screen
        openPauseMenu();
        break;

      case "refresh":
        // What should happen when the player presses Y?
        // Example: reset the board, reload match data
        resetGameState();
        break;

      case "select":
        // What should happen when the player presses Select?
        // Standard use: connect/disconnect wallet
        connectWallet();
        break;

      case "start":
        // What should happen when the player presses Start?
        // Standard use: return to main menu or title screen
        router.push("/");
        break;

      // Leave out any action you don't use — the system handles the rest.
    }
  });

  return <div className="app-shell__main">...</div>;
}
```

### Rules for `useGamepadAction`

- **You can call it in multiple components.** All listeners fire simultaneously when a button is pressed.
  Use this to have a global `back` handler AND a local one in a specific screen.
- **Define your handler outside the hook if possible** to avoid stale closures:
  ```tsx
  const handleAction = useCallback((action: GamepadAction) => {
    if (action === "confirm") doSomething();
  }, [doSomething]);
  useGamepadAction(handleAction);
  ```
- **Do not nest it inside conditionals.** React hook rules apply.
- **You do not need to un-register it.** The hook cleans itself up automatically on unmount.

---

## Phase 7: Wire the Mapper (Non-React Engines)

> **Skip this phase if your entire game is React/Next.js.** Phase 6 is all you need.
>
> **Use this phase if your game runs inside a Phaser canvas, Unity WebGL embed, or an iframe.**

The mapper translates PSG1 actions into signals that non-React code can receive.
It works alongside `useGamepadAction()` — both run at the same time.

See [Which Adapter Do I Use?](#which-adapter-do-i-use) to pick the right type.

### Option A — Inline mapping in React (callback adapter)

```tsx
// Define OUTSIDE the component so the reference is stable across renders.
// An unstable reference causes the mapper to reinstall on every render.
const GAME_MAPPING: Psg1Mapping = {
  version: "1",
  name: "My Game v1",
  actions: {
    confirm: { type: "callback",     callbackId: "handleConfirm"  },
    back:    { type: "callback",     callbackId: "handleBack"     },
    start:   { type: "dom-click",    selector:   "#pause-btn"     },
    refresh: { type: "custom-event", event:      "game:reload"    },
  },
};

function GameRoot() {
  // Register callbacks BEFORE useGamepadMapper so they exist when first action fires.
  useGamepadCallbacks({
    handleConfirm: () => submitMove(),
    handleBack:    () => router.back(),
  });

  // Install the mapping. Auto-uninstalls on component unmount.
  useGamepadMapper(GAME_MAPPING);

  return <Game />;
}
```

### Option B — JSON file (load from public folder)

Create `public/psg1.mapping.json`:

```json
{
  "version": "1",
  "name": "My Tetris Game",
  "actions": {
    "confirm":  { "type": "custom-event", "event": "tetris:rotate"  },
    "back":     { "type": "custom-event", "event": "tetris:hold"    },
    "refresh":  { "type": "dom-click",    "selector": "#restart-btn"},
    "start":    { "type": "postMessage",  "message": { "type": "PAUSE" } },
    "select":   { "type": "dom-click",    "selector": "#wallet-btn" }
  }
}
```

Load it once at app startup (put this inside a `useEffect` at your root):

```tsx
import { loadPsg1Mapping } from "@/lib/psg1-mapper";

useEffect(() => {
  loadPsg1Mapping("/psg1.mapping.json");
}, []);
```

### Option C — Phaser scene receiver

On the Phaser/game side, listen for the custom events you dispatched:

```js
// Inside your Phaser Scene's create() or init():
window.addEventListener("tetris:rotate", () => {
  this.rotatePiece();
});

window.addEventListener("tetris:hold", () => {
  this.holdPiece();
});
```

### Option D — Unity WebGL receiver

```js
// In your Unity WebGL template HTML or loader script:
window.addEventListener("game:confirm", (e) => {
  // Call Unity's SendMessage method
  unityInstance.SendMessage("GameController", "OnConfirm", "");
});
```

### Option E — PostMessage receiver (iframe)

```js
// Inside the iframe's JS:
window.addEventListener("message", (e) => {
  if (!e.data._psg1) return;   // IMPORTANT: filter by _psg1 flag
  if (e.data.type === "PAUSE") {
    togglePauseMenu();
  }
});
```

> **Security note:** Never set `targetOrigin: "*"` in a postMessage adapter unless you
> understand the cross-origin security implications. The default (`window.location.origin`)
> is always safe for same-origin games. See [`psg1-mapper.ts`](../apps/web/src/lib/psg1-mapper.ts)
> for the full security documentation.

---

## Phase 8: Test Everything

### Step 8.1 — Start the dev server

```bash
# Next.js
pnpm dev
# or
npm run dev

# Vite
pnpm dev
# or
npm run dev
```

### Step 8.2 — Open the game with the overlay

```
http://localhost:3000?gp
```

The PSG1 overlay appears in the lower-right corner of your browser.

### Step 8.3 — Work through this checklist

| What to test | How to test it | What success looks like |
|---|---|---|
| L1 cycles tabs left | Click `[` key or L1 button on overlay | Gold `.gp-cycleable` ring moves left through tabs |
| R1 cycles tabs right | Click `]` key or R1 button on overlay | Gold ring moves right through tabs |
| D-pad moves focus down | Press ↓ arrow key or D-pad down | Neon green `.gp-focus` ring moves to next focusable element |
| D-pad moves focus up | Press ↑ arrow key or D-pad up | Neon green ring moves up |
| D-pad moves focus left/right | Press ← → keys | Ring navigates a grid or row correctly |
| A confirms (clicks) | Press Enter key or A button on overlay | Currently focused element activates |
| B goes back / closes modal | Press Backspace key or B button | Modal closes OR previous screen loads |
| Y refreshes | Press Y key | Your `"refresh"` handler fires |
| Left stick shows cursor | Click the left stick area on overlay and move | Gold moju cursor appears and moves |
| Left stick A clicks at cursor | Move cursor to a button, press A / Enter | Cursor clicks that button |
| Start opens main menu | Press Space key | Your `"start"` handler fires |
| Select connects wallet | Press Tab key | Your `"select"` handler fires |
| Text input opens VK | D-pad focus onto an `<input>`, press A | Console keyboard pops up |
| VK types a character | D-pad navigates to a letter, press A | Character appears in input |
| VK submit closes keyboard | Navigate to Submit, press A | VK closes, form submits |

### Step 8.4 — Check the Live Log tab

Open the overlay settings panel (the gear icon). Navigate to the **Live Log** tab.
Every button press appears here with the action name. Use this to confirm your mapping
is firing correctly before touching any game code.

### Step 8.5 — Test production build

```bash
pnpm build
# Expected: exits 0, no errors
```

If the build fails, see [Common Errors and Exact Fixes](#common-errors-and-exact-fixes).

---

## Phase 9: Deploy to Vercel

No Vercel configuration changes are needed for PADSIM PSG1.

1. Push your code to GitHub (main branch or a PR branch)
2. Vercel auto-deploys on every push
3. Test your Vercel preview URL with `?gp`:
   ```
   https://your-game-ab1cd2ef3.vercel.app?gp
   ```
4. Verify the overlay loads and all buttons work on the preview deployment

> **The `?gp` overlay is not restricted to localhost.** It works on any domain — localhost,
> Vercel preview, or production. This is intentional so you can test production deployments
> before PlayGate submission.

---

## Phase 10: Submit to PlayGate

PlayGate is Play Solana's official game publishing portal: https://playgate.playsolana.com/

Reference: [`PSG1/PLAYGATE.md`](../PSG1/PLAYGATE.md)

### Pre-submission checklist

| # | Item | Details |
|---|------|---------|
| 1 | All buttons tested | Use PADSIM at your deployed URL. No untested buttons. |
| 2 | No L2/R2 required | PSG1 has no trigger buttons. If your game requires them, rebuild those flows. |
| 3 | Viewport set | `<meta name="viewport" content="width=1240, initial-scale=1">` for PSG1's screen. |
| 4 | HTTPS URL | PlayGate requires your game to be served over HTTPS. Vercel provides this. |
| 5 | App icon | 512×512 PNG |
| 6 | Cover image | min 1200×600. Verify exact requirements at the PlayGate portal. |
| 7 | Screenshots | Captured at 1240×1080. Use your browser's device emulator set to PSG1 dimensions. |
| 8 | Privacy policy | A URL to your privacy policy. Required for all submissions. |
| 9 | Game description | Title + short (1-2 sentence) + long (paragraph) description ready. |
| 10 | Format chosen | Web URL, PWA, or TWA/APK. Web URL is the simplest starting point. |

---

## Button Reference: Every Input Defined

> **Note on index vs label:** The Web Gamepad API numbers buttons by physical position, not
> by label. PSG1 button index 0 is the bottom face button (labeled B on PSG1), not A.
> This is correct behavior — it matches the physical device. See
> [`PSG1/CONTROLLER_MAP.md`](../PSG1/CONTROLLER_MAP.md) for the full technical explanation.

| PSG1 Label | Physical Position | Gamepad Index | Semantic Action | Keyboard Shortcut |
|------------|------------------|--------------|----------------|------------------|
| **A** | Right face | 1 | `"confirm"` — click / open VK | Enter |
| **B** | Bottom face | 0 | `"back"` — cancel / close modal | Backspace |
| **Y** | Left face | 2 | `"refresh"` | Y |
| **X** | Top face | 3 | `"x"` (reserved / custom) | X |
| **L1** | Left shoulder | 4 | Cycle header left | `[` |
| **R1** | Right shoulder | 5 | Cycle header right | `]` |
| L2 | — | 6 | *(not present on PSG1)* | — |
| R2 | — | 7 | *(not present on PSG1)* | — |
| **Select** | Select | 8 | `"select"` | Tab |
| **Start** | Start | 9 | `"start"` | Space |
| **L3** | Left stick press | 10 | `"l3"` (reserved) | Q |
| **R3** | Right stick press | 11 | `"r3"` (secondary confirm) | E |
| **D-pad ↑** | D-pad | 12 | Navigate up | ↑ |
| **D-pad ↓** | D-pad | 13 | Navigate down | ↓ |
| **D-pad ←** | D-pad | 14 | Navigate left | ← |
| **D-pad →** | D-pad | 15 | Navigate right | → |
| Home | Home | 16 | `"home"` (reserved) | H |
| Left stick X | Axis 0 | — | Moju cursor horizontal | — |
| Left stick Y | Axis 1 | — | Moju cursor vertical | — |
| Right stick X | Axis 2 | — | Spatial nav left/right | — |
| Right stick Y | Axis 3 | — | Continuous scroll up/down | — |

---

## Keyboard Shortcuts (Simulator Overlay)

These work whenever the PADSIM overlay is open (`?gp` in URL). They let you
test without clicking the on-screen buttons.

| Keyboard Key | PSG1 Button Simulated |
|---|---|
| ↑ ↓ ← → (arrow keys) | D-pad directions |
| Enter | A (confirm) |
| Backspace | B (back) |
| Y | Y (refresh) |
| X | X (secondary) |
| `[` (left bracket) | L1 (cycle header left) |
| `]` (right bracket) | R1 (cycle header right) |
| Tab | Select |
| Space | Start |
| Q | L3 |
| E | R3 |
| H | Home |

---

## Which Adapter Do I Use?

```
YOUR GAME SETUP                              USE THIS ADAPTER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
React / Next.js only                    →   callback
  No iframes, no canvas, just React.         Register JS functions by name.
                                             Full access to React state + router.

Phaser, PixiJS, vanilla JS              →   custom-event
  Canvas embedded in your page.             window.dispatchEvent(CustomEvent)
  Game logic lives outside React.            Phaser scene listens with addEventListener.

Unity WebGL                             →   custom-event
  UnityInstance is on the page.             window.dispatchEvent(CustomEvent)
                                             Unity side: SendMessage via window listener.

iframe embed (cross-origin)             →   postMessage
  Game runs in an <iframe> from             window.postMessage(), filter by e.data._psg1
  a different origin.                        NEVER use targetOrigin:"*"

HTML button already exists in DOM       →   dom-click
  You don't want to touch game code.         Pass CSS selector, system clicks it.
  Works with any framework.                  Use as a quick "glue" approach.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**When in doubt, start with `dom-click`.** It requires zero game code changes.
Once you have tested the button routing, migrate to `callback` for cleaner integration.

---

## Framework Variations

| Framework | Root file | Client boundary | Notes |
|-----------|-----------|----------------|-------|
| Next.js 13+ App Router | `app/layout.tsx` | Must add a `"use client"` child wrapper | Use `<GameApp>` or the `GameClientShell` pattern from [Phase 3-A](#3-a-nextjs-app-router-most-common--applayouttsx) — see [Phase 3](#phase-3-mount-the-controller-brain) |
| Next.js 12/13 Pages Router | `pages/_app.tsx` | Already a client file | No wrapper needed — call hook directly |
| Create React App | `src/index.tsx` or `src/App.tsx` | Already a client file | No wrapper needed. No SSR — import directly |
| Vite + React | `src/main.tsx` | Already a client file | No wrapper needed. No dynamic import special handling |
| Remix | `app/root.tsx` | Add `"use client"` or use a client layout | Same client-shell pattern as App Router |
| Gatsby | `gatsby-browser.js` wrap in `wrapRootElement` | Already client | Import hooks directly |

---

## Supabase: What You Do and Don't Need to Change

**Short answer: nothing in your Supabase project needs to change.**

PADSIM PSG1 is a front-end-only input layer. When the player presses A and your PSG1 handler
calls `submitMove()`, that function runs your existing Supabase client code exactly as it
always has. The PSG1 layer does not intercept, proxy, or modify any network requests.

| Question | Answer |
|----------|--------|
| Do I change my Supabase schema? | No |
| Do I change my API routes? | No |
| Do I change my Row Level Security policies? | No |
| Do I change any Supabase client calls? | No |
| Do I add new environment variables? | No |
| Can Supabase real-time still work? | Yes — unaffected |
| Can I use Supabase Auth with wallet sign-in via `select`? | Yes — wire `connectWallet()` to `"select"` in Phase 6 |

The only Supabase-adjacent wiring is the `"select"` action. If your wallet connect call
triggers Supabase Auth, wire it:

```tsx
case "select":
  await signInWithWallet();  // your existing Supabase + wallet auth call
  break;
```

---

## Common Errors and Exact Fixes

### Error: `Cannot find module '@/hooks/useGamepad'`

**Cause:** Your tsconfig.json does not have a paths alias for `@/*`, or the file was not
copied to the correct location.

**Fix:**
1. Verify the file exists at `src/hooks/useGamepad.ts` in your project
2. Verify `tsconfig.json` → `"paths": { "@/*": ["./src/*"] }`
3. Run `npx tsc --noEmit` — the error should cite the exact missing path

---

### Error: `Hydration failed because the initial UI does not match`

**Cause:** You are reading `window.location.search` during render (at module level or
directly in JSX). This runs on the server where `window` does not exist, producing a
different result than on the client.

**Fix:** Move the `?gp` check inside a `useEffect`:

```tsx
// WRONG — runs during SSR:
const showPad = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("gp");

// CORRECT — runs only after mount:
const [showPad, setShowPad] = useState(false);
useEffect(() => {
  setShowPad(new URLSearchParams(window.location.search).has("gp"));
}, []);
```

---

### Error: `useGamepadPoll called in a Server Component`

**Cause:** You added `useGamepadPoll()` directly in a file without `"use client"` in a
Next.js App Router project.

**Fix:** Add `"use client"` as the very first line of the file. Or use the `GameClientShell`
wrapper pattern in [Phase 3](#phase-3-mount-the-controller-brain).

---

### Error: `Module not found: Can't resolve './psg1.css'`

**Cause:** The `@import` path in your globals CSS is wrong.

**Fix:** Make the path relative to the location of your globals file. Run your dev server
and check the exact error — it shows the resolved path that failed.

---

### Error: Cursor sprite shows broken image (404)

**Cause:** The `public/art/` folder is missing or incomplete.

**Fix:** Copy all 10 files from `apps/web/public/art/` to `public/art/` in your project.
Verify by opening `http://localhost:3000/art/moju-gold-32.png` — it should display.

---

### Error: D-pad focus escapes to browser address bar

**Cause:** Code is calling `el.focus()` somewhere when setting gamepad focus.
The native browser focus chain runs keyboard navigation to the URL bar.

**Fix:** Do not call `el.focus()` in any gamepad focus handler. PADSIM uses CSS-only focus
(`.gp-focus` class) and explicitly calls `.blur()` on the active element.
The fix is already in `gamepad-nav.ts` — make sure you copied the latest version.

---

### Error: Mapper re-installs on every render

**Cause:** The `Psg1Mapping` object is defined inside the component, creating a new
object reference every render. `useGamepadMapper` detects the changed reference and reinstalls.

**Fix:** Define the mapping OUTSIDE the component (module level) or wrap it in `useMemo`:

```tsx
// WRONG — new object every render:
function MyGame() {
  const mapping = { version: "1", actions: { ... } }; // re-created every render
  useGamepadMapper(mapping);
}

// CORRECT — stable reference:
const MAPPING: Psg1Mapping = { version: "1", actions: { ... } }; // defined once at module level
function MyGame() {
  useGamepadMapper(MAPPING);
}
```

---

## Agent Integration Script: Full Automated Path

> **For AI coding agents (GitHub Copilot, Claude, GPT-4o, Cursor, etc.):**
>
> The steps below are exact, ordered prompts you can give to a code agent to wire PADSIM
> into a game repo automatically. Each step is self-contained. Run them in order.
> Do not run any step until the previous step has completed without error.

---

### AGENT STEP 1 — Recon (read-only, no changes)

```
Read the following files and report back before making any changes:

1. package.json at repo root and any app-level package.json
2. The root entry or layout file — check for:
   - app/layout.tsx  (Next.js App Router)
   - pages/_app.tsx  (Next.js Pages Router)
   - src/main.tsx or src/index.tsx  (CRA / Vite)
3. The global CSS file — check for:
   - app/globals.css
   - styles/globals.css
   - src/index.css
4. Any component with "Nav", "Header", "Tabs", "Menu" in the filename
5. Any component with "main", "shell", "board", "screen" in the filename
6. tsconfig.json — extract the "paths" / "baseUrl" section
7. Any existing keyboard event handlers or gamepad references

Report back:
  - Framework: Next.js App Router / Pages Router / CRA / Vite / Other
  - Root file: exact path
  - Root file is Server Component (no "use client"): YES / NO
  - Global CSS file: exact path
  - Nav elements found: filename, component name, class names of nav items
  - Main content container found: filename, component name, element type, classNames
  - TypeScript path alias for @/*: YES (value) / NO
  - Any existing gamepad/keyboard code: YES (describe) / NO
  - Any Phaser, Unity WebGL, or iframe embeds: YES (describe) / NO
```

---

### AGENT STEP 2 — Copy SimPad source files

```
From the repository Sol-HQ/PSG1-Game-Pad-Simulator (branch: main),
fetch and create the following files in the target game repo.
Do NOT modify any file content. Copy verbatim.

File copies:
  SOURCE: apps/web/src/hooks/useGamepad.ts
  DEST:   src/hooks/useGamepad.ts

  SOURCE: apps/web/src/hooks/useGamepadMapper.ts
  DEST:   src/hooks/useGamepadMapper.ts

  SOURCE: apps/web/src/lib/gamepad-nav.ts
  DEST:   src/lib/gamepad-nav.ts

  SOURCE: apps/web/src/lib/psg1-mapper.ts
  DEST:   src/lib/psg1-mapper.ts

  SOURCE: apps/web/src/components/GamepadDebugBridge.tsx
  DEST:   src/components/GamepadDebugBridge.tsx

  SOURCE: apps/web/src/components/VirtualKeyboard.tsx
  DEST:   src/components/VirtualKeyboard.tsx

  SOURCE: apps/web/src/components/GameApp.tsx
  DEST:   src/components/GameApp.tsx

  SOURCE: apps/web/app/psg1.css
  DEST:   src/styles/psg1.css   (adjust if project uses a different styles folder)

  SOURCE: apps/web/public/art/moju-gold-16.png   DEST: public/art/moju-gold-16.png
  SOURCE: apps/web/public/art/moju-gold-24.png   DEST: public/art/moju-gold-24.png
  SOURCE: apps/web/public/art/moju-gold-32.png   DEST: public/art/moju-gold-32.png
  SOURCE: apps/web/public/art/moju-gold-48.png   DEST: public/art/moju-gold-48.png
  SOURCE: apps/web/public/art/moju-gold-64.png   DEST: public/art/moju-gold-64.png
  SOURCE: apps/web/public/art/moju-teal-16.png   DEST: public/art/moju-teal-16.png
  SOURCE: apps/web/public/art/moju-teal-24.png   DEST: public/art/moju-teal-24.png
  SOURCE: apps/web/public/art/moju-teal-32.png   DEST: public/art/moju-teal-32.png
  SOURCE: apps/web/public/art/moju-teal-48.png   DEST: public/art/moju-teal-48.png
  SOURCE: apps/web/public/art/moju-teal-64.png   DEST: public/art/moju-teal-64.png

After copying: run `npx tsc --noEmit` and report the result.
If there are path alias errors, fix the @/* import paths to match the tsconfig
discovered in Step 1.
```

---

### AGENT STEP 3 — Wire CSS import

```
Open the global CSS file found in Step 1.
Add the following line as the FIRST line of the file (before all other rules):

  @import "./psg1.css";

Adjust the relative path IF psg1.css was placed in a subfolder:
  - If psg1.css is at src/styles/psg1.css and globals is at src/index.css → @import "./styles/psg1.css";
  - If both are in the same folder → @import "./psg1.css";

Do not duplicate if the import already exists.
Report: exact line added and file modified.
```

---

### AGENT STEP 4 — Mount polling hook at root

```
Using the root file and framework identified in Step 1:

IF framework is "Next.js App Router" AND root file has NO "use client":
  Wrap {children} in the existing root layout with <GameApp> from @/components/GameApp.
  Add the import: import GameApp from "@/components/GameApp";
  The root layout file itself does not need "use client".

  Result should be:
    export default function RootLayout({ children }) {
      return <html><body><GameApp>{children}</GameApp></body></html>;
    }

IF framework is "Next.js Pages Router" (_app.tsx):
  Add "use client" directive if not present (for Next.js 13 Pages Router).
  Add: import { useGamepadPoll } from "@/hooks/useGamepad";
  Add: useGamepadPoll(); as the first hook call in the default export function.

IF framework is "CRA" or "Vite" (src/main.tsx or src/index.tsx):
  Create a Root wrapper component in the same file.
  Add: import { useGamepadPoll } from "./hooks/useGamepad";
  Call: useGamepadPoll(); inside Root.
  Wrap <App /> with <Root>.

Rules:
  - useGamepadPoll() must be called inside a component that is ALWAYS mounted.
  - Never call useGamepadPoll() inside a page, route, or game screen component.
  - Never call it conditionally.

Report: exact file modified, exact lines changed, line numbers.
```

---

### AGENT STEP 5 — Mount simulator overlay (hydration-safe)

```
IF using GameApp wrapper from Step 4:
  The overlay is already handled inside GameApp. No additional changes needed.
  Skip to Step 6.

IF using manual hook call (Pages Router / CRA / Vite):
  In the same root file from Step 4, add the overlay with hydration-safe ?gp detection.

  For Next.js Pages Router, add:
    import { useEffect, useState } from "react";
    import dynamic from "next/dynamic";

    const GamepadDebugBridge = dynamic(
      () => import("@/components/GamepadDebugBridge"),
      { ssr: false }
    );
    const VirtualKeyboard = dynamic(
      () => import("@/components/VirtualKeyboard"),
      { ssr: false }
    );

    // Inside the component function:
    const [showPad, setShowPad] = useState(false);
    useEffect(() => {
      setShowPad(new URLSearchParams(window.location.search).has("gp"));
    }, []);

    // In JSX:
    {showPad && <><GamepadDebugBridge /><VirtualKeyboard /></>}

  For CRA / Vite (no SSR): import directly, no dynamic() needed.
    const showPad = new URLSearchParams(window.location.search).has("gp");

CRITICAL: Do NOT read window.location.search at module level or during render.
It must be inside useEffect to avoid SSR hydration errors.

Report: exact changes made with line numbers.
```

---

### AGENT STEP 6 — Apply CSS class labels to navigation

```
Using the nav component(s) found in Step 1:

Task A — gp-cycleable:
  Find every button, link, or tab in the top navigation bar that a player
  would want to reach with L1/R1 shoulder buttons.
  Add "gp-cycleable" to the className of each one.
  Preserve all existing className values. Use template literals if needed:
    className={`existing-class ${isActive ? "active" : ""} gp-cycleable`}
  Do NOT add gp-cycleable to action buttons, form inputs, or game board elements.
  Only top-level nav/tab/header items.

Task B — app-shell__main:
  Find the primary scrollable content container from Step 1.
  Add "app-shell__main" to its className.
  If the element already has a well-known class that cannot be renamed:
    Do NOT add app-shell__main to the element.
    Instead, add this call inside a useEffect in the root client component:
      import { configurePsg1 } from "@/lib/gamepad-nav";
      configurePsg1({ contentZone: ".the-existing-class" });

Report: list of every element modified, with before/after className values.
```

---

### AGENT STEP 7 — Wire semantic actions

```
Scan the entire game codebase for:

  Confirm-type actions:
    - onClick handlers that submit, confirm, accept, join, buy, place, start-game
    - The component(s) where these live

  Back-type actions:
    - onClick handlers that cancel, dismiss, close, go back, exit
    - router.back() calls

  Refresh-type actions:
    - onClick handlers that reload, retry, reset, refresh
    - calls to refetch/re-query

  Wallet-type actions:
    - Any wallet connect / disconnect / sign-in call

  Home-type actions:
    - Navigation to root ("/") or home screen

For each primary game screen component found, add:
  import { useGamepadAction } from "@/hooks/useGamepad";

  useGamepadAction((action) => {
    switch (action) {
      case "confirm":  [call the confirm handler found above]; break;
      case "back":     [call the back handler found above];    break;
      case "refresh":  [call the refresh handler found above]; break;
      case "select":   [call the wallet connect found above];  break;
      case "start":    [call the home navigation found above]; break;
    }
  });

Rules:
  - Only wire actions for which a clear handler exists.
  - Do not wire "x", "l3", "r3", "home" unless an obvious use exists.
  - Do not wire actions to handlers that trigger wallet signing or
    irreversible blockchain transactions — those should remain click-only.

Report: list of components modified and which actions were wired in each.
```

---

### AGENT STEP 8 — Mapper for non-React engines (conditional)

```
Only run this step IF Step 1 found a Phaser canvas, Unity WebGL embed, or iframe.

Otherwise: skip to Step 9.

If non-React engine found:
  1. Create public/psg1.mapping.json with this structure:
     {
       "version": "1",
       "name": "[GameName] PSG1 Mapping",
       "actions": {
         "confirm":  { "type": "custom-event", "event": "game:confirm" },
         "back":     { "type": "custom-event", "event": "game:back"    },
         "refresh":  { "type": "custom-event", "event": "game:restart" },
         "start":    { "type": "custom-event", "event": "game:pause"   }
       }
     }
  2. In the root client component, add:
       import { loadPsg1Mapping } from "@/lib/psg1-mapper";
       useEffect(() => { loadPsg1Mapping("/psg1.mapping.json"); }, []);
  3. Report which engine was found and what event names were used.

The Phaser/Unity side must listen with:
  window.addEventListener("game:confirm", () => { /* game action */ });
```

---

### AGENT STEP 9 — TypeScript verification

```
Run: npx tsc --noEmit

Expected result: exit code 0, zero errors, zero warnings.

If errors are present, fix them in this priority order:
  1. "Cannot find module" errors → check @/* alias and file existence
  2. "use client" / Server Component errors → add client wrapper
  3. Type errors in new useGamepadAction handlers → add GamepadAction import
     from "@/hooks/useGamepad"
  4. Any other errors → fix without modifying the copied PADSIM files

Re-run npx tsc --noEmit after each fix until exit code is 0.
Report final result: exit code + any remaining warnings.
```

---

### AGENT STEP 10 — Smoke test and commit

```
1. Start dev server:
     pnpm dev   (or npm run dev)

2. Open in browser:
     http://localhost:3000?gp   (adjust port if different)

3. Verify these 5 things visually (report pass/fail for each):
     a. SimPad overlay appears in the browser corner
     b. Pressing [ or ] cycles the gp-cycleable elements (gold ring moves)
     c. Pressing arrow keys moves the green gp-focus ring through content
     d. Pressing Enter activates the focused element
     e. Pressing Backspace triggers the back/cancel behavior

4. Run production build:
     pnpm build   (or npm run build)
   Expected: exit 0

5. If all checks pass, create a commit:
     git add -A
     git commit -m "feat: PSG1 PADSIM v1 integration — full gamepad wiring"
     git push

6. Report:
     - Which of the 5 visual checks passed / failed
     - Build result (exit code)
     - Commit hash if pushed
     - Any manual follow-up items left for the developer
```

---

## Cross-Reference Index

| Topic | File |
|-------|------|
| Button physical layout | [`PSG1/CONTROLLER_MAP.md`](../PSG1/CONTROLLER_MAP.md) |
| PlayGate submission checklist | [`PSG1/PLAYGATE.md`](../PSG1/PLAYGATE.md) |
| Technical integration reference | [`docs/INTEGRATE.md`](./INTEGRATE.md) |
| What PSG1 is / project origin | [`docs/PSG1_ORIGIN.md`](./PSG1_ORIGIN.md) |
| Controller brain source | [`apps/web/src/hooks/useGamepad.ts`](../apps/web/src/hooks/useGamepad.ts) |
| Navigation engine source | [`apps/web/src/lib/gamepad-nav.ts`](../apps/web/src/lib/gamepad-nav.ts) |
| Mapper source + adapter types | [`apps/web/src/lib/psg1-mapper.ts`](../apps/web/src/lib/psg1-mapper.ts) |
| Mapper React hooks | [`apps/web/src/hooks/useGamepadMapper.ts`](../apps/web/src/hooks/useGamepadMapper.ts) |
| All visual styles | [`apps/web/app/psg1.css`](../apps/web/app/psg1.css) |
| Pre-built root wrapper | [`apps/web/src/components/GameApp.tsx`](../apps/web/src/components/GameApp.tsx) |
| Overlay component | [`apps/web/src/components/GamepadDebugBridge.tsx`](../apps/web/src/components/GamepadDebugBridge.tsx) |
| Virtual keyboard component | [`apps/web/src/components/VirtualKeyboard.tsx`](../apps/web/src/components/VirtualKeyboard.tsx) |
| Sample mapping JSON | [`apps/web/public/psg1.mapping.sample.json`](../apps/web/public/psg1.mapping.sample.json) |
| GitHub repository | https://github.com/Sol-HQ/PSG1-Game-Pad-Simulator |
| PlaySolana developer docs | https://developers.playsolana.com/ |
| PlayGate portal | https://playgate.playsolana.com/ |
