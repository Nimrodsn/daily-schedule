"use client";

import { useRef, useState } from "react";

export type SwipeDirection = "start" | "end";

/** Short buzz for a committed gesture. Silently ignored where unsupported. */
export function vibrate(pattern: number | number[] = 12): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

/** Set once the gesture is known to be horizontal, so it is render state. */
type Drag = {
  /** Screen-space pixels, which is what a CSS transform needs. */
  deltaX: number;
  rtl: boolean;
};

/**
 * Horizontal drag on a row, reported in logical terms so RTL behaves the same
 * as LTR: "end" is a drag toward the end of the line, "start" toward its
 * beginning. Vertical drags are released back to the page so the list can
 * still scroll.
 */
export function useSwipe({
  threshold = 72,
  onSwipe,
}: {
  threshold?: number;
  onSwipe: (direction: SwipeDirection) => void;
}) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const start = useRef<{ x: number; y: number; rtl: boolean } | null>(null);
  const axis = useRef<"undecided" | "horizontal" | "vertical">("undecided");

  function reset() {
    start.current = null;
    axis.current = "undecided";
    setDrag(null);
  }

  const deltaX = drag?.deltaX ?? 0;
  const offset = drag && drag.rtl ? -deltaX : deltaX;

  return {
    /** Signed pixels toward the end of the line, for choosing the action. */
    offset,
    /** Signed pixels in screen space, for the transform. */
    deltaX,
    swiping: drag !== null,
    handlers: {
      onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        axis.current = "undecided";
        start.current = {
          x: event.clientX,
          y: event.clientY,
          rtl: getComputedStyle(event.currentTarget).direction === "rtl",
        };
      },
      onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
        const origin = start.current;
        if (!origin) return;

        const dx = event.clientX - origin.x;
        const dy = event.clientY - origin.y;

        if (axis.current === "undecided") {
          if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
          axis.current = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
          if (axis.current === "horizontal") {
            event.currentTarget.setPointerCapture(event.pointerId);
          }
        }

        if (axis.current !== "horizontal") return;
        setDrag({ deltaX: dx, rtl: origin.rtl });
      },
      onPointerUp: () => {
        if (drag !== null && Math.abs(offset) >= threshold) {
          vibrate();
          onSwipe(offset > 0 ? "end" : "start");
        }
        reset();
      },
      onPointerCancel: reset,
    },
  };
}
