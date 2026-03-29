# MEMORY.md — PSG1 GamePad Simulator

> **For agents, contributors, and future sessions.**  
> Read this before touching any file. It documents what this project is, what it
> is NOT, all architectural decisions, conventions, and the reasoning behind them.
> Updated: 2026-03-29

---

## 1. IDENTITY — What This Is

**Name:** PADSIM PSG1  
**Repo:** `Sol-HQ/PSG1-Game-Pad-Simulator`  
**Owner:** Sol-HQ (GitHub org) / I.O. (iozone.dev)  
**Version:** v0.1.0  
**License:** MIT  
**Live demo:** https://psg-1-game-pad-simulator-web.vercel.app  

PADSIM PSG1 is a **browser-based gamepad overlay** that lets Solana game developers
test full PSG1 controller navigation before they have physical hardware. Add `?gp`
to any URL and a virtual PSG1 pad appears. Every button fires the exact same events
as real hardware via the Web Gamepad API.

---

## 2. WHAT IT IS NOT — Critical Distinctions

| Statement | TRUE or FALSE |
|-----------|--------------|
| PSG1 is made by I.O. / Sol-HQ | **FALSE** — PSG1 hardware is made by **Play Solana** |
| PADSIM PSG1 is the official Play Solana simulator | **FALSE** — official simulator is Unity-based, separate product |
| PSG1 is a Seeker peripheral or accessory | **FALSE** — PSG1 is a standalone Gameboy-style handheld, not Seeker-related |
| PADSIM PSG1 is Sol-HQ's open-source browser overlay | **TRUE** |
| PSG1 hardware has L2/R2 triggers | **FALSE** — PSG1 has NO L2/R2. Do not add them to the simulator |
| PSG1 hardware has a touchscreen | **FALSE** — it is a physical button console |

**DO NOT** fabricate PSG1 hardware specs. Source of truth:
- `packages/core/src/lib/psg1-hardware.ts` — canonical spec in code
- `PSG1/CONTROLLER_MAP.md` — full button reference
- `docs/PSG1_ORIGIN.md` — verified origin story

---

## 3. HARDWARE SPEC (PSG1 by Play Solana)

| Spec | Value |
|------|-------|
| Screen | 3.92" / 1240×1080 |
| D-pad | Yes |
| Face buttons | A (right), B (bottom), X (top), Y (left) |
| Shoulder | L1, R1 only — **NO L2/R2** |
| Sticks | L-stick, R-stick, L3 (click), R3 (click) |
| System buttons | Select, Start, Home |
| Connection | Bluetooth / USB-C |
| Official SDK | Unity |
| Submission | PlayGate (developers.playsolana.com) |

### Browser Button Mapping (Web Gamepad API indices)

| PSG1 Button | Index | PADSIM Action |
|-------------|-------|---------------|
| B (bottom) | 0 | Cancel / back / close modal |
| A (right) | 1 | Confirm / click / open VK |
| Y (left) | 2 | Refresh / secondary action |
| X (top) | 3 | Reserved / context (no-op by default) |
| L1 | 4 | Cycle header left `.gp-cycleable` |
| R1 | 5 | Cycle header right `.gp-cycleable` |
| L2 | 6 | Not present on PSG1 — absent from simulator |
| R2 | 7 | Not present on PSG1 — absent from simulator |
| Select | 8 | `dispatch("select")` |
| Start | 9 | `dispatch("start")` |
| L3 | 10 | `dispatch("l3")` |
| R3 | 11 | Click at cursor (same as A) |
| D-pad Up | 12 | Spatial nav up |
| D-pad Down | 13 | Spatial nav down |
| D-pad Left | 14 | Spatial nav left |
| D-pad Right | 15 | Spatial nav right |
| Home | 16 | `dispatch("home")` |

### Axes
| Axis | Index | PADSIM Action |
|------|-------|---------------|
| Left stick X | 0 | Moju pointer horizontal |
| Left stick Y | 1 | Moju pointer vertical |
| Right stick X | 2 | Spatial nav (same as D-pad L/R) |
| Right stick Y | 3 | Continuous scroll |

---

## 4. REPO STRUCTURE

```
PSG1-Game-Pad-Simulator/
├── MEMORY.md                    ← YOU ARE HERE
├── README.md                    ← public-facing overview + quick start
├── SECURITY.md                  ← full security audit + verifiability steps
├── package.json                 ← pnpm monorepo root (version 0.1.0)
├── pnpm-workspace.yaml          ← workspace: packages/*, apps/*, examples/*
├── tsconfig.base.json           ← shared TypeScript config
│
├── packages/
│   ├── core/                    ← @psg1/core — the installable npm package
│   │   ├── package.json         ← name: "@psg1/core", peerDeps: react/next
│   │   ├── index.ts             ← barrel re-export → src/index.ts
│   │   └── src/
│   │       ├── index.ts         ← PUBLIC API — all exports listed here
│   │       ├── components/
│   │       │   ├── GamepadDebugBridge.tsx  ← simulator overlay + keyboard bridge
│   │       │   ├── VirtualKeyboard.tsx     ← console-style OSK
│   │       │   └── GameApp.tsx             ← drop-in root wrapper
│   │       ├── hooks/
│   │       │   ├── useGamepad.ts           ← hardware polling + event bus
│   │       │   └── useGamepadMapper.ts     ← declarative action routing hook
│   │       └── lib/
│   │           ├── gamepad-nav.ts          ← spatial nav, focus, modal utilities
│   │           ├── psg1-mapper.ts          ← runtime mapper engine
│   │           └── psg1-hardware.ts        ← CANONICAL HARDWARE SPEC (frozen)
│   └── styles/
│       └── psg1.css             ← all PSG1 CSS (simulator, focus rings, VK, moju)
│
├── apps/
│   └── web/                     ← @psg1/demo — Next.js testbed & Vercel deployment
│       ├── package.json         ← name: "@psg1/demo"
│       ├── next.config.mjs
│       ├── app/
│       │   ├── layout.tsx       ← metadata (OG/Twitter), GameApp root mount
│       │   ├── page.tsx         ← landing page
│       │   ├── icon.png         ← favicon — I.O. logo (80px, auto-detected by Next.js)
│       │   ├── globals.css
│       │   ├── psg1.css         ← symlinked/copied from packages/styles
│       │   └── game/
│       │       └── page.tsx     ← /game sandbox — full test harness with TTT
│       └── public/
│           ├── og-image.jpg     ← 1024×1024 OG/Twitter card image
│           ├── art/             ← moju cursor sprites (gold/teal, 32–128px)
│           ├── brand/           ← I.O. logo (io-logo-80.png), mojuju.png
│           └── psg1.mapping.sample.json  ← example mapping config
│
├── examples/
│   └── tic-tac-toe/             ← standalone minimal integration example
│
├── docs/
│   ├── LAYMANS_MANUAL.md        ← step-by-step guide, start here for new devs
│   ├── INTEGRATE.md             ← technical integration reference (two paths)
│   ├── PSG1_INTEGRATION.md      ← full API reference
│   └── PSG1_ORIGIN.md           ← verified history of PSG1, PADSIM, Sol-HQ
│
└── PSG1/
    ├── CONTROLLER_MAP.md        ← full button/axis/action reference table
    ├── PLAYGATE.md              ← PlayGate submission checklist
    └── Art/                     ← source art assets (high-res originals)
        ├── I.O..png             ← I.O. logo (high-res original, ~3MB)
        ├── io-logo.png          ← I.O. logo variant
        ├── psg1-promo.jpg       ← PSG1 promo image
        └── ...
```

---

## 5. PUBLIC API — What `@psg1/core` Exports

All exports are in `packages/core/src/index.ts`. Key ones:

### Hooks
```ts
useGamepadPoll()              // start hardware polling — call once at app root
useGamepadAction(cb)          // listen for semantic actions ("back", "refresh", etc.)
useGamepadMapper(mapping)     // declarative action→DOM routing
useGamepadCallbacks(cbs)      // fire callbacks per action
gamepadBus                    // raw EventTarget — subscribe to low-level events
```

### Navigation
```ts
configurePsg1({ contentZone: ".my-zone" })  // set scrollable content container
spatialNav(dir)               // move focus up/down/left/right (grid-aware)
setGpFocus(el)                // apply .gp-focus to element (CSS only, no scroll)
clearGpFocus()                // clear focus
cycleHeader(dir)              // cycle .gp-cycleable elements (L1/R1)
scrollContent(dir)            // scroll the content zone
isModalOpen()                 // detect open dialog/@modal
closeModal()                  // close topmost open modal
findCancelButton()            // find and click cancel/close in open modal
```

### Components
```tsx
<GameApp>{children}</GameApp>            // drop-in wrapper — does everything
<GamepadDebugBridge />                   // simulator overlay (dynamic import, ssr:false)
<VirtualKeyboard />                      // OSK (dynamic import, ssr:false)
```

### Hardware Constants
```ts
BTN_A, BTN_B, BTN_X, BTN_Y             // 1, 0, 3, 2
BTN_L1, BTN_R1                          // 4, 5
BTN_SELECT, BTN_START                   // 8, 9
BTN_L3, BTN_R3                          // 10, 11
BTN_DPAD_UP/DOWN/LEFT/RIGHT            // 12, 13, 14, 15
BTN_HOME                                // 16
AXIS_LX, AXIS_LY                        // 0, 1
AXIS_RX, AXIS_RY                        // 2, 3
PSG1_DEVICE                             // { name, screen, connections, … }
PSG1_BUTTONS                            // frozen array of all button defs
```

---

## 6. CSS CLASSES

| Class | Who adds it | Purpose |
|-------|-------------|---------|
| `.gp-focus` | gamepad-nav.ts | Current D-pad focus target — neon green ring |
| `.gp-moju-hover` | gamepad-nav.ts | Element under left-stick cursor — cyan ring |
| `.gp-cycleable` | **You** | Marks elements for L1/R1 tab cycling |
| `.app-shell__main` | **You** (or `configurePsg1`) | Scrollable content zone for D-pad nav |
| `.gp-sim` | GamepadDebugBridge | Simulator overlay root (do not add manually) |
| `.vk-*` | VirtualKeyboard | OSK elements (managed automatically) |

**CRITICAL:** `setGpFocus()` applies CSS class ONLY — it does **not** call `el.focus()`.
This was a deliberate fix (commit `eceb712` in RPS v2). Calling `.focus()` caused the
browser URL bar to steal focus when navigating. CSS-only focus is the correct approach.

---

## 7. ARCHITECTURE DECISIONS

### Why `?gp` activates the simulator
Zero production cost. The simulator ships zero bytes to users who don't add `?gp`.
The SSR check is read after mount (`useEffect`) to avoid hydration mismatch.

### Why `configurePsg1` instead of auto-detecting the content zone
Auto-detection would guess wrong on every app's unique layout. One explicit call
at boot is more reliable than any heuristic.

### Why no npm publish yet
`@psg1/core` is not yet on npm registry. Developers use Path 1 (copy files) or
install as a local workspace dependency (`"@psg1/core": "workspace:*"`). 
The `exports` field in `package.json` is already wired for future npm publish.

### Why mojuju pointer clamps 16px from edges
The physical PSG1 hardware never lets the cursor bleed into browser chrome.
The moju sprite is 32px wide — clamping at 16px keeps the hot-spot inside viewport.

### Why `<GameApp>` exists
Convenience wrapper that handles the SSR/hydration dance, `?gp` detection after
mount, and conditional rendering of `<GamepadDebugBridge>` + `<VirtualKeyboard>`.
New integrators should use `<GameApp>` unless they need custom logic.

---

## 8. SECURITY POSTURE

**Zero-trust by design. Full audit: `SECURITY.md`**

- No backend, no API routes, no server
- No secrets, no API keys, no hardcoded tokens
- No analytics, no telemetry, no third-party scripts
- No localStorage, no cookies, no sessionStorage
- No `eval()`, `innerHTML`, `dangerouslySetInnerHTML`, `document.write`
- Only `fetch()` is an optional dev-invoked mapping loader
- 3 direct dependencies: `next`, `react`, `react-dom` only
- `pnpm audit` — 0 vulnerabilities

Quick verify:
```bash
grep -rn "eval\|innerHTML\|dangerouslySetInnerHTML" packages/ apps/web/app/
# must return 0 matches
```

---

## 9. GIT HISTORY — Key Milestones

| Commit | What |
|--------|------|
| `50ebd36` | init — PSG1 GamePad Simulator v0.1.0, extracted from RPS v2 |
| `cb036ed` | docs: fix CONTROLLER_MAP button indices |
| `92c8967` | docs: accurate PSG1_ORIGIN — correct hardware facts, remove fabricated narrative |
| `afa7eaf` | feat: canonical PSG1 hardware spec (`psg1-hardware.ts`) |
| `52b0d39` | refactor: modular npm package structure |
| `87e6d23` | example: Tic-Tac-Toe — full integration demo |
| `f436e1e` | Next.js demo app — /game sandbox, OG meta tags |
| `4447e96` | docs: LAYMANS_MANUAL.md, INTEGRATE.md, PSG1_INTEGRATION.md, PSG1_ORIGIN.md |
| `08e319d` | fix: OG image + Twitter Card meta tags |
| `2f7f403` | security: SECURITY.md + README verification section |
| `0203119` | security audit — zero attack surface, full verification checklist |
| `f229676` | README — project overview, install guide, architecture (HEAD as of 2026-03-29) |

**36 commits total. Working tree clean as of 2026-03-29.**

---

## 10. AGENT INSTRUCTIONS — How to Pick Up Work

### Before making any changes
1. Run `git log --oneline -5` — verify you're at the right commit
2. Run `pnpm build` from repo root — verify build is clean
3. Read this file. Read the relevant source file. Then change things.

### What to never fabricate
- PSG1 hardware specs — always read `psg1-hardware.ts` or `PSG1/CONTROLLER_MAP.md`
- Vercel deployment URL — check `apps/web/app/layout.tsx` for `SITE_URL`
- npm package name — it is `@psg1/core`, not `psg1-core` or `psg1`

### Commit conventions
- `feat:` for new capabilities
- `fix:` for bug fixes
- `docs:` for documentation only
- `refactor:` for structural changes with no behavior change
- `chore:` for tooling, config, cleanup
- Keep messages under 72 characters. Be descriptive — GitHub shows this next to each file.

### Build commands
```bash
pnpm install          # install all workspace deps
pnpm dev              # start demo at http://localhost:3000
pnpm build            # build demo app (Vercel uses this)
pnpm dev:game         # start tic-tac-toe example at :3001
pnpm lint             # lint demo app
```

### Testing the simulator
```
http://localhost:3000?gp       # landing page with simulator
http://localhost:3000/game?gp  # full game sandbox — test ALL controls here
```

### Adding a new gamepad action
1. Add the string literal to `GamepadAction` type in `useGamepad.ts`
2. Handle it in `gamepad-nav.ts` (inside the `gamepadBus` listener)
3. Export from `packages/core/src/index.ts` if it's a new utility
4. Document in `PSG1/CONTROLLER_MAP.md`

### Adding a new button to the simulator UI
1. Check `PSG1/CONTROLLER_MAP.md` first — if it's not on real PSG1 hardware, do NOT add it
2. Add to `GamepadDebugBridge.tsx` — the simulator renders the button grid
3. Wire the index constant from `psg1-hardware.ts`
4. Never hardcode button indices inline — always use `BTN_*` constants

---

## 11. KNOWN PITFALLS

| Pitfall | Details |
|---------|---------|
| `el.focus()` causes URL bar steal | Fixed in RPS v2 commit `eceb712`. `setGpFocus()` is CSS-only. Do NOT add `el.focus()` back. |
| L2/R2 in simulator | PSG1 has no triggers. Removed. Don't re-add them. |
| Moju cursor bleeding into browser chrome | Clamp at 16px from all viewport edges. |
| `?gp` read during SSR | Must read after mount inside `useEffect`. Otherwise hydration mismatch. |
| X button scope | Only fire X within a modal — was leaking to document.body and triggering Cancel buttons behind overlays (fixed in RPS v2 March 2026). |
| Dialog z-index + moju cursor | When a `dialog.showModal()` is open, reparent the moju cursor element into the dialog each frame — dialogs use a separate top-layer above all z-index stacking contexts. |

---

## 12. SESSION LOG

| Date | What Happened |
|------|--------------|
| 2026-03-25 | Extracted from RPS v2 as standalone open-source repo (50ebd36). 41 files, 4419 lines. |
| 2026-03-25/26 | Full docs overhaul. Corrected fabricated PSG1 hardware facts. Fixed CONTROLLER_MAP, PLAYGATE, PSG1/README, PSG1_ORIGIN. Established "PADSIM PSG1" as the Sol-HQ browser overlay name. |
| 2026-03-27–29 | Widget-first UX polish, canonical hardware spec, test game (/game), runtime mapper, settings panel, VK fixes, security audit, OG image/meta tags, SECURITY.md, cosmetic commit rewrites for GitHub file view, .markdownlint.json deleted, PSG1/Art cleanup. 36 commits. HEAD: f229676. Build clean. Vercel live. |
| 2026-03-29 | Favicon: `apps/web/app/icon.png` = I.O. logo (io-logo-80.png, 2.8KB). This file (MEMORY.md) created. |

---

*This file is maintained by Sol-HQ and GitHub Copilot agents working on this repo.*  
*Update the Session Log and Known Pitfalls sections whenever something non-obvious is discovered.*
