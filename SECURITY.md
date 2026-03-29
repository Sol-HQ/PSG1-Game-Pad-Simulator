# Security Audit — PADSIM PSG1

> Last audited: 2026-03-26
> Auditor: GitHub Copilot (Claude Opus 4.6)
> Scope: Every file in `packages/core/src/`, `apps/web/app/`, all configs
> Result: **CLEAN — 0 vulnerabilities found**

---

## Audit Summary

| Category | Status | Notes |
|----------|--------|-------|
| XSS (cross-site scripting) | CLEAN | No `innerHTML`, `dangerouslySetInnerHTML`, or `eval()` in any user code |
| Injection | CLEAN | No dynamic HTML rendering. All text content is React JSX (auto-escaped) |
| Secrets / Credentials | CLEAN | Zero hardcoded secrets, API keys, tokens, or passwords anywhere |
| Dependencies | CLEAN | `pnpm audit` — 0 known vulnerabilities. Only Next.js + React + TypeScript |
| postMessage | SAFE | Defaults to `window.location.origin` (same-origin). `"*"` requires explicit opt-in with documented warning |
| Network requests | MINIMAL | Only `fetch()` in `loadPsg1Mapping()` — loads a developer-provided local JSON file path |
| localStorage / cookies | NONE | Zero client storage of any kind |
| Backend / API routes | NONE | Pure client-side library. No server code, no database, no auth |
| DOM manipulation | SAFE | Only creates a cursor `<div>` with hardcoded attributes. `.click()` on developer-specified selectors |
| Analytics / tracking | NONE | Zero telemetry, zero third-party scripts |
| Dynamic code execution | NONE | No `eval()`, `new Function()`, `setTimeout(string)`, or `import()` from user input |

---

## File-by-File Findings

### `packages/core/src/lib/psg1-hardware.ts`
- Immutable hardware constants and frozen object arrays
- Pure data — no logic, no I/O, no DOM access
- **Verdict: CLEAN**

### `packages/core/src/lib/psg1-mapper.ts`
- Routes gamepad actions to four adapter types: DOM click, CustomEvent, postMessage, callback
- `dom-click`: Uses `document.querySelector(selector).click()` — selector is developer-provided at build time, not user input
- `postMessage`: Defaults to same-origin. Appends `_psg1: true` marker for receiver filtering. Does NOT listen for incoming messages
- `callback`: Calls functions from a developer-registered `Map<string, () => void>` — no injection vector
- `loadPsg1Mapping(url)`: Fetches a JSON file from a developer-provided URL path. Standard `fetch()`, no credentials
- Dev-only `console.warn` behind `process.env.NODE_ENV !== "production"` — stripped in production builds
- **Verdict: CLEAN**

### `packages/core/src/lib/gamepad-nav.ts`
- DOM navigation utilities: querySelector, getBoundingClientRect, classList, scrollIntoView
- No `el.focus()` — uses CSS-only `.gp-focus` class to prevent browser focus escape
- `resolveInteractiveAt()`: Uses `document.elementFromPoint()` — standard API, returns only elements already in the DOM
- `findCancelButton()`: Scoped to current modal/dialog only — never searches document.body blindly
- `closeModal()`: Clicks existing close buttons or calls `dialog.close()` — no arbitrary code execution
- **Verdict: CLEAN**

### `packages/core/src/hooks/useGamepad.ts`
- Hardware polling loop using `navigator.getGamepads()` (standard Web Gamepad API)
- Creates a single cursor `<div>` with hardcoded inline styles — no user-controlled HTML
- Reparents cursor into `<dialog>` top-layer to stay visible over wallet modals — safe DOM move
- Event listeners: `gamepadconnected`, `pointerdown` (clears focus), `gamepad-cursor-move` (custom bus)
- All cleanup in the `useEffect` return — no memory leaks
- **Verdict: CLEAN**

### `packages/core/src/hooks/useGamepadMapper.ts`
- Thin React wrapper around `installPsg1Mapper` — auto-uninstalls on unmount
- `useGamepadCallbacks`: registers/deregisters named callbacks. Standard `useEffect` pattern
- **Verdict: CLEAN**

### `packages/core/src/components/GameApp.tsx`
- Root shell: calls `useGamepadPoll()`, loads overlay conditionally via `?gp` query param
- `dynamic(() => import(…), { ssr: false })` — zero-cost code splitting, no SSR mismatch
- Reads `window.location.search` only after mount (inside `useEffect`)
- **Verdict: CLEAN**

### `packages/core/src/components/GamepadDebugBridge.tsx`
- Simulator overlay: keyboard shortcut mapping, button press handlers, settings panel UI
- All event handling uses `stopPropagation()` to prevent leaking into app
- `MutationObserver` watches for `dialog[open]` to portal the simulator — standard pattern
- Hold-to-repeat uses `setInterval` with proper cleanup on unmount
- No `innerHTML`, no string interpolation into HTML, no `eval`
- **Verdict: CLEAN**

### `packages/core/src/components/VirtualKeyboard.tsx`
- On-screen keyboard for text input via gamepad
- `setNativeValue()`: Uses `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set` — standard React pattern for triggering controlled input updates
- `el.blur()` on open to prevent physical keyboard from appearing
- Debounce guard (`performance.now()` check) prevents double-fire from pointer+click events
- All key layout data is hardcoded string arrays — no dynamic content
- **Verdict: CLEAN**

### `packages/core/src/index.ts`
- Barrel re-export file. No logic, no I/O
- **Verdict: CLEAN**

### `apps/web/app/layout.tsx`
- Standard Next.js layout. No inline scripts, no external resources
- **Verdict: CLEAN**

### `apps/web/app/page.tsx`
- Static landing page with links. No dynamic content
- **Verdict: CLEAN**

### `apps/web/app/game/page.tsx`
- Tic-Tac-Toe sandbox. All state is local React state. No network, no storage
- **Verdict: CLEAN**

---

## How to Verify (for developers & security reviewers)

### 1. Zero eval / innerHTML
```bash
# Run from repo root — should return ZERO matches in packages/ and apps/web/app/
grep -rn "eval\|innerHTML\|dangerouslySetInnerHTML\|document\.write" packages/ apps/web/app/
```

### 2. Zero secrets
```bash
grep -rn "secret\|apiKey\|private_key\|password\|token" packages/ apps/web/app/
```

### 3. Dependency audit
```bash
pnpm audit
# Expected: 0 vulnerabilities
```

### 4. Dependency count
```bash
pnpm ls --depth 0
# Expected:  next, react, react-dom, typescript — nothing else
```

### 5. No network calls at runtime
The only `fetch()` in the codebase is `loadPsg1Mapping()` which is:
- Optional (not called by default)
- Developer-invoked with a known local path
- Never called with user input

### 6. Read the code yourself
The entire library is **~1,800 lines of TypeScript** across 8 files. No minification, no obfuscation, no vendored binaries. Every line is readable.

---

## Attack Surface Analysis

| Vector | Risk | Why |
|--------|------|-----|
| XSS via gamepad input | NONE | Gamepad API returns only numbers (button.pressed, axis values). No strings enter the DOM |
| Malicious mapping file | LOW | `loadPsg1Mapping()` parses JSON and routes to typed adapters. Worst case: clicking wrong DOM element (dev controls the file) |
| postMessage spoofing | LOW | Mapper sends but never receives messages. Apps receiving `_psg1` messages should validate origin |
| DOM click injection | NONE | `dom-click` adapter uses developer-provided CSS selectors, not user input |
| Supply chain | LOW | 3 direct deps (next, react, react-dom) — all maintained by Meta/Vercel. No gamepad-specific third-party code |

---

## Statement

This library contains **zero backend code, zero authentication, zero storage, zero analytics, and zero third-party gamepad dependencies**. It reads the standard Web Gamepad API and translates button presses into DOM navigation and developer-defined actions. The entire source is open, readable, and auditable in under 30 minutes.
