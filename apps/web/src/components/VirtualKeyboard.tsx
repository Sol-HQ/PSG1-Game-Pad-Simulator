"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ── Layouts ──────────────────────────────────────────────────── */

const QWERTY: string[][] = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", "'"],
  ["Z", "X", "C", "V", "B", "N", "M", ".", "-", "_"],
  ["SPACE", "⌫", "✓ DONE"],
];

const NUMPAD: string[][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "⌫"],
  ["✓ DONE"],
];

/** True if the target input should get the numeric keypad. */
function isNumericInput(el: HTMLInputElement | HTMLTextAreaElement): boolean {
  if (el instanceof HTMLTextAreaElement) return false;
  const mode = el.inputMode?.toLowerCase() ?? "";
  const type = el.type?.toLowerCase() ?? "";
  return mode === "decimal" || mode === "numeric" || type === "number";
}

/* ── Native setter trick for React controlled inputs ─────────── */
const inputSetter =
  typeof HTMLInputElement !== "undefined"
    ? Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
    : undefined;
const textareaSetter =
  typeof HTMLTextAreaElement !== "undefined"
    ? Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set
    : undefined;

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, v: string) {
  const setter = el instanceof HTMLTextAreaElement ? textareaSetter : inputSetter;
  setter?.call(el, v);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

/* ── Module-level state ──────────────────────────────────────── */
let _target: HTMLInputElement | HTMLTextAreaElement | null = null;
let _open = false;
type Listener = (el: HTMLInputElement | HTMLTextAreaElement | null) => void;
const _listeners = new Set<Listener>();

/** Open the virtual keyboard targeting a specific input. */
export function openVirtualKeyboard(el: HTMLInputElement | HTMLTextAreaElement) {
  _target = el;
  _open = true;
  el.blur(); // remove browser focus so keystrokes don't double-enter
  for (const fn of _listeners) fn(el);
}

/** Close the virtual keyboard and resume normal navigation. */
export function closeVirtualKeyboard() {
  _target = null;
  _open = false;
  for (const fn of _listeners) fn(null);
}

/** Check whether the VK is currently shown. */
export function isVirtualKeyboardOpen() {
  return _open;
}

/**
 * Route a gamepad button id to the VK.
 * Used by both the keyboard bridge and the hardware polling loop.
 */
export function dispatchVkAction(id: string) {
  switch (id) {
    case "up":
    case "down":
    case "left":
    case "right":
      window.dispatchEvent(new CustomEvent("vk-nav", { detail: id }));
      break;
    case "a":
      window.dispatchEvent(new Event("vk-select"));
      break;
    case "b":
      window.dispatchEvent(new Event("vk-back"));
      break;
    case "y":
    case "start":
      window.dispatchEvent(new Event("vk-confirm"));
      break;
    // Other buttons are ignored while VK is open
  }
}

/* ── Component ───────────────────────────────────────────────── */

export default function VirtualKeyboard() {
  const [target, setTarget] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [row, setRow] = useState(0);
  const [col, setCol] = useState(0);
  const [value, setValue] = useState("");
  const [layout, setLayout] = useState<string[][]>(QWERTY);

  // Refs to avoid stale closures in event handlers
  const rowRef = useRef(0);
  const colRef = useRef(0);
  const valueRef = useRef("");
  const layoutRef = useRef<string[][]>(QWERTY);
  useEffect(() => { rowRef.current = row; }, [row]);
  useEffect(() => { colRef.current = col; }, [col]);
  useEffect(() => { valueRef.current = value; }, [value]);
  useEffect(() => { layoutRef.current = layout; }, [layout]);

  // Subscribe to open/close
  useEffect(() => {
    const handler: Listener = (el) => {
      setTarget(el);
      if (el) {
        const v = el.value;
        setValue(v);
        valueRef.current = v;
        const rows = isNumericInput(el) ? NUMPAD : QWERTY;
        setLayout(rows);
        layoutRef.current = rows;
        setRow(0);
        setCol(0);
        rowRef.current = 0;
        colRef.current = 0;
      }
    };
    _listeners.add(handler);
    return () => { _listeners.delete(handler); };
  }, []);

  /** Push a new value to both React state and the DOM element. */
  const pushValue = useCallback((v: string) => {
    setValue(v);
    valueRef.current = v;
    if (_target) setNativeValue(_target, v);
  }, []);

  const typeChar = useCallback(
    (char: string) => {
      const maxLen = _target?.maxLength ?? -1;
      const max = maxLen > 0 ? maxLen : 9999;
      if (valueRef.current.length >= max) return;
      pushValue(valueRef.current + char.toLowerCase());
    },
    [pushValue],
  );

  const backspace = useCallback(() => {
    pushValue(valueRef.current.slice(0, -1));
  }, [pushValue]);

  const confirm = useCallback(() => {
    closeVirtualKeyboard();
  }, []);

  // Listen for VK window-events dispatched by the gamepad system
  useEffect(() => {
    if (!target) return;

    const onNav = (e: Event) => {
      const dir = (e as CustomEvent<string>).detail;
      const L = layoutRef.current;
      const r = rowRef.current;
      const c = colRef.current;
      let nr = r;
      let nc = c;
      if (dir === "up") nr = Math.max(0, r - 1);
      if (dir === "down") nr = Math.min(L.length - 1, r + 1);
      if (dir === "left") nc = Math.max(0, c - 1);
      if (dir === "right") nc = c + 1;
      nc = Math.min(nc, L[nr].length - 1);
      setRow(nr);
      setCol(nc);
      rowRef.current = nr;
      colRef.current = nc;
    };

    const onSelect = () => {
      const key = layoutRef.current[rowRef.current]?.[colRef.current];
      if (!key) return;
      if (key === "SPACE") typeChar(" ");
      else if (key === "⌫") backspace();
      else if (key === "✓ DONE") confirm();
      else typeChar(key);
    };

    const onBack = () => backspace();
    const onConfirm = () => confirm();

    window.addEventListener("vk-nav", onNav);
    window.addEventListener("vk-select", onSelect);
    window.addEventListener("vk-back", onBack);
    window.addEventListener("vk-confirm", onConfirm);
    return () => {
      window.removeEventListener("vk-nav", onNav);
      window.removeEventListener("vk-select", onSelect);
      window.removeEventListener("vk-back", onBack);
      window.removeEventListener("vk-confirm", onConfirm);
    };
  }, [target, typeChar, backspace, confirm]);

  if (!target) return null;

  return (
    <div className={`vk-overlay${layout === NUMPAD ? " vk-overlay--numpad" : ""}`} aria-label="Virtual Keyboard">
      <div className={`vk-keyboard${layout === NUMPAD ? " vk-keyboard--numpad" : ""}`}>
        {/* Live preview of current value */}
        <div className="vk-preview">
          <span className="vk-preview__text">{value}</span>
          <span className="vk-cursor">|</span>
        </div>

        {/* Character grid */}
        {layout.map((keys, ri) => (
          <div className="vk-row" key={ri}>
            {keys.map((key, ci) => {
              const active = ri === row && ci === col;
              const display =
                key === "SPACE"
                  ? "␣ SPACE"
                  : key.length === 1 && /[A-Z]/.test(key)
                    ? key.toLowerCase()
                    : key;
              return (
                <button
                  key={key}
                  className={`vk-key${active ? " vk-key--active" : ""}${key.length > 1 ? " vk-key--wide" : ""}`}
                  tabIndex={-1}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setRow(ri);
                    setCol(ci);
                    rowRef.current = ri;
                    colRef.current = ci;
                    if (key === "SPACE") typeChar(" ");
                    else if (key === "⌫") backspace();
                    else if (key === "✓ DONE") confirm();
                    else typeChar(key);
                  }}
                >
                  {display}
                </button>
              );
            })}
          </div>
        ))}

        {/* Button hints */}
        <div className="vk-hints">
          D-Pad navigate · A type · B backspace · Y done
        </div>
      </div>
    </div>
  );
}
