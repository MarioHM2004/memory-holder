"use client";

import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { MemoryWithCover } from "@/lib/data/memories";
import { formatDate } from "@/lib/format";
import { mediaUrl } from "@/lib/media-url";
import { useHDragCarousel } from "@/lib/use-h-drag-carousel";
import { CarouselArrows } from "@/components/carousel-arrows";
import { useIsCompact } from "@/lib/use-is-compact";

// Desktop spacing. On a phone both shrink: a 240px card centred on a node
// needs more room than a 375px screen has, so the card narrows and the
// spacing follows it.
const STEP = { base: 132, sm: 180 };
// Half a card plus a little, so end cards stay inside the track.
const LEAD = { base: 96, sm: 130 };
// How long after a hover has toggled a card further hovers on the same node
// are ignored. The nodes keep moving after the cursor stops, so the edge of
// one can slip out and back in under a still pointer, which would close the
// card it just opened.
const HOVER_SETTLE_MS = 450;
// Dock-style magnification, as in the macOS Dock: nodes within this many
// pixels of the cursor grow, the nearest the most…
const MAG_RADIUS = 170;
// …and everything beyond that reach is pushed this far aside to make room.
const MAG_SPREAD = 22;

export function Timeline({ memories }: { memories: MemoryWithCover[] }) {
  const t = useTranslations("Timeline");
  const locale = useLocale();
  const tCommon = useTranslations("Common");
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const compact = useIsCompact();
  const step = compact ? STEP.base : STEP.sm;
  const lead = compact ? LEAD.base : LEAD.sm;
  const { overflowing, shift } = useHDragCarousel(wrapRef, trackRef, [memories.length, compact], {
    followPointer: true,
  });
  const lastToggle = useRef({ id: "", at: 0 });
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Written every frame, so kept out of React state: re-rendering the whole
  // timeline 60 times a second would be far heavier than setting a few styles.
  // strength fades the effect in when the cursor arrives and out when it
  // leaves, instead of snapping.
  const dock = useRef({ x: 0, inside: false, frozen: false, strength: 0, frame: 0 });

  useEffect(() => {
    const state = dock.current;
    return () => cancelAnimationFrame(state.frame);
  }, []);

  // Cards open independently. Hovering a node opens its card, and it stays
  // open until that same node is hovered again.
  function toggle(id: string) {
    setOpenIds((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  function onNodeEnter(e: PointerEvent<HTMLButtonElement>, id: string) {
    if (e.pointerType !== "mouse") return;
    // The event's own timestamp rather than performance.now(): same clock,
    // and it keeps this handler free of impure calls.
    const last = lastToggle.current;
    if (last.id === id && e.timeStamp - last.at < HOVER_SETTLE_MS) return;
    lastToggle.current = { id, at: e.timeStamp };
    toggle(id);
  }

  // Touch screens and the keyboard still open a card by pressing the node.
  // A mouse has already toggled it on the way in, so its click is ignored —
  // otherwise clicking a card open by hover would close it again.
  function onNodeClick(e: MouseEvent<HTMLButtonElement>, id: string) {
    const pointerType = (e.nativeEvent as globalThis.PointerEvent).pointerType;
    if (pointerType === "mouse") return;
    toggle(id);
  }

  function paintDock() {
    const state = dock.current;
    state.frame = 0;
    const track = trackRef.current;
    if (!track) return;

    state.strength += ((state.inside ? 1 : 0) - state.strength) * 0.18;
    if (!state.inside && state.strength < 0.01) state.strength = 0;

    // Positions come from the layout maths plus the track's own offset, not
    // from measuring each node: the nodes are the thing being moved, and
    // measuring them would feed each frame's push back into the next.
    if (!state.frozen) {
      const trackLeft = track.getBoundingClientRect().left;
      nodeRefs.current.forEach((node, i) => {
        if (!node) return;
        const distance = state.x - (trackLeft + lead + i * step);
        const reach = Math.min(Math.abs(distance), MAG_RADIUS) / MAG_RADIUS;
        // 1 right under the cursor, easing to 0 at the edge of the reach.
        const near = (1 + Math.cos(Math.PI * reach)) / 2;
        const push = -Math.sign(distance) * MAG_SPREAD * (1 - near);
        node.style.setProperty("--mag", (near * state.strength).toFixed(3));
        node.style.translate = `${(push * state.strength).toFixed(1)}px 0`;
      });
    }

    // Runs every frame while the cursor is inside, not only on pointer
    // moves: the track keeps gliding after the cursor stops, which changes
    // which nodes are under it.
    if (state.inside || state.strength > 0) state.frame = requestAnimationFrame(paintDock);
  }

  function onWrapPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    const state = dock.current;
    state.x = e.clientX;
    state.inside = true;
    // Over an open card, hold everything still — the push would otherwise
    // nudge the card sideways while someone is reaching for it.
    state.frozen = Boolean((e.target as Element).closest("a"));
    if (!state.frame) state.frame = requestAnimationFrame(paintDock);
  }

  function onWrapPointerLeave() {
    const state = dock.current;
    state.inside = false;
    state.frozen = false;
    if (!state.frame) state.frame = requestAnimationFrame(paintDock);
  }

  if (memories.length === 0) {
    return (
      <div className="sketch-soft mt-8 bg-surface-2 p-10 text-center text-ink-soft">
        <p>{t("empty")}</p>
        <p className="mt-1 text-sm">{t("emptyHint")}</p>
        <Link
          href="/admin"
          className="mt-4 inline-block font-display text-lg font-bold text-ink underline decoration-accent-1 decoration-2 underline-offset-4"
        >
          {tCommon("goToAdmin")}
        </Link>
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      tabIndex={0}
      role="group"
      aria-label={t("heading")}
      onPointerMove={onWrapPointerMove}
      onPointerLeave={onWrapPointerLeave}
      // overflow-hidden clips both axes (CSS won't let one be visible while
      // the other is hidden), so the vertical padding has to be deep enough
      // to hold a fully expanded card above and below the line — otherwise
      // the card gets cut off instead of overflowing. ~250px of card plus the
      // 44px it sits off the line.
      // w-full matters: as a flex child this would otherwise shrink to the
      // track's own width, and everything hanging off the nodes (cards, date
      // labels) would be clipped by overflow-hidden.
      className="relative w-full touch-pan-y cursor-grab overflow-hidden py-[280px] sm:py-[300px] canvas-focus active:cursor-grabbing"
    >
      {overflowing && <CarouselArrows onPrev={() => shift(1)} onNext={() => shift(-1)} />}
      <div
        ref={trackRef}
        className="drawn-rule relative h-2"
        style={{ width: `${lead * 2 + (memories.length - 1) * step}px` }}
      >
        {memories.map((memory, i) => {
          const up = i % 2 === 0;
          const open = openIds.has(memory.id);
          return (
            // h-0 keeps this box exactly on the line, so the node sits centred
            // on it and the date gets the same clearance above as below.
            // --mag (0–1) and translate are set per frame by paintDock.
            <div
              key={memory.id}
              ref={(el) => {
                nodeRefs.current[i] = el;
              }}
              className="absolute top-1/2 h-0"
              style={{ left: `${lead + i * step}px` }}
            >
              {/* The button is a 44px transparent box so it can be tapped with
                  a thumb; the circle inside is what you actually see. */}
              <button
                onPointerEnter={(e) => onNodeEnter(e, memory.id)}
                onClick={(e) => onNodeClick(e, memory.id)}
                aria-label={memory.title}
                aria-expanded={open}
                className="absolute left-0 top-0 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full"
              >
                {/* Grows through width and height rather than scale, so the
                    drawn border stays 2px instead of thickening with it. At
                    full size it's 33px, still inside the 44px button. */}
                <span
                  aria-hidden
                  className={`block rounded-full border-2 border-ink transition-colors ${
                    open ? "bg-accent-1" : ""
                  }`}
                  style={{
                    width: "calc(15px + var(--mag, 0) * 18px)",
                    height: "calc(15px + var(--mag, 0) * 18px)",
                    backgroundColor: open
                      ? undefined
                      : "color-mix(in oklab, var(--color-accent-2) calc(var(--mag, 0) * 100%), var(--color-surface))",
                  }}
                />
              </button>
              <span
                className={`absolute left-0 -translate-x-1/2 whitespace-nowrap font-mono text-[0.62rem] uppercase tracking-[0.14em] ${
                  up ? "bottom-5 origin-bottom" : "top-5 origin-top"
                }`}
                // Lifts away from the growing circle so the two never overlap,
                // and darkens from muted to ink as it comes into focus.
                style={{
                  transform: `translateY(calc(var(--mag, 0) * ${up ? -9 : 9}px)) scale(calc(1 + var(--mag, 0) * 0.3))`,
                  color: "color-mix(in oklab, var(--color-ink) calc(var(--mag, 0) * 100%), var(--color-muted))",
                }}
              >
                {formatDate(memory.memory_date, locale)}
              </span>
              {/* The whole card is the link — expanding it is the first tap,
                  going to the memory is the second, anywhere on the card. */}
              <Link
                href={`/memories/${memory.id}`}
                tabIndex={open ? undefined : -1}
                aria-hidden={!open}
                className={`sketch-soft absolute left-0 block w-48 -translate-x-1/2 bg-surface p-3 transition-opacity hover:-rotate-[0.4deg] sm:w-60 sm:p-4 ${
                  up ? "bottom-11" : "top-11"
                } ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
              >
                {memory.coverMediaId && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaUrl(memory.coverMediaId, "thumb")}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="mb-2.5 h-16 w-full border border-ink/25 object-cover sm:h-24"
                  />
                )}
                <h4 className="font-display text-lg font-bold leading-tight sm:text-xl">{memory.title}</h4>
                <p className="mt-1 line-clamp-3 text-xs text-ink-soft">{memory.description}</p>
                <span className="mt-2.5 inline-block font-mono text-[0.62rem] uppercase tracking-[0.16em] text-accent-1">
                  {t("viewFull")} →
                </span>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
