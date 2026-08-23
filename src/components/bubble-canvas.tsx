"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { MemoryWithCover } from "@/lib/data/memories";
import { useHDragCarousel } from "@/lib/use-h-drag-carousel";
import { CarouselArrows } from "@/components/carousel-arrows";

const WASHES = ["var(--wash-1)", "var(--wash-2)", "var(--wash-3)", "var(--wash-4)"];

/** FNV-1a. Stable scatter per memory, so bubbles don't hop around on reload. */
function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function BubbleCanvas({ memories }: { memories: MemoryWithCover[] }) {
  const t = useTranslations("CategoryDetail");
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const { overflowing, shift } = useHDragCarousel(wrapRef, trackRef, [memories.length]);

  // Size, vertical offset and tilt vary so the row reads as things scattered
  // on a page rather than a chart. Derived from a hash of the memory's id
  // rather than its index: index arithmetic put the first few bubbles at
  // nearly the same height, which is exactly the lined-up look we don't want.
  // A given memory always lands in the same spot.
  const bubbles = useMemo(
    () =>
      memories.map((memory, i) => {
        const seed = hash(memory.id);
        return {
          memory,
          size: 84 + (seed % 58),
          // Enough drift to look scattered, bounded so nothing escapes the row.
          offset: ((seed >>> 8) % 97) - 48,
          tilt: (((seed >>> 16) % 9) - 4) / 2,
          wash: WASHES[i % WASHES.length],
        };
      }),
    [memories],
  );

  if (memories.length === 0) {
    return <div className="sketch-soft bg-surface-2 p-10 text-center text-ink-soft">{t("empty")}</div>;
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-4 flex justify-end">
        <div className="sketch-soft-2 flex min-w-[240px] items-center gap-2 bg-surface px-4 py-2">
          <span aria-hidden className="text-muted">
            ⌕
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </div>
      </div>

      {/* Centres the scattered row in whatever height is left on the page. */}
      <div className="flex flex-1 items-center">
        <div
          ref={wrapRef}
          tabIndex={0}
          role="group"
          aria-label={t("eyebrow")}
          // Vertical padding has to clear the ±48px scatter, since the wrapper
          // clips (it hides the panned overflow horizontally).
          className="relative w-full touch-pan-y cursor-grab overflow-hidden py-16 outline-none focus-visible:ring-2 focus-visible:ring-accent-2 active:cursor-grabbing"
        >
          {overflowing && <CarouselArrows onPrev={() => shift(1)} onNext={() => shift(-1)} />}
          {/* w-max so the track's offsetWidth is its real content width, which
              is what the carousel centers on. */}
          <div ref={trackRef} className="flex w-max items-center gap-7 px-14 py-3">
            {bubbles.map(({ memory, size, offset, tilt, wash }) => {
              const dimmed =
                query.length > 0 && !memory.title.toLowerCase().includes(query.toLowerCase());
              return (
                <button
                  key={memory.id}
                  onClick={() => router.push(`/memories/${memory.id}`)}
                  style={{
                    width: size,
                    height: size,
                    marginTop: offset,
                    background: wash,
                    rotate: `${tilt}deg`,
                  }}
                  className={`group relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-ink p-3 text-center font-display font-bold leading-tight text-ink transition-transform hover:-translate-y-1.5 hover:rotate-0 hover:scale-[1.04] ${
                    size > 118 ? "text-lg" : "text-base"
                  } ${dimmed ? "opacity-25 grayscale" : "opacity-100"}`}
                >
                  {memory.coverUrl && (
                    <>
                      <span
                        aria-hidden
                        style={{ backgroundImage: `url("${memory.coverUrl}")` }}
                        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      />
                      {/* Paper scrim so the title stays readable over the photo
                          in either theme. */}
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 bg-surface/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      />
                    </>
                  )}
                  <span className="relative">{memory.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
