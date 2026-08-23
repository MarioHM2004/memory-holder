"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { MemoryWithCover } from "@/lib/data/memories";
import { formatDate } from "@/lib/format";

// Paper washes rather than saturated colour: the wheel is a drawn object.
const WEDGE_COLORS = ["var(--wash-1)", "var(--wash-2)", "var(--wash-3)", "var(--wash-4)"];
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
  const gradient = memories
    .map(
      (_, i) => `${WEDGE_COLORS[i % WEDGE_COLORS.length]} ${i * segment}deg ${(i + 1) * segment}deg`,
    )
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
    <div className="grid items-center gap-12 sm:grid-cols-[auto_1fr]">
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

        <ul className="flex w-64 flex-col gap-1">
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
        {landed?.coverUrl && (
          <>
            {/* One of the memory's own photos, blown up and blurred behind the
                text. scale-110 pushes the blur's soft edge out of frame. */}
            <span
              aria-hidden
              key={landed.id}
              style={{ backgroundImage: `url("${landed.coverUrl}")` }}
              className="pointer-events-none absolute inset-0 scale-110 bg-cover bg-center blur-[10px]"
            />
            {/* Paper veil: keeps the copy readable whichever photo comes up. */}
            <span aria-hidden className="pointer-events-none absolute inset-0 bg-surface-2/80" />
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
