"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useTranslations } from "next-intl";
import type { GalleryItem } from "@/lib/data/memories";
import { useHDragCarousel } from "@/lib/use-h-drag-carousel";
import { CarouselArrows } from "@/components/carousel-arrows";

/** How far a finger has to travel sideways on the photo to count as a swipe. */
const SWIPE_PX = 40;

export function MemoryGallery({ media }: { media: GalleryItem[] }) {
  const t = useTranslations("Memory");
  const [selected, setSelected] = useState(0);

  // The thumbnails used to be a vertical column beside the photo. With a lot
  // of photos it grew without limit, and because both sat in one grid row the
  // photo frame stretched to match, leaving a tall blank space under the
  // picture. A single horizontal strip stays the same height however many
  // photos there are, and reuses the drag carousel from the timeline.
  const stripRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const swipeFrom = useRef<number | null>(null);
  const { overflowing, shift, reveal } = useHDragCarousel(stripRef, trackRef, [media.length], {
    align: "start",
  });

  // Stepping through with the arrows can land on a thumbnail that's scrolled
  // out of the strip; pan it back into view.
  useEffect(() => {
    reveal(thumbRefs.current[selected]);
    // reveal is recreated every render; only a change of selection matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  if (media.length === 0) {
    return (
      <div className="sketch-soft flex min-h-[320px] items-center justify-center bg-surface-2">
        <p className="font-display text-xl text-ink-soft">{t("noMedia")}</p>
      </div>
    );
  }

  const count = media.length;
  const active = media[selected];

  // Wraps at both ends: going past the last photo returns to the first, so the
  // buttons never need a disabled state.
  function go(step: 1 | -1) {
    setSelected((i) => (i + step + count) % count);
  }

  function onViewerKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (count < 2 || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    e.preventDefault();
    go(e.key === "ArrowRight" ? 1 : -1);
  }

  // Touch only: a mouse already has the arrows, and dragging an image with a
  // mouse starts the browser's own image drag instead.
  function onViewerPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (count < 2 || e.pointerType === "mouse") return;
    // A video's own controls need the touch — don't turn scrubbing into a swipe.
    if ((e.target as HTMLElement).tagName === "VIDEO") return;
    swipeFrom.current = e.clientX;
  }

  function onViewerPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (swipeFrom.current === null) return;
    const dx = e.clientX - swipeFrom.current;
    swipeFrom.current = null;
    if (Math.abs(dx) >= SWIPE_PX) go(dx < 0 ? 1 : -1);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="polaroid taped" style={{ rotate: "-0.6deg" }}>
        <span className="tape-strip" aria-hidden />

        <div
          tabIndex={count > 1 ? 0 : undefined}
          onKeyDown={onViewerKeyDown}
          onPointerDown={onViewerPointerDown}
          onPointerUp={onViewerPointerUp}
          onPointerCancel={() => (swipeFrom.current = null)}
          // A fixed height rather than min/max: photos come in every aspect
          // ratio, and a frame that resized on each one would make the strip
          // below jump up and down while stepping through them.
          // touch-pan-y hands vertical scrolling to the page and keeps the
          // sideways gesture for the swipe.
          className="canvas-focus relative flex h-[300px] touch-pan-y items-center justify-center border border-ink/20 bg-ground-2 sm:h-[440px]"
        >
          {active.url ? (
            active.media_type === "video" ? (
              <video key={active.id} src={active.url} controls className="h-full w-full object-contain" />
            ) : (
              // No key here, unlike the video: swapping src on the same <img>
              // keeps the previous photo on screen until the next one has
              // loaded, instead of flashing an empty frame between them.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={active.url}
                alt=""
                draggable={false}
                // The selected shot is the point of the page, so it loads
                // eagerly and decodes off the main thread.
                decoding="async"
                fetchPriority="high"
                className="h-full w-full select-none object-contain"
              />
            )
          ) : (
            <p className="text-ink-soft">{t("mediaUnavailable")}</p>
          )}

          {count > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label={t("previousPhoto")}
                className="btn-circle absolute left-2 top-1/2 h-10 w-10 -translate-y-1/2 bg-surface/90 text-base sm:left-3 sm:h-11 sm:w-11 sm:text-lg"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label={t("nextPhoto")}
                className="btn-circle absolute right-2 top-1/2 h-10 w-10 -translate-y-1/2 bg-surface/90 text-base sm:right-3 sm:h-11 sm:w-11 sm:text-lg"
              >
                →
              </button>
            </>
          )}
        </div>

        {/* Written into the polaroid's wide bottom margin, where you'd pencil
            a note on a real print. */}
        {count > 1 && (
          <span
            aria-live="polite"
            className="absolute bottom-1.5 right-3 font-mono text-[0.68rem] tracking-[0.14em] text-muted tabular-nums"
          >
            {selected + 1} / {count}
          </span>
        )}
      </div>

      {count > 1 && (
        <div
          ref={stripRef}
          tabIndex={0}
          role="group"
          aria-label={t("photoStrip")}
          className="canvas-focus relative w-full cursor-grab touch-pan-y overflow-hidden active:cursor-grabbing"
        >
          {overflowing && <CarouselArrows onPrev={() => shift(1)} onNext={() => shift(-1)} />}
          {/* relative so each thumbnail's offsetLeft is measured from the
              track — reveal() depends on it. Vertical padding leaves room for
              the tilted thumbnails, which the wrapper would otherwise clip. */}
          <div ref={trackRef} className="relative flex w-max gap-3 px-10 py-3 sm:px-12">
            {media.map((item, i) => (
              <button
                key={item.id}
                ref={(el) => {
                  thumbRefs.current[i] = el;
                }}
                type="button"
                onClick={() => setSelected(i)}
                aria-current={i === selected}
                style={{ rotate: `${i % 2 === 0 ? 1.2 : -1.4}deg` }}
                className={`shrink-0 border-2 bg-surface p-1.5 pb-4 transition-transform ${
                  i === selected ? "border-ink" : "border-transparent"
                }`}
              >
                {item.thumbUrl && item.media_type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className="h-16 w-16 border border-ink/20 object-cover sm:h-20 sm:w-20"
                  />
                ) : (
                  <span className="flex h-16 w-16 items-center justify-center bg-ground-2 text-sm sm:h-20 sm:w-20">
                    ▶
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
