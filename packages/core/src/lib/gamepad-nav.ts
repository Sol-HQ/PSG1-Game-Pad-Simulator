/**
 * Shared gamepad navigation utilities.
 * Used by both useGamepadPoll() (real hardware) and GamepadDebugBridge (simulator/keyboard).
 */

const GP_CLS = "gp-focus";

export const FOCUSABLE = [
  "button:not(:disabled)",
  "a[href]",
  'input:not(:disabled):not([type="hidden"])',
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  '[tabindex="0"]',
].join(",");

export function getFocusablesIn(container: Element): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => {
    if (el.closest('[aria-hidden="true"]')) return false;
    if (el.closest(".gp-sim")) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
}

export function getGpFocused(): HTMLElement | null {
  return document.querySelector<HTMLElement>(`.${GP_CLS}`);
}

export function clearGpFocus() {
  getGpFocused()?.classList.remove(GP_CLS);
}

export function setGpFocus(el: HTMLElement, onFocus?: () => void) {
  clearGpFocus();
  el.classList.add(GP_CLS);
  // Do NOT call el.focus() — moving real browser focus lets the focus chain
  // escape to the URL bar / browser chrome on subsequent D-pad presses.
  // The .gp-focus CSS class handles the visual highlight instead.
  if (document.activeElement && document.activeElement !== document.body) {
    (document.activeElement as HTMLElement).blur?.();
  }
  el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  onFocus?.();
}

/**
 * Collect L1/R1-cycleable items from the tab bar + header trigger zone.
 * Only elements marked with `.gp-cycleable` are included.
 * Order: left-to-right by DOM order (tabs first, then header utilities).
 */
export function getHeaderItems(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(".gp-cycleable"),
  ).filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
}

/** Module-level memory for L1/R1 last-focused index (persists across cycles). */
let lastCycleIdx = -1;

/**
 * Cycle L1 (left) / R1 (right) through the gp-cycleable items.
 * Stops at edges — does NOT wrap around.
 * Remembers last position so focus reappears where you left it.
 */
export function cycleHeader(dir: 1 | -1, onFocus?: () => void) {
  const items = getHeaderItems();
  if (items.length === 0) return;
  const focused = getGpFocused();
  let idx = focused ? items.indexOf(focused) : -1;

  // If nothing currently focused, restore last known position
  if (idx === -1 && lastCycleIdx >= 0 && lastCycleIdx < items.length) {
    idx = lastCycleIdx;
    setGpFocus(items[idx], onFocus);
    return;
  }

  if (idx === -1) {
    const start = dir === 1 ? 0 : items.length - 1;
    lastCycleIdx = start;
    setGpFocus(items[start], onFocus);
  } else {
    const next = idx + dir;
    if (next < 0 || next >= items.length) return; // stop at edges
    lastCycleIdx = next;
    setGpFocus(items[next], onFocus);
  }
}

export const MODAL_SELECTOR =
  'dialog[open], [role="dialog"]:not([aria-hidden="true"]), .wallet-adapter-modal-wrapper';

/**
 * Configurable selectors — call configurePsg1() in your app root to customise.
 *
 * contentZone: CSS selector for the scrollable content area D-pad navigates inside.
 *   Default: ".app-shell__main" — override with your game's main content container.
 *
 * Example:
 *   import { configurePsg1 } from "@/lib/gamepad-nav";
 *   configurePsg1({ contentZone: ".my-game-main" });
 */
let _contentZoneSelector = ".app-shell__main";

export interface Psg1Config {
  /** CSS selector for the scrollable content container (D-pad + right-stick navigate inside). */
  contentZone?: string;
}

export function configurePsg1(cfg: Psg1Config) {
  if (cfg.contentZone) _contentZoneSelector = cfg.contentZone;
}

export function getContentContainer(): Element | null {
  const modal = document.querySelector(MODAL_SELECTOR);
  if (modal) return modal;
  return document.querySelector(_contentZoneSelector) ?? document.querySelector("main") ?? document.body;
}

export function isModalOpen(): boolean {
  return !!document.querySelector(MODAL_SELECTOR);
}

/**
 * Strict grid-based D-pad navigation.
 * Items are clustered into horizontal rows by Y-center proximity.
 * Up/Down: jump between rows, snapping to nearest X in the target row.
 * Left/Right: move within the current row only. Zero diagonal.
 */

const ROW_THRESHOLD = 24; // px — items within this Y-distance are same row

type NavItem = { el: HTMLElement; cx: number; cy: number };

function clusterRows(items: HTMLElement[]): NavItem[][] {
  const measured: NavItem[] = items.map((el) => {
    const r = el.getBoundingClientRect();
    return { el, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  });
  measured.sort((a, b) => a.cy - b.cy || a.cx - b.cx);

  const rows: NavItem[][] = [];
  for (const item of measured) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(item.cy - last[0].cy) <= ROW_THRESHOLD) {
      last.push(item);
    } else {
      rows.push([item]);
    }
  }
  // sort each row left-to-right
  for (const row of rows) row.sort((a, b) => a.cx - b.cx);
  return rows;
}

export function spatialNav(direction: "up" | "down" | "left" | "right", onFocus?: () => void) {
  const container = getContentContainer();
  if (!container) return;
  const items = getFocusablesIn(container);

  const focused = getGpFocused();

  // ── Focused element is in the HEADER zone (outside content container) ──
  if (focused && document.contains(focused) && !container.contains(focused)) {
    const headerItems = getHeaderItems();
    const hIdx = headerItems.indexOf(focused);

    if (direction === "down") {
      // Drop into content — first focusable item
      if (items.length > 0) setGpFocus(items[0], onFocus);
    } else if (direction === "left" && hIdx > 0) {
      setGpFocus(headerItems[hIdx - 1], onFocus);
    } else if (direction === "right" && hIdx < headerItems.length - 1) {
      setGpFocus(headerItems[hIdx + 1], onFocus);
    } else if (direction === "up") {
      // Nowhere to navigate above header — drive the page to the very top
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    return;
  }

  // ── Nothing focused at all — seed first content item ──
  if (!focused || !container.contains(focused)) {
    if (items.length > 0) setGpFocus(items[0], onFocus);
    return;
  }

  if (items.length === 0) return;

  const rows = clusterRows(items);
  const cr = focused.getBoundingClientRect();
  const cx = cr.left + cr.width / 2;

  // find which row the focused item lives in
  let curRow = -1;
  let curCol = -1;
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      if (rows[r][c].el === focused) { curRow = r; curCol = c; break; }
    }
    if (curRow !== -1) break;
  }
  if (curRow === -1) return;

  const row = rows[curRow];

  if (direction === "left") {
    if (curCol > 0) setGpFocus(row[curCol - 1].el, onFocus);
  } else if (direction === "right") {
    if (curCol < row.length - 1) setGpFocus(row[curCol + 1].el, onFocus);
  } else if (direction === "up") {
    const targetRow = curRow - 1;
    if (targetRow < 0) {
      // At top of content — jump UP into the header zone AND scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" });
      const headerItems = getHeaderItems();
      if (headerItems.length > 0) {
        // Pick the header item closest to our current X position
        let best: HTMLElement | null = null;
        let bestDist = Infinity;
        for (const h of headerItems) {
          const hr = h.getBoundingClientRect();
          const dx = Math.abs(hr.left + hr.width / 2 - cx);
          if (dx < bestDist) { bestDist = dx; best = h; }
        }
        if (best) setGpFocus(best, onFocus);
      }
      return;
    }
    let best: NavItem | null = null;
    let bestDist = Infinity;
    for (const item of rows[targetRow]) {
      const dx = Math.abs(item.cx - cx);
      if (dx < bestDist) { bestDist = dx; best = item; }
    }
    if (best) setGpFocus(best.el, onFocus);
  } else {
    // down
    const targetRow = curRow + 1;
    if (targetRow >= rows.length) return;
    let best: NavItem | null = null;
    let bestDist = Infinity;
    for (const item of rows[targetRow]) {
      const dx = Math.abs(item.cx - cx);
      if (dx < bestDist) { bestDist = dx; best = item; }
    }
    if (best) setGpFocus(best.el, onFocus);
  }
}

/** Scroll the page (or modal if open) by a fixed step. */
const SCROLL_STEP = 120;
export function scrollContent(direction: "up" | "down") {
  const modal = document.querySelector(MODAL_SELECTOR);
  if (modal && modal instanceof HTMLElement) {
    modal.scrollBy({ top: direction === "up" ? -SCROLL_STEP : SCROLL_STEP, behavior: "smooth" });
    return;
  }
  // No modal — scroll the page itself
  window.scrollBy({ top: direction === "up" ? -SCROLL_STEP : SCROLL_STEP, behavior: "smooth" });
}

/**
 * Linear cycle through ALL focusable items (row-by-row, left-to-right).
 * "next" = right/down order, "prev" = left/up order. Stops at edges (no wrap).
 */
export function cycleAll(direction: "next" | "prev", onFocus?: () => void) {
  const container = getContentContainer();
  if (!container) return;
  const items = getFocusablesIn(container);
  if (items.length === 0) return;

  // flatten rows into linear order: top→bottom, left→right
  const rows = clusterRows(items);
  const flat = rows.flat().map((n) => n.el);
  if (flat.length === 0) return;

  const focused = getGpFocused();
  const idx = focused ? flat.indexOf(focused) : -1;

  if (idx === -1) {
    setGpFocus(flat[direction === "next" ? 0 : flat.length - 1], onFocus);
    return;
  }

  const next = direction === "next" ? idx + 1 : idx - 1;
  if (next < 0 || next >= flat.length) return; // stop at edges
  setGpFocus(flat[next], onFocus);
}

export function closeModal(): boolean {
  const dialog = document.querySelector<HTMLDialogElement>("dialog[open]");
  if (dialog) { dialog.close(); return true; }
  const modal = document.querySelector(
    '[role="dialog"]:not([aria-hidden="true"]), .wallet-adapter-modal-wrapper',
  );
  if (!modal) return false;
  const btn = modal.querySelector<HTMLElement>(
    'button[aria-label*="lose"], .wallet-adapter-modal-button-close',
  );
  if (btn) { btn.click(); return true; }
  const overlay = modal.querySelector<HTMLElement>(".wallet-adapter-modal-overlay");
  if (overlay) { overlay.click(); return true; }
  return false;
}
