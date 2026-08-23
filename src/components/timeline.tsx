"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { MemoryWithCover } from "@/lib/data/memories";
import { formatDate } from "@/lib/format";
import { useHDragCarousel } from "@/lib/use-h-drag-carousel";
import { CarouselArrows } from "@/components/carousel-arrows";

const STEP = 180;
// Half a card (w-60) plus a little, so end cards stay inside the track.
const LEAD = 130;

export function Timeline({ memories }: { memories: MemoryWithCover[] }) {
  const t = useTranslations("Timeline");
  const tCommon = useTranslations("Common");
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const { overflowing, shift } = useHDragCarousel(wrapRef, trackRef, [memories.length]);

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
      // overflow-hidden clips both axes (CSS won't let one be visible while
      // the other is hidden), so the vertical padding has to be deep enough
      // to hold a fully expanded card above and below the line — otherwise
      // the card gets cut off instead of overflowing. ~250px of card plus the
      // 44px it sits off the line.
      // w-full matters: as a flex child this would otherwise shrink to the
      // track's own width, and everything hanging off the nodes (cards, date
      // labels) would be clipped by overflow-hidden.
      className="relative w-full touch-pan-y cursor-grab overflow-hidden py-[300px] outline-none focus-visible:ring-2 focus-visible:ring-accent-2 active:cursor-grabbing"
    >
      {overflowing && <CarouselArrows onPrev={() => shift(1)} onNext={() => shift(-1)} />}
      <div
        ref={trackRef}
        className="drawn-rule relative h-2"
        style={{ width: `${LEAD * 2 + (memories.length - 1) * STEP}px` }}
      >
        {memories.map((memory, i) => {
          const up = i % 2 === 0;
          const open = openId === memory.id;
          return (
            // h-0 keeps this box exactly on the line, so the node sits centred
            // on it and the date gets the same clearance above as below.
            <div
              key={memory.id}
              className="absolute top-1/2 h-0"
              style={{ left: `${LEAD + i * STEP}px` }}
            >
              <button
                onClick={() => setOpenId(open ? null : memory.id)}
                aria-label={memory.title}
                aria-expanded={open}
                className={`absolute left-0 top-0 h-[15px] w-[15px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink transition-transform hover:scale-125 ${
                  open ? "bg-accent-1" : "bg-surface"
                }`}
              />
              <span
                className={`absolute left-0 -translate-x-1/2 whitespace-nowrap font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted ${
                  up ? "bottom-5" : "top-5"
                }`}
              >
                {formatDate(memory.memory_date)}
              </span>
              {/* The whole card is the link — expanding it is the first tap,
                  going to the memory is the second, anywhere on the card. */}
              <Link
                href={`/memories/${memory.id}`}
                tabIndex={open ? undefined : -1}
                aria-hidden={!open}
                className={`sketch-soft absolute left-0 block w-60 -translate-x-1/2 bg-surface p-4 transition-opacity hover:-rotate-[0.4deg] ${
                  up ? "bottom-11" : "top-11"
                } ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
              >
                {memory.coverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={memory.coverUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="mb-2.5 h-24 w-full border border-ink/25 object-cover"
                  />
                )}
                <h4 className="font-display text-xl font-bold leading-tight">{memory.title}</h4>
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
