# PSG1 GamePad Simulator — Origin, Architecture & Agent Pickup Guide

> **For agents:** This document contains everything you need to understand what this project is,
> where it came from, why every design decision was made, and what your next steps are.
> Read it fully before making any changes.

---

## 1. What Is PSG1?

**PSG1** stands for **PlaySolana Gamepad 1** — a physical Bluetooth/USB gamepad controller
produced by **I.O.** (iozone.dev), designed specifically for Solana gaming on Android.

The PSG1 is not a generic controller. Key physical facts:

- **No L2/R2 triggers** — only L1/R1 shoulder buttons
- **Face buttons are physically re-positioned** vs Xbox/PlayStation convention  
  (A is on the right face = Gamepad API button index **1**, B is on the bottom face = index **0**)
- **Two analog sticks** — left stick used as virtual pointer, right stick for scroll/nav
- **D-pad** — standard 4-direction
- **Select / Start / Home** buttons present
- **Multi-touch screen on device** — gamepad is additive, does not replace touch
- **Plugs into Solana mobile dApps** via the standard Web Gamepad API (`navigator.getGamepads()`)
  — Chrome's Android WebView supports this natively, no plugins needed

The PSG1 was designed to plug into **Solana Seeker** (Solana's first native Android gaming phone)
via the [Seeker device companion programs](https://solanamobile.com/seeker) and through
[Solana dApp Store](https://dappstore.app) distributed games.

---

## 2. Why This Simulator Exists

### The Problem

When building [R.P.S. v2](https://github.com/Sol-HQ/R.P.S.v.2) — a Solana on-chain Rock/Paper/Scissors
game — we needed full PSG1 gamepad support **before any physical hardware was available**.

Hardware approval timelines on Seeker were unknown. We couldn't stop development and wait.
We needed to:
1. Wire up all gamepad navigation inside the active game
2. Test every button and stick behavior before a PSG1 was in our hands
3. Let future devs who don't have the hardware yet still build PSG1-ready games

### The Solution

We built a **browser overlay simulator** — a floating on-screen PSG1 controller UI —
that fires the exact same events as real hardware. Add `?gp` to any URL, and the controller
appears. Every button and stick on the overlay calls the exact same code path that real
hardware would trigger through the Gamepad API.

Then we extracted the entire simulator out of R.P.S. v2 into this standalone repo,
so any Solana game dev can drop it into their project without taking RPS with them.

---

## 3. Where the Code Came From

| File | Born In | Extracted To |
|------|---------|--------------|
| `useGamepad.ts` | `R.P.S.v.2/apps/web/src/hooks/` | `PSG1-Game-Pad-Simulator/apps/web/src/hooks/` |
| `gamepad-nav.ts` | `R.P.S.v.2/apps/web/src/lib/` | `PSG1-Game-Pad-Simulator/apps/web/src/lib/` — **enhanced with `configurePsg1()`** |
| `GamepadDebugBridge.tsx` | `R.P.S.v.2/apps/web/src/components/` | `PSG1-Game-Pad-Simulator/apps/web/src/components/` — uses `<Image>` |
| `VirtualKeyboard.tsx` | `R.P.S.v.2/apps/web/src/components/` | `PSG1-Game-Pad-Simulator/apps/web/src/components/` — identical |
| `psg1.css` | RPS `globals.css` (extracted) | `packages/styles/psg1.css` + `apps/web/app/psg1.css` |
| mojuju art assets | `R.P.S.v.2/public/art/` | `apps/web/public/art/` |

### Key Enhancement Made During Extraction

The original `gamepad-nav.ts` had a **hardcoded** content zone selector: `.app-shell__main`.
During extraction we added the `configurePsg1()` API so devs can point the navigator at their
own scrollable container:

```ts
import { configurePsg1 } from "@/lib/gamepad-nav";
configurePsg1({ contentZone: ".my-game-main" }); // Call once at app boot
```

This was the single biggest portability improvement over the RPS original.

---

## 4. Architecture Deep Dive

### 4.1 The Event Bus

```
Hardware gamepad  ─────────────────────────────────────────────────┐
Simulator overlay ──► pressButton(id) ─► gamepadBus.dispatchEvent  │
Keyboard bridge   ─────────────────────────────────────────────────┘
                                              │
                                              ▼
                                   "gamepad-action" CustomEvent
                                   detail: GamepadAction string
                                              │
                                    useGamepadAction() listeners
                                    in any component
```

The `gamepadBus` is an `EventTarget` singleton (one per `window`). It acts as the decoupled
message channel between input sources (hardware, simulator, keyboard) and consumers (your components).

**Why `EventTarget` instead of `useContext` or Zustand?**
- Zero React dependency — works in Vanilla JS too
- No re-renders on button press (subscribing components handle their own state)
- Survives across React tree remounts (singleton at window level)

### 4.2 Zone Architecture

Navigation is split into two zones with different controllers:

```
┌─────────────────────────────────────────────────────┐
│  HEADER ZONE  — .gp-cycleable items                 │
│  L1 / R1 cycles left/right within this zone         │
│  D-pad Up from content: jump into header            │
│  D-pad Down from header: drop into content          │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│  CONTENT ZONE  — .app-shell__main (configurable)     │
│  D-pad: spatial grid navigation                     │
│  R-stick Y: continuous scroll                       │
│  R-stick X: spatial nav left/right (edge-detected)  │
│  L-stick: moju pointer mode                         │
└─────────────────────────────────────────────────────┘
```

**Your integration checklist:**
- Add `.gp-cycleable` to every header/tab nav button
- Wrap your scrollable content in an element matching `contentZone` selector
- Call `configurePsg1({ contentZone: ".my-selector" })` if not using `.app-shell__main`

### 4.3 Spatial Navigation Algorithm (`spatialNav`)

This is the trickiest part. Standard tab navigation is DOM-order and useless for gamepad.
We use strict **grid-based spatial nav**:

1. Collect all visible focusable elements in the content zone
2. Measure each element's Y-center (getBoundingClientRect)
3. Cluster items into **rows** — items within 24px Y are the same row
4. Sort rows top→bottom, items left→right within each row
5. D-pad Up/Down: jump between rows, snap to nearest X in target row
6. D-pad Left/Right: move within the current row only
7. **Zero diagonal drift** — strictly horizontal or vertical, never combined

This produces console-quality grid navigation on any responsive DOM layout.

### 4.4 Focus Ring (Critical Bug Fix)

Normal focus management calls `el.focus()`. **We do NOT do this.**

`el.focus()` causes the browser to move DOM focus to the element. On mobile Chrome / WebView,
this makes D-pad presses subsequently move **the browser's own focus context** — which can
escape to the browser URL bar or cause tab-switching in the host WebView.

**Our solution:** CSS-only focus ring using a `.gp-focus` class. `setGpFocus()` adds the
class and calls `document.activeElement.blur()` to ensure no DOM element holds real focus.
The visual ring is 100% CSS (see `psg1.css`), and the D-pad always moves `.gp-focus`, never
real DOM focus.

```ts
// ✅ Correct — CSS class only, no native focus
export function setGpFocus(el: HTMLElement) {
  clearGpFocus();
  el.classList.add("gp-focus");
  document.activeElement?.blur?.();
  el.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

// ❌ NEVER do this for gamepad navigation:
// el.focus();
```

### 4.5 Moju Pointer (Left Stick)

The left stick moves a floating animated cursor sprite (the "moju" character — gold/teal sprites
at 5 sizes in `public/art/`). When the cursor is visible, pressing A clicks the element under it.

**Critical: top-layer cursor reparenting.**
When a `<dialog>` is shown via `dialog.showModal()`, the browser renders it in the
[CSS top layer](https://developer.mozilla.org/docs/Glossary/Top_layer) — above ALL z-index
values in normal flow. The moju cursor element (fixed-position in `document.body`) becomes
invisible behind the dialog.

**Fix:** Every animation frame, check if a `dialog[open]` exists. If so, `appendChild` the
cursor element inside the dialog. This reparents it into the top layer.

```ts
// Every rAF frame:
const openDialog = document.querySelector<HTMLDialogElement>("dialog[open]");
if (openDialog && cursor.parentElement !== openDialog) {
  openDialog.appendChild(cursor);
} else if (!openDialog && cursor.parentElement !== document.body) {
  document.body.appendChild(cursor);
}
```

### 4.6 Simulator Portaling (Same Problem, Other Side)

The simulator overlay (`GamepadDebugBridge`) uses the same portal trick:
When a `<dialog>` opens, a MutationObserver detects it and React's `createPortal()` renders
the simulator into a `.gp-sim-portal` div appended inside the dialog. Without this, clicking
simulator buttons is blocked by the dialog's `inert` attribute on everything outside it.

### 4.7 Dialog Grace Period

When a modal opens, immediately pressing B could close it on the same frame it was triggered.
We track `dialogOpenAt = performance.now()` and only allow B/Y to close modals after
`DIALOG_GRACE_MS = 500ms`. This prevents accidental dismiss.

### 4.8 Virtual Keyboard

When A is pressed on a text input (detected by tag name + input type), the hardware/simulator
routes to `openVirtualKeyboard(el)` instead of clicking. A console-style QWERTY or numpad
overlay appears. All D-pad input is intercepted by the VK while it's open.

**React controlled input trick:** React validates `input.value` internally using Object properties.
To programmatically set a controlled input's value without React ignoring it:
```ts
const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
setter?.call(el, newValue);
el.dispatchEvent(new Event("input", { bubbles: true }));
```
This forces React's synthetic event system to see the change.

### 4.9 Cancel-Button Safety

The B button tries to find a cancel/back/close button in context. The search is deliberately
**scoped** — it never searches `document.body` globally. When a modal is open, it searches
only within the modal. When no modal, only within the nearest parent section/form of the
focused element. This prevents B accidentally clicking unrelated "Cancel Transaction" buttons
elsewhere on the screen.

---

## 5. The PSG1 Button Mapping (Non-Standard — Read This)

| Gamepad API Index | Physical Button | PSG1 Action |
|-------------------|-----------------|-------------|
| **0** | **B** (bottom face) | **Cancel / Back** |
| **1** | **A** (right face) | **Confirm / Click** |
| 2 | Y (left face) | Refresh |
| 3 | X (top face) | Reserved |
| 4 | L1 shoulder | Cycle header left |
| 5 | R1 shoulder | Cycle header right |
| 6–7 | — | Not present (no L2/R2) |
| 8 | Select | "select" action |
| 9 | Start | "start" action |
| 10 | L3 | "l3" action (reserved) |
| 11 | R3 | Secondary confirm |
| 12–15 | D-pad ↑↓←→ | Spatial navigation |
| 16 | Home | "home" action (reserved) |

**Xbox/PlayStation comparison:** On Xbox, button 0 = A (confirm). On PSG1, button 0 = B (cancel).
If you're testing with an Xbox controller, the A and B actions will be reversed from what you expect.
The code handles this correctly by mapping by button INDEX, not by letter label.

---

## 6. Keyboard Shortcuts (Simulator Bridge)

| Key | Simulates |
|-----|-----------|
| ← ↑ → ↓ | D-pad |
| Enter | A (confirm) |
| Backspace | B (cancel/back) |
| X / x | X button |
| Y / y | Y (refresh) |
| [ | L1 (header left) |
| ] | R1 (header right) |
| Tab | Select |
| Space | Start |
| Q / q | L3 |
| E / e | R3 |
| H / h | Home |

---

## 7. Integration Checklist (What an Agent Needs to Do)

To wire PSG1 into a new project, an agent should:

### Step 1 — Copy files
```
apps/web/src/hooks/useGamepad.ts         → src/hooks/useGamepad.ts
apps/web/src/lib/gamepad-nav.ts          → src/lib/gamepad-nav.ts
apps/web/src/components/GamepadDebugBridge.tsx → src/components/
apps/web/src/components/VirtualKeyboard.tsx    → src/components/
apps/web/app/psg1.css                    → src/styles/psg1.css
apps/web/public/art/                     → public/art/
```

### Step 2 — Globals CSS
```css
@import "./psg1.css";
```

### Step 3 — Mount at app root (once)
```tsx
"use client";
import { useGamepadPoll } from "@/hooks/useGamepad";
import dynamic from "next/dynamic";

const GamepadDebugBridge = dynamic(() => import("@/components/GamepadDebugBridge"), { ssr: false });
const VirtualKeyboard    = dynamic(() => import("@/components/VirtualKeyboard"),    { ssr: false });

export default function RootLayout({ children }) {
  useGamepadPoll(); // ONE call at the root. Never mount twice.
  const gpDebug = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("gp");
  return (
    <html><body>
      {children}
      {gpDebug && <><GamepadDebugBridge /><VirtualKeyboard /></>}
    </body></html>
  );
}
```

### Step 4 — Configure the content zone
```ts
// index.tsx or _app.tsx — call once before any renders
import { configurePsg1 } from "@/lib/gamepad-nav";
configurePsg1({ contentZone: ".my-game-main" }); // your scrollable container
```

### Step 5 — Mark nav elements
```tsx
// Header/tab buttons:
<button className="gp-cycleable" onClick={...}>Lobby</button>

// Content container:
<main className="my-game-main">
  {/* D-pad navigates inside here */}
</main>
```

### Step 6 — Subscribe to actions
```tsx
import { useGamepadAction } from "@/hooks/useGamepad";

useGamepadAction((action) => {
  if (action === "confirm")  handleConfirm();
  if (action === "back")     router.back();
  if (action === "refresh")  reload();
  if (action === "select")   connectWallet();
  if (action === "start")    router.push("/mode-gate");
});
```

### Step 7 — Test
Add `?gp` to any URL. The simulator overlay appears in the bottom-right corner.

---

## 8. Known Quirks & Caveats

### Wallets / Extension Popups
When a Phantom/Backpack wallet popup opens in an extension overlay, it is **outside the DOM**.
No DOM manipulation can reach it. For this reason, A/R3 buttons just dispatch to your app —
the user must use the touchscreen to interact with wallet popups. This is by design.

### `dialog.showModal()` vs `div` Modals
Full top-layer behavior (cursor reparenting, simulator portaling) only applies to native
`<dialog>` elements. If your modals are `<div>` overlays, they're picked up by the
`[role="dialog"]` fallback in `MODAL_SELECTOR`.

### TestIDs & Selector Classes
`findCancelButton()` in `useGamepad.ts` scans for these RPS-specific section classes:
`.profile-edit, .wallet-panel, .admin-reset, .admin-ban`
You should update this regex to match YOUR app's section/form selectors, or make it
configurable via `configurePsg1({ cancelScope: ".my-modal, .my-form" })` — **this is a
good first modularization task for an agent**.

### No L2/R2
The PSG1 has no triggers. Buttons 6 and 7 in the Gamepad API will always be unpressed.
Do not bind important actions to triggers.

### One `useGamepadPoll()` per page
Mount it exactly once. Mounting it twice creates two polling loops on the same gamepad bus —
button presses will fire twice.

---

## 9. Next Steps for Full Modularization

The repo is currently at **v0.1.0** — functional but not yet a proper npm package.

### High-Priority Agent Tasks

1. **Make `cancelScope` configurable via `configurePsg1()`**  
   The hardcoded section selectors in `findCancelButton()` should be removed and replaced
   with a configurable option. Same function exists in both `useGamepad.ts` AND
   `GamepadDebugBridge.tsx` — needs to be deduplicated into `gamepad-nav.ts`.

2. **npm package scaffold for `@psg1/core`**  
   `packages/core/` currently holds a documentation barrel. The actual source files need
   to move there and be compiled to `dist/` for npm publishing:
   ```
   packages/core/src/hooks/useGamepad.ts
   packages/core/src/lib/gamepad-nav.ts
   packages/core/src/components/GamepadDebugBridge.tsx
   packages/core/src/components/VirtualKeyboard.tsx
   packages/core/package.json   ← needs proper build:tsc config
   ```

3. **Vanilla JS / framework-agnostic core**  
   The navigation logic in `gamepad-nav.ts` has zero React dependency — it's pure DOM.
   The polling loop in `useGamepad.ts` could be split into:
   - `gamepad-core.ts` — pure polling + bus (no React)  
   - `useGamepad.ts` — thin React hook wrapper calling `gamepad-core.ts`
   This would let Vue/Svelte/vanilla devs use the core without React.

4. **Jest/Vitest unit tests for spatial nav**  
   The grid clustering and row navigation logic in `spatialNav()` is the most complex part
   and has zero tests. Mock `getBoundingClientRect` and test up/down/left/right/edge cases.

5. **Vercel deployment of the demo app**  
   The `apps/web` Next.js demo app can be deployed to Vercel from this repo directly for
   a live public demo. Update `apps/web/next.config.mjs` if needed.

---

## 10. Resources

| Resource | URL |
|----------|-----|
| Solana Mobile (Seeker) | https://solanamobile.com/seeker |
| Solana dApp Store | https://dappstore.app |
| Web Gamepad API (MDN) | https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API |
| Gamepad API browser support | https://caniuse.com/gamepad |
| CSS Top Layer (MDN) | https://developer.mozilla.org/docs/Glossary/Top_layer |
| dialog.showModal() spec | https://developer.mozilla.org/docs/Web/HTML/Element/dialog |
| R.P.S. v2 (origin) | https://github.com/Sol-HQ/R.P.S.v.2 |
| I.O. / iozone.dev | https://iozone.dev |
| PSG1 Simulator Demo | https://github.com/Sol-HQ/PSG1-Game-Pad-Simulator |

---

## 11. Repo Structure Quick Reference

```
PSG1-Game-Pad-Simulator/
├── apps/
│   └── web/                        ← Next.js demo + testbed
│       ├── app/
│       │   ├── layout.tsx          ← mounts useGamepadPoll + simulator overlay
│       │   ├── page.tsx            ← renders DemoShell
│       │   ├── globals.css         ← imports psg1.css
│       │   └── psg1.css            ← copy of packages/styles/psg1.css
│       ├── src/
│       │   ├── components/
│       │   │   ├── DemoShell.tsx   ← interactive testbed showing integration patterns
│       │   │   ├── GameApp.tsx     ← thin wrapper that mounts everything
│       │   │   ├── GamepadDebugBridge.tsx  ← simulator overlay + keyboard bridge
│       │   │   └── VirtualKeyboard.tsx     ← console-style OSK
│       │   ├── hooks/
│       │   │   └── useGamepad.ts   ← hardware polling + event bus + useGamepadAction
│       │   └── lib/
│       │       └── gamepad-nav.ts  ← spatial nav, focus, modal, configurePsg1()
│       └── public/
│           ├── art/                ← moju cursor sprites (gold+teal, 5 sizes each)
│           └── brand/              ← I.O. logo watermark
├── docs/
│   ├── INTEGRATE.md               ← step-by-step copy-paste integration guide
│   ├── PSG1_INTEGRATION.md        ← detailed feature docs (from R.P.S. v2)
│   └── PSG1_ORIGIN.md             ← THIS FILE
├── packages/
│   ├── core/
│   │   └── index.ts               ← public API documentation barrel (pre-npm)
│   └── styles/
│       └── psg1.css               ← standalone CSS (import into any project)
└── PSG1/
    ├── CONTROLLER_MAP.md          ← full button/axis mapping with PSG1-specific notes
    ├── PLAYGATE.md               ← gating/access notes from RPS integration
    └── README.md                 ← PSG1 hardware context
```

---

## 12. Commit History (Origin to Extraction)

| Commit | Date | What Happened |
|--------|------|---------------|
| Multiple commits in R.P.S.v.2 | Early March 2026 | PSG1 nav built, debugged, hardened inside RPS |
| d0bbc60 (RPS) | Mar 14 2026 | Face button fix (A/B swap), D-pad spatial nav, R-stick |
| eceb712 (RPS) | Mar 14 2026 | Focus escape fix, moju pointer edge clamp |
| 50ebd36 (PSG1) | Mar 25 2026 | **Extracted to this repo** — standalone release v0.1.0 |

Critical RPS commits documenting bugs fixed during PSG1 development:
- **Focus escape bug** (eceb712): `el.focus()` was causing D-pad/mojuju to escape to URL bar.
  Fixed by removing ALL `el.focus()` calls from `setGpFocus()` — CSS class only.
- **Face button swap** (d0bbc60): btn0/btn1 were originally Xbox-convention (0=A). Changed
  to PSG1-physical-convention (0=B, 1=A) after hands-on testing.
- **Simulator portal** (d0bbc60): Simulator overlay was invisible/unclickable when wallet
  dialog opened. Fixed by portaling into `dialog[open]`.
- **X button scope** (2bfb4ee in RPS): X button was dispatching to `document.body` and
  accidentally clicking Cancel buttons behind PublicProfile overlay. Scoped to modal-only.
