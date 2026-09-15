"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Drag-to-pan + arrow-button horizontal carousel with no visible scrollbar.
 * Shared by the timeline, the category bubble canvas and the photo filmstrip.
 *
 * `align` decides where an overflowing track rests. The timeline and bubbles
 * sit centred; a filmstrip starts at its first item, since that's the photo
 * on screen when the page opens. Content that fits is centred either way.
 *
 * `followPointer` pans with the mouse: the cursor's position across the
 * wrapper picks the matching position along the track, so the far left shows
 * the start and the far right the end. Touch is unaffected and keeps dragging.
 */
export function useHDragCarousel(
  wrapRef: RefObject<HTMLDivElement | null>,
  trackRef: RefObject<HTMLDivElement | null>,
  deps: unknown[] = [],
  {
    align = "center",
    followPointer = false,
  }: { align?: "center" | "start"; followPointer?: boolean } = {},
) {
  const bounds = useRef({ min: 0, max: 0, current: 0 });
  // Where the pointer wants the track to be. The track eases towards it
  // frame by frame rather than jumping, so it glides behind the cursor. Any
  // other way of moving (drag, wheel, arrows) clears it and takes over.
  const pointerTarget = useRef<number | null>(null);
  const measured = useRef(false);
  const [overflowing, setOverflowing] = useState(false);

  function clamp(x: number) {
    return Math.max(bounds.current.min, Math.min(bounds.current.max, x));
  }

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
    // A resize changes the bounds the pending target was computed from.
    pointerTarget.current = null;
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

    if (overshoot >= 0 || align === "center") {
      bounds.current.current = resting;
    } else {
      // Start-aligned: begin at the first item, and on later re-measures (a
      // window resize, fonts loading) stay where the person had moved to
      // instead of snapping back — they may be several photos in.
      bounds.current.current = measured.current ? clamp(bounds.current.current) : 0;
    }
    measured.current = true;
    setOverflowing(overshoot < 0);
    applyTransform(false);
  }

  useEffect(() => {
    measure();
    const wrap = wrapRef.current;
    if (!wrap) return;

    let dragging = false;
    let frame = 0;
    let dragged = false;
    let startX = 0;
    let startCurrent = 0;

    function onPointerDown(e: PointerEvent) {
      dragging = true;
      dragged = false;
      startX = e.clientX;
      startCurrent = bounds.current.current;
      pointerTarget.current = null;
      // Deliberately no setPointerCapture here. Capturing on pointerdown
      // retargets the whole gesture to the wrapper, so the click that follows
      // never reaches the memory button inside the track and a plain click
      // does nothing at all. Capture is taken below, only once the gesture
      // has actually become a drag.
    }
    function followFrame() {
      const target = pointerTarget.current;
      if (target === null) {
        frame = 0;
        return;
      }
      const gap = target - bounds.current.current;
      bounds.current.current = Math.abs(gap) < 0.5 ? target : bounds.current.current + gap * 0.12;
      applyTransform(false);
      frame = bounds.current.current === target ? 0 : requestAnimationFrame(followFrame);
    }

    function follow(e: PointerEvent) {
      if (!followPointer || e.pointerType !== "mouse" || dragging) return;
      if (bounds.current.min === bounds.current.max) return;
      // Over an open card the track holds still. Otherwise heading for its
      // link would slide the card out from under the cursor.
      if ((e.target as Element).closest("a")) return;

      const rect = wrap!.getBoundingClientRect();
      // A margin at each side where the track is already at its end, so
      // reaching the first or last memory doesn't need the exact edge pixel.
      const margin = Math.min(96, rect.width * 0.15);
      const ratio = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left - margin) / (rect.width - margin * 2)),
      );
      pointerTarget.current = bounds.current.max + (bounds.current.min - bounds.current.max) * ratio;
      if (!frame) frame = requestAnimationFrame(followFrame);
    }

    function onPointerMove(e: PointerEvent) {
      follow(e);
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

    function onWheel(e: WheelEvent) {
      // Nothing to pan: let the page scroll normally.
      if (bounds.current.min === bounds.current.max) return;

      // A two-finger sideways swipe on a trackpad arrives as deltaX. Holding
      // shift with a mouse wheel is the same gesture for people without one.
      const dx = e.deltaX !== 0 ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (dx === 0) return;

      // A diagonal swipe that's mostly vertical is someone scrolling the page,
      // not panning this canvas — don't steal it.
      if (e.deltaX !== 0 && Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;

      e.preventDefault();
      pointerTarget.current = null;
      bounds.current.current = Math.max(
        bounds.current.min,
        Math.min(bounds.current.max, bounds.current.current - dx),
      );
      applyTransform(false);
    }

    wrap.addEventListener("pointerdown", onPointerDown);
    wrap.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    wrap.addEventListener("click", onClickCapture, true);
    wrap.addEventListener("keydown", onKeyDown);
    // Not passive: the handler calls preventDefault to keep a sideways swipe
    // from also scrolling the page behind it.
    wrap.addEventListener("wheel", onWheel, { passive: false });

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
      wrap.removeEventListener("wheel", onWheel);
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  function shift(direction: 1 | -1) {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const delta = wrap.clientWidth * 0.55 * direction;
    pointerTarget.current = null;
    bounds.current.current = Math.max(
      bounds.current.min,
      Math.min(bounds.current.max, bounds.current.current + delta),
    );
    applyTransform(true);
  }

  /**
   * Pans just far enough to bring `el` fully into view, with some breathing
   * room past the arrows. For keeping a selection visible when it's changed
   * from outside the strip — e.g. the filmstrip following prev/next on the
   * main photo. `el` must sit inside a positioned track so offsetLeft is
   * measured from it.
   */
  function reveal(el: HTMLElement | null | undefined) {
    const wrap = wrapRef.current;
    if (!wrap || !el || bounds.current.min === bounds.current.max) return;

    const margin = 52;
    const viewLeft = -bounds.current.current;
    const viewRight = viewLeft + wrap.clientWidth;
    const left = el.offsetLeft;
    const right = left + el.offsetWidth;

    let next = bounds.current.current;
    if (left - margin < viewLeft) next = -(left - margin);
    else if (right + margin > viewRight) next = -(right + margin - wrap.clientWidth);
    if (next === bounds.current.current) return;

    pointerTarget.current = null;
    bounds.current.current = clamp(next);
    applyTransform(true);
  }

  return { overflowing, shift, measure, reveal };
}
