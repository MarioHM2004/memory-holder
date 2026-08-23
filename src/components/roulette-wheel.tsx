"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { MemoryWithCover } from "@/lib/data/memories";
import { formatDate } from "@/lib/format";
import { mediaUrl } from "@/lib/media-url";

// Dedicated wheel tones, not the paper washes: those are meant to sit behind
// text and disappeared as segments on a white panel.
const WEDGE_COLORS = ["var(--wheel-1)", "var(--wheel-2)", "var(--wheel-3)", "var(--wheel-4)"];
const SPIN_MS = 2450;

export function RouletteWheel({ memories }: { memories: MemoryWithCover[] }) {
  const t = useTranslations("Roulette");
  const tCommon = useTranslations("Common");
  const [rotation, setRotation] = useState(0);
  const [landedIndex, setLandedIndex] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);

  if (memories.length === 0) {
    return (
      <div className="sketch-soft bg-surface-2 p-10 text-center text-ink-soft">
        <p>{t("empty")}</p>
        <p className="mt-1 text-sm">{t("emptyHint")}</p>
        <Link href="/admin" className="mt-4 inline-block font-display text-lg font-bold text-ink underline decoration-accent-1 decoration-2 underline-offset-4">
          {tCommon("goToAdmin")}
        </Link>
      </div>
    );
  }

  const segment = 360 / memories.length;
  // A hairline of ink closes each wedge. With a full roulette the slices get
  // thin and neighbours of a similar tone blur into one another; the rule
  // keeps them countable. Capped so it never dominates a narrow slice.
  const rule = Math.min(0.6, segment * 0.06);
  const gradient = memories
    .flatMap((_, i) => {
      const start = i * segment;
      const end = (i + 1) * segment;
      return [
        `${WEDGE_COLORS[i % WEDGE_COLORS.length]} ${start}deg ${end - rule}deg`,
        `var(--ink) ${end - rule}deg ${end}deg`,
      ];
    })
    .join(", ");
  const landed = landedIndex !== null ? memories[landedIndex] : null;

  function spin() {
    if (spinning) return;
    setSpinning(true);
    setLandedIndex(null);
    const targetIndex = Math.floor(Math.random() * memories.length);
    setRotation((prev) => {
      const current = prev % 360;
      return (
        prev + 360 * 4 + ((360 - current) % 360) + (360 - (targetIndex * segment + segment / 2))
      );
    });
    window.setTimeout(() => {
      setLandedIndex(targetIndex);
      setSpinning(false);
    }, SPIN_MS);
  }

  return (
    <div className="grid items-start gap-12 sm:grid-cols-[auto_1fr]">
      <div className="flex flex-col items-center gap-6">
        <div className="relative h-64 w-64">
          <div
            className="absolute -top-1 left-1/2 z-10 h-0 w-0 -translate-x-1/2 border-x-[9px] border-t-[18px] border-x-transparent border-t-ink"
            aria-hidden
          />
          <div
            className="h-full w-full rounded-full border-2 border-ink"
            style={{
              background: `conic-gradient(${gradient})`,
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? "transform 2.4s cubic-bezier(.14,.72,.13,1)" : "none",
            }}
          />
          <button
            onClick={spin}
            disabled={spinning}
            className="absolute left-1/2 top-1/2 h-[86px] w-[86px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-surface font-display text-xl font-bold text-ink transition-transform hover:rotate-[-3deg] disabled:opacity-70"
          >
            {spinning ? t("spinning") : t("spin")}
          </button>
        </div>

        {/* Capped and scrollable: with a full roulette this list ran far
            past the fold and pushed everything else down. */}
        <ul className="flex max-h-64 w-64 flex-col gap-1 overflow-y-auto pr-1">
          {memories.map((memory, i) => (
            <li
              key={memory.id}
              className={`flex items-center gap-2.5 px-1 py-0.5 text-sm ${
                landedIndex === i ? "font-bold text-ink" : "text-ink-soft"
              }`}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full border border-ink"
                style={{ background: WEDGE_COLORS[i % WEDGE_COLORS.length] }}
                aria-hidden
              />
              <span className={landedIndex === i ? "highlighted" : undefined}>{memory.title}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="sketch-soft-2 relative flex min-h-[300px] flex-col justify-center gap-3 overflow-hidden bg-surface-2 p-8">
        {landed?.coverMediaId && (
          <>
            {/* One of the memory's own photos behind the text. The preview
                copy rather than the thumbnail: at only 3px of blur a 400px
                thumbnail stretched across this card reads as pixelated, and
                there's no longer enough softening to hide it. scale-105 keeps
                the blur's soft edge out of frame. */}
            <span
              aria-hidden
              key={landed.id}
              style={{ backgroundImage: `url("${mediaUrl(landed.coverMediaId, "preview")}")` }}
              className="pointer-events-none absolute inset-0 scale-105 bg-cover bg-center blur-[3px]"
            />
            {/* Veil graded left-to-right instead of a flat wash: the copy sits
                on the left, so it keeps its backing while the photo stays
                genuinely visible on the right. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-surface-2/95 via-surface-2/70 to-surface-2/20"
            />
          </>
        )}

        {landed ? (
          <div className="relative flex flex-col gap-3">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-accent-1">
              {formatDate(landed.memory_date)}
            </p>
            <h3 className="font-display text-3xl font-bold leading-none">{landed.title}</h3>
            <p className="text-sm text-ink-soft">{landed.description}</p>
            <Link href={`/memories/${landed.id}`} className="btn-ink mt-3 w-fit no-underline">
              {t("viewFull")}
            </Link>
          </div>
        ) : (
          <p className="text-center font-display text-xl text-ink-soft">{t("prompt")}</p>
        )}
      </div>
    </div>
  );
}
