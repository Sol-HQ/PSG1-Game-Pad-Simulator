"use client";

import { useEffect, useRef } from "react";
import {
  installPsg1Mapper,
  registerPsg1Callback,
  unregisterPsg1Callback,
  type Psg1Mapping,
} from "../lib/psg1-mapper";

/**
 * useGamepadMapper — React hook that installs a PSG1 action mapper.
 *
 * Installs the mapper on mount and automatically uninstalls it on unmount.
 * Re-installs whenever the mapping identity changes (shallow reference check).
 *
 * @example
 * // Define the mapping outside the component (or with useMemo) to avoid
 * // unnecessary reinstalls on every render.
 * const MAPPING: Psg1Mapping = {
 *   version: "1",
 *   name: "My Game",
 *   actions: {
 *     confirm: { type: "custom-event", event: "game:confirm" },
 *     back:    { type: "callback",     callbackId: "goBack"  },
 *     start:   { type: "dom-click",    selector:   "#pause-menu" },
 *   },
 * };
 *
 * function MyGameRoot() {
 *   useGamepadMapper(MAPPING);
 *   return <Game />;
 * }
 */
export function useGamepadMapper(mapping: Psg1Mapping) {
  useEffect(() => {
    const uninstall = installPsg1Mapper(mapping);
    return uninstall;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapping]);
}

/**
 * useGamepadCallbacks — register named callbacks that { type: "callback" }
 * adapters can reference. Auto-deregisters on unmount.
 *
 * Call this BEFORE useGamepadMapper() in the same component (or a parent).
 *
 * @example
 * useGamepadCallbacks({
 *   goBack:      () => router.back(),
 *   openShop:    () => setShopOpen(true),
 *   togglePause: () => setPaused((p) => !p),
 * });
 */
export function useGamepadCallbacks(
  callbacks: Record<string, () => void>,
) {
  // Stable ref for the object so we only re-register when the reference changes.
  const ref = useRef(callbacks);
  ref.current = callbacks;

  useEffect(() => {
    const ids = Object.keys(ref.current);
    for (const id of ids) {
      registerPsg1Callback(id, ref.current[id]);
    }
    return () => {
      for (const id of ids) {
        unregisterPsg1Callback(id);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
