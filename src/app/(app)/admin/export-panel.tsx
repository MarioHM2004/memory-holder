"use client";

import { useState } from "react";
import { downloadZip } from "client-zip";
import { useLocale, useTranslations } from "next-intl";
import { formatDate } from "@/lib/format";
import { renderDiaryHtml, slugify, type ExportManifest } from "@/lib/export";

type Status =
  | { step: "idle" }
  | { step: "listing" }
  | { step: "downloading"; done: number; total: number }
  | { step: "packing" }
  | { step: "done" }
  | { step: "failed"; reason: string };

/**
 * Downloads the whole diary as a zip: the text as JSON and Markdown, the
 * photos beside them.
 *
 * The work happens here rather than on the server because the photos come
 * straight from Supabase on signed links. A hundred megabytes streamed
 * through a Vercel function would push against its time limit and spend the
 * site's bandwidth to move bytes that never needed to pass through it.
 */
export function ExportPanel({ diaryName }: { diaryName: string }) {
  const t = useTranslations("Admin.export");
  const locale = useLocale();
  const [status, setStatus] = useState<Status>({ step: "idle" });

  async function run() {
    try {
      setStatus({ step: "listing" });
      const response = await fetch("/api/export");
      if (!response.ok) throw new Error(`${response.status}`);
      const manifest: ExportManifest = await response.json();

      const files = manifest.memories.flatMap((memory) => memory.media);
      setStatus({ step: "downloading", done: 0, total: files.length });

      // One at a time on purpose. Parallel downloads finish sooner but make
      // the progress meaningless and can trip Supabase's rate limiting
      // halfway through a large diary, which is worse than slow.
      const downloaded: { name: string; input: Blob }[] = [];
      for (const [index, file] of files.entries()) {
        const photo = await fetch(file.url);
        if (photo.ok) downloaded.push({ name: file.path, input: await photo.blob() });
        setStatus({ step: "downloading", done: index + 1, total: files.length });
      }

      setStatus({ step: "packing" });
      const stamp = manifest.exportedAt.slice(0, 10);
      const zip = await downloadZip([
        { name: "diary.json", input: JSON.stringify(manifest, null, 2) },
        {
          name: "diary.html",
          input: renderDiaryHtml(
            manifest,
            locale,
            t("fileSubtitle", { count: manifest.memories.length, date: formatDate(stamp, locale) }),
          ),
        },
        ...downloaded,
      ]).blob();

      const url = URL.createObjectURL(zip);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${slugify(diaryName)}-${stamp}.zip`;
      link.click();
      // Freed on the next tick: revoking immediately cancels the download in
      // some browsers before it has read the blob.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);

      setStatus({ step: "done" });
    } catch (err) {
      setStatus({ step: "failed", reason: err instanceof Error ? err.message : String(err) });
    }
  }

  const busy =
    status.step === "listing" || status.step === "downloading" || status.step === "packing";

  return (
    <div className="sketch-soft-2 max-w-md bg-surface p-5 sm:p-7 md:flex-1">
      <h3 className="font-display text-2xl font-bold leading-none">{t("title")}</h3>
      <p className="mt-2 text-sm text-ink-soft">{t("description")}</p>

      <button type="button" onClick={run} disabled={busy} className="btn-ink mt-5">
        {busy ? t("working") : t("button")}
      </button>

      <p aria-live="polite" className="mt-3 min-h-5 text-sm text-ink-soft">
        {status.step === "listing" && t("listing")}
        {status.step === "downloading" &&
          t("downloading", { done: status.done, total: status.total })}
        {status.step === "packing" && t("packing")}
        {status.step === "done" && t("done")}
      </p>

      {status.step === "failed" && (
        <div className="border-l-2 border-accent-1 px-3 py-1.5 text-accent-1">
          <p className="text-sm font-medium">{t("error")}</p>
          <p className="mt-1 break-words font-mono text-[0.68rem] text-ink-soft">{status.reason}</p>
        </div>
      )}
    </div>
  );
}
