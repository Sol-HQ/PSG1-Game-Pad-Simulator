"use client";

/**
 * GameApp — root client shell for the PSG1 demo app.
 *
 * This is the standalone version. In the RPS game it wraps the full wallet
 * / ModeGate stack. Here it just mounts the PSG1 hardware polling loop and
 * conditionally loads the simulator overlay when ?gp is in the URL.
 *
 * YOUR INTEGRATION: Copy this pattern into your own app root / layout client.
 *
 *   1. <GameApp> or inline useGamepadPoll() + <GamepadDebugBridge> in your shell
 *   2. .gp-cycleable on nav tabs   → L1 / R1 cycles them
 *   3. .app-shell__main (or custom via configurePsg1) on your scrollable main content
 *   4. Add ?gp to any URL to open the simulator overlay
 */

import { useState } from "react";
import dynamic from "next/dynamic";
import { useGamepadPoll } from "@/hooks/useGamepad";
import { configurePsg1 } from "@/lib/gamepad-nav";

// Zero-cost dynamic imports — neither module is included in the production bundle
// unless the ?gp query param is present (checked at runtime, not build time).
const GamepadDebugBridge = dynamic(() => import("./GamepadDebugBridge"), { ssr: false });
const VirtualKeyboard    = dynamic(() => import("./VirtualKeyboard"),    { ssr: false });

interface GameAppProps {
  children: React.ReactNode;
  /** Override the content zone selector (default: ".app-shell__main"). */
  contentZone?: string;
}

export default function GameApp({ children, contentZone }: GameAppProps) {
  // Wire configurable content zone on first render (stable — no re-render).
  useState(() => {
    if (contentZone) configurePsg1({ contentZone });
  });

  // Mount the hardware polling loop ONCE at the app level.
  useGamepadPoll();

  // Read ?gp once — never changes after initial render.
  const [gpDebug] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("gp"),
  );

  return (
    <>
      {children}
      {gpDebug && (
        <>
          <GamepadDebugBridge />
          <VirtualKeyboard />
        </>
      )}
    </>
  );
}
