"use client";

import { useSyncExternalStore } from "react";

/** Tailwind's `sm`. Kept here so JS and CSS agree on where the break is. */
const COMPACT_QUERY = "(max-width: 639px)";

/**
 * True on phone-width screens.
 *
 * Only for the few places where a size has to be a number in JavaScript — the
 * timeline positions its nodes with inline `left` values, so it can't express
 * the breakpoint in CSS. Anything that can be done with a Tailwind `sm:` class
 * should be, rather than through this.
 *
 * Read through useSyncExternalStore so the value tracks the media query
 * without mirroring it into state, and so the server render has a defined
 * answer: false, i.e. the desktop layout, which the client corrects on mount.
 */
export function useIsCompact() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia(COMPACT_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(COMPACT_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}
