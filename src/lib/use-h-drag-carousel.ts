"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Drag-to-pan + arrow-button horizontal carousel with no visible scrollbar,
 * centered on its content at rest. Shared by the timeline and the category
 * bubble canvas.
 */
export function useHDragCarousel(
  wrapRef: RefObject<HTMLDivElement | null>,
  trackRef: RefObject<HTMLDivElement | null>,
  deps: unknown[] = [],
) {
  const bounds = useRef({ min: 0, max: 0, current: 0 });
  const [overflowing, setOverflowing] = useState(false);

  function applyTransform(animated: boolean) {
    const track = trackRef.current;
    if (!track) return;
    track.style.transition = animated ? "transform .45s cubic-bezier(.19,1,.22,1)" : "none";
    track.style.transform = `translateX(${bounds.current.current}px)`;
  }

  function measure() {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;
    // offsetWidth, not scrollWidth: the timeline's cards and date labels are
    // absolutely positioned and overhang the track, and counting them would
    // bias the centering away from the line itself.
    const overshoot = wrap.clientWidth - track.offsetWidth;
    const resting = overshoot / 2;

    if (overshoot < 0) {
      bounds.current.min = overshoot;
      bounds.current.max = 0;
    } else {
      // Fits on screen: pin it centered so a stray drag can't nudge it off.
      bounds.current.min = resting;
      bounds.current.max = resting;
    }

    bounds.current.current = resting;
    setOverflowing(overshoot < 0);
    applyTransform(false);
  }

  useEffect(() => {
    measure();
    const wrap = wrapRef.current;
    if (!wrap) return;

    let dragging = false;
    let dragged = false;
    let startX = 0;
    let startCurrent = 0;

    function onPointerDown(e: PointerEvent) {
      dragging = true;
      dragged = false;
      startX = e.clientX;
      startCurrent = bounds.current.current;
      // Deliberately no setPointerCapture here. Capturing on pointerdown
      // retargets the whole gesture to the wrapper, so the click that follows
      // never reaches the memory button inside the track and a plain click
      // does nothing at all. Capture is taken below, only once the gesture
      // has actually become a drag.
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (!dragged) {
        if (Math.abs(dx) <= 4) return;
        dragged = true;
        wrap!.setPointerCapture(e.pointerId);
      }
      bounds.current.current = Math.max(
        bounds.current.min,
        Math.min(bounds.current.max, startCurrent + dx),
      );
      applyTransform(false);
    }
    function onPointerUp(e: PointerEvent) {
      dragging = false;
      if (wrap!.hasPointerCapture(e.pointerId)) wrap!.releasePointerCapture(e.pointerId);
    }
    function onClickCapture(e: MouseEvent) {
      if (dragged) {
        e.stopPropagation();
        e.preventDefault();
        dragged = false;
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      shift(e.key === "ArrowLeft" ? 1 : -1);
    }

    wrap.addEventListener("pointerdown", onPointerDown);
    wrap.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    wrap.addEventListener("click", onClickCapture, true);
    wrap.addEventListener("keydown", onKeyDown);

    // Measuring once on mount is not enough: inside a flex column the wrapper
    // can still be 0px wide at that point, which centred the track on half of
    // its own width and pushed it off the left edge. Re-measuring whenever
    // either box is actually resized also covers font loading and the window
    // changing size, so the plain resize listener is no longer needed.
    const observer = new ResizeObserver(() => measure());
    observer.observe(wrap);
    if (trackRef.current) observer.observe(trackRef.current);

    return () => {
      wrap.removeEventListener("pointerdown", onPointerDown);
      wrap.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      wrap.removeEventListener("click", onClickCapture, true);
      wrap.removeEventListener("keydown", onKeyDown);
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  function shift(direction: 1 | -1) {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const delta = wrap.clientWidth * 0.55 * direction;
    bounds.current.current = Math.max(
      bounds.current.min,
      Math.min(bounds.current.max, bounds.current.current + delta),
    );
    applyTransform(true);
  }

  return { overflowing, shift, measure };
}
