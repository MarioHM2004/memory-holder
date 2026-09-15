"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Closes a popover when the pointer goes down or focus moves anywhere outside
 * `rootRef` — the trigger and the panel should both live inside it. Escape is
 * left to each component, since what gets focus afterwards differs.
 */
export function useDismiss(open: boolean, rootRef: RefObject<HTMLElement | null>, close: () => void) {
  // Kept in a ref so passing an inline arrow doesn't resubscribe every render.
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });

  useEffect(() => {
    if (!open) return;

    function onOutside(e: Event) {
      if (!rootRef.current?.contains(e.target as Node)) closeRef.current();
    }
    document.addEventListener("pointerdown", onOutside);
    // Tabbing out of the panel counts as leaving it.
    document.addEventListener("focusin", onOutside);
    return () => {
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("focusin", onOutside);
    };
  }, [open, rootRef]);
}
