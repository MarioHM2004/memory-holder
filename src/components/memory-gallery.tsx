"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { GalleryItem } from "@/lib/data/memories";

export function MemoryGallery({ media }: { media: GalleryItem[] }) {
  const t = useTranslations("Memory");
  const [selected, setSelected] = useState(0);

  if (media.length === 0) {
    return (
      <div className="sketch-soft flex min-h-[320px] items-center justify-center bg-surface-2">
        <p className="font-display text-xl text-ink-soft">{t("noMedia")}</p>
      </div>
    );
  }

  const active = media[selected];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_140px]">
      <div className="polaroid taped" style={{ rotate: "-0.6deg" }}>
        <span className="tape-strip" aria-hidden />
        <div className="flex min-h-[300px] items-center justify-center border border-ink/20 bg-ground-2">
          {active.url ? (
            active.media_type === "video" ? (
              <video src={active.url} controls className="max-h-[440px] w-full object-contain" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={active.url}
                alt=""
                // The selected shot is the point of the page, so it loads
                // eagerly and decodes off the main thread.
                decoding="async"
                fetchPriority="high"
                className="max-h-[440px] w-full object-contain"
              />
            )
          ) : (
            <p className="text-ink-soft">{t("mediaUnavailable")}</p>
          )}
        </div>
      </div>

      {media.length > 1 && (
        <div className="flex gap-4 overflow-x-auto pb-2 sm:flex-col sm:overflow-visible sm:pb-0">
          {media.map((item, i) => (
            <button
              key={item.id}
              onClick={() => setSelected(i)}
              aria-current={i === selected}
              style={{ rotate: `${i % 2 === 0 ? 1.2 : -1.4}deg` }}
              className={`shrink-0 border-2 bg-surface p-1.5 pb-4 transition-transform hover:rotate-0 sm:w-full ${
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
                  className="h-20 w-20 border border-ink/20 object-cover sm:w-full"
                />
              ) : (
                <span className="flex h-20 w-20 items-center justify-center bg-ground-2 text-sm sm:w-full">
                  ▶
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
