"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * A ticking clock for the now-line and overdue markers.
 *
 * Null until hydration finishes: the server has no idea what time it is on the
 * device, so anything time-dependent has to wait for the client. The snapshot
 * is quantised to the tick length to keep it referentially stable between
 * renders, which useSyncExternalStore requires.
 */
export function useNow(intervalMs = 30_000): Date | null {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const timer = setInterval(onChange, intervalMs);
      return () => clearInterval(timer);
    },
    [intervalMs],
  );

  const timestamp = useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
    () => null,
  );

  return timestamp === null ? null : new Date(timestamp);
}
