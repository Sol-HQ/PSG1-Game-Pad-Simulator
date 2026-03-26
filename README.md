# PSG1 GamePad Simulator

> Browser-based PSG1 (PlaySolana Gamepad 1) emulator for Solana game developers.  
> Test and wire up full gamepad navigation **before** waiting for hardware approval — straight from any browser, on any device.

---

## What It Does

- **Simulator overlay** — a floating PSG1 controller UI, activated by adding `?gp` to any URL. Zero bytes in production.
- **Hardware polling** — automatically bridges to real gamepad hardware (Web Gamepad API) on the same mapping.
- **Spatial D-pad navigation** — grids items by Y position and moves with zero diagonal drift.
- **L1/R1 header cycling** — cycles any elements you mark `.gp-cycleable`.
- **Moju pointer** — left-stick moves a gold cursor sprite, A clicks at cursor position.
- **Virtual keyboard** — console-style OSK opens automatically when A is pressed on a text input.
- **Configurable** — one function call to tell the navigator where your scrollable content zone is.

---

## Quick Start (copy-paste, no npm required)

### Step 1 — Copy the files

```
src/
  components/
    GamepadDebugBridge.tsx   ← simulator overlay + keyboard bridge
    VirtualKeyboard.tsx      ← console-style OSK
  hooks/
    useGamepad.ts            ← hardware polling + event bus
  lib/
    gamepad-nav.ts           ← spatial nav, focus, modal utilities
public/
  art/
    moju-gold-32.png  moju-gold-48.png  … (cursor sprites)
  brand/
    io-logo-80.png            ← watermark (optional, swap your logo)
```

Copy those files into your project. No extra dependencies beyond React.

### Step 2 — Import the CSS

In your `globals.css` (or equivalent):

```css
@import "./psg1.css";   /* copy packages/styles/psg1.css next to your globals */
```

### Step 3 — Mount the polling hook (once, at your app root)

```tsx
// app/layout.tsx or _app.tsx (client component)
import { useGamepadPoll } from "@/hooks/useGamepad";

export default function RootLayout({ children }) {
  useGamepadPoll();   // starts hardware + simulator bridge
  return <>{children}</>;
}
```

### Step 4 — Load the simulator overlay

```tsx
import dynamic from "next/dynamic";
const GamepadDebugBridge = dynamic(() => import("@/components/GamepadDebugBridge"), { ssr: false });
const VirtualKeyboard    = dynamic(() => import("@/components/VirtualKeyboard"),    { ssr: false });

// Inside your root component:
const gpDebug = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("gp");
// ...
return (
  <>
    {children}
    {gpDebug && <><GamepadDebugBridge /><VirtualKeyboard /></>}
  </>
);
```

Now add `?gp` to any URL in your game — the controller overlay appears.

### Step 5 — Mark your navigation

```tsx
// Nav tabs / header items — L1 / R1 cycles these:
<button className="gp-cycleable" onClick={() => setTab("Lobby")}>Lobby</button>
<button className="gp-cycleable" onClick={() => setTab("Play")}>Play</button>

// Your main scrollable content zone:
<main className="app-shell__main">
  {/* D-pad and right-stick navigate focusable elements in here */}
</main>
```

If your content zone has a different class name, configure it once at boot:

```ts
import { configurePsg1 } from "@/lib/gamepad-nav";
configurePsg1({ contentZone: ".my-game-content" });
```

### Step 6 — Listen for semantic actions (optional)

```tsx
import { useGamepadAction } from "@/hooks/useGamepad";

function MyComponent() {
  useGamepadAction((action) => {
    if (action === "back")    goBack();
    if (action === "refresh") reloadMatches();
    if (action === "select")  connectWallet();
    if (action === "start")   router.push("/");
  });
}
```

---

## Button Mapping (PSG1)

| Button | Browser Index | Action |
|--------|--------------|--------|
| A (right face) | 1 | Confirm / click / open VK |
| B (bottom face) | 0 | Cancel / back / close modal |
| Y (left face) | 2 | Refresh / close modal |
| X (top face) | 3 | Reserved / context |
| L1 | 4 | Cycle header left |
| R1 | 5 | Cycle header right |
| D-pad ↑↓←→ | 12–15 | Spatial content navigation |
| Left stick | axes 0/1 | Moju pointer cursor |
| Right stick ↑↓ | axes 3 | Continuous scroll |
| Right stick ←→ | axes 2 | Spatial nav (same as D-pad) |
| Select | 8 | dispatch("select") |
| Start | 9 | dispatch("start") |
| L3 | 10 | dispatch("l3") |
| R3 | 11 | Click (same as A) |
| Home | 16 | dispatch("home") |

---

## Keyboard Shortcuts (when overlay is open)

| Key | Button |
|-----|--------|
| ←↑→↓ | D-pad |
| Enter | A (confirm) |
| Backspace | B (back) |
| Y | Y (refresh) |
| X | X (reserved) |
| [ | L1 |
| ] | R1 |
| Tab | Select |
| Space | Start |
| Q | L3 |
| E | R3 |
| H | Home |

---

## CSS Classes Reference

| Class | Applied by | Purpose |
|-------|-----------|---------|
| `.gp-cycleable` | **You** | Marks elements for L1/R1 cycling |
| `.gp-focus` | Gamepad nav | Current D-pad focus (neon green ring) |
| `.gp-moju-hover` | Gamepad nav | Element under left-stick cursor (cyan ring) |
| `.app-shell__main` | **You** (or `configurePsg1`) | Scrollable content zone for D-pad |
| `.gp-sim` | Simulator | Overlay root (auto, don't add manually) |
| `.vk-*` | VirtualKeyboard | OSK elements (auto) |

---

## Running the Demo

```bash
cd apps/web
pnpm install
pnpm dev
# → http://localhost:3000?gp
```

---

## Repo Structure

```
PSG1-Game-Pad-Simulator/
  packages/
    core/          ← public API (index.ts) — future npm @psg1/core
    styles/
      psg1.css     ← all CSS, @import this in your project
  apps/
    web/           ← Next.js demo testbed
      src/
        components/
          GamepadDebugBridge.tsx
          VirtualKeyboard.tsx
          GameApp.tsx            ← integration example shell
          DemoShell.tsx          ← demo testbed UI
        hooks/
          useGamepad.ts
        lib/
          gamepad-nav.ts
      public/
        art/         ← moju cursor sprites
        brand/       ← I.O. watermark
  docs/
    PSG1_INTEGRATION.md
  PSG1/
    CONTROLLER_MAP.md
    PLAYGATE.md
```

---

## License

MIT — by [I.O.](https://iozone.dev) / Sol-HQ
