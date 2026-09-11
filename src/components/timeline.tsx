"use client";

import { useRef, useState } from "react";
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

export function Timeline({ memories }: { memories: MemoryWithCover[] }) {
  const t = useTranslations("Timeline");
  const locale = useLocale();
  const tCommon = useTranslations("Common");
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const compact = useIsCompact();
  const step = compact ? STEP.base : STEP.sm;
  const lead = compact ? LEAD.base : LEAD.sm;
  const { overflowing, shift } = useHDragCarousel(wrapRef, trackRef, [memories.length, compact]);

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
          const open = openId === memory.id;
          return (
            // h-0 keeps this box exactly on the line, so the node sits centred
            // on it and the date gets the same clearance above as below.
            <div
              key={memory.id}
              className="absolute top-1/2 h-0"
              style={{ left: `${lead + i * step}px` }}
            >
              {/* The button is a 44px transparent box so it can be tapped with
                  a thumb; the 15px circle inside is what you actually see. */}
              <button
                onClick={() => setOpenId(open ? null : memory.id)}
                aria-label={memory.title}
                aria-expanded={open}
                className="absolute left-0 top-0 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full"
              >
                <span
                  aria-hidden
                  className={`block h-[15px] w-[15px] rounded-full border-2 border-ink transition-transform ${
                    open ? "bg-accent-1" : "bg-surface"
                  }`}
                />
              </button>
              <span
                className={`absolute left-0 -translate-x-1/2 whitespace-nowrap font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted ${
                  up ? "bottom-5" : "top-5"
                }`}
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
