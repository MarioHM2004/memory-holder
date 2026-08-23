"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { makePreview, makeThumbnail } from "@/lib/image-resize";
import { Field } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { saveMemoryAction, attachMediaAction, deleteMediaAction, type MemoryFormState } from "./actions";
import type { Category } from "@/lib/types/database";
import type { MemoryForAdmin } from "@/lib/data/memories";

const initialState: MemoryFormState = { error: null, memoryId: null };

// Titles and descriptions are rendered inside fixed-size bubbles and cards, so
// they're capped at the source rather than only being clipped in CSS.
const TITLE_MAX = 70;
const DESCRIPTION_MAX = 200;

/**
 * Storage keys are URL paths, and a raw camera/phone filename can carry
 * spaces, accents or CJK characters that make the upload fail silently. The
 * random prefix already guarantees uniqueness, so flattening the rest is safe.
 */
function safeFileName(name: string) {
  return (
    name
      .normalize("NFKD")
      .replace(/[^\w.-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(-80) || "file"
  );
}

/** Uploads a generated copy; null blob or a failed upload just means none. */
async function uploadDerivative(
  supabase: ReturnType<typeof createClient>,
  path: string,
  blob: Blob | null,
) {
  if (!blob) return null;
  const { error } = await supabase.storage
    .from("media")
    .upload(path, blob, { contentType: "image/webp" });
  return error ? null : path;
}

export function MemoryForm({
  coupleId,
  categories,
  memory,
  onDone,
}: {
  coupleId: string;
  categories: Pick<Category, "id" | "name">[];
  memory?: MemoryForAdmin;
  onDone: () => void;
}) {
  const t = useTranslations("Admin.form");
  const router = useRouter();
  const [state, formAction, pending] = useActionState(saveMemoryAction, initialState);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [existingMedia, setExistingMedia] = useState(memory?.media ?? []);
  const hasSubmitted = useRef(false);
  const uploadedForId = useRef<string | null>(null);

  useEffect(() => {
    if (!hasSubmitted.current || !state.memoryId || state.error) return;

    if (files.length === 0) {
      router.refresh();
      onDone();
      return;
    }

    if (uploadedForId.current === state.memoryId) return;
    uploadedForId.current = state.memoryId;

    void (async () => {
      setUploading(true);
      const supabase = createClient();
      const memoryId = state.memoryId!;

      for (const file of files) {
        const isVideo = file.type.startsWith("video");
        const key = crypto.randomUUID();
        const folder = `${coupleId}/${memoryId}`;
        const path = `${folder}/${key}-${safeFileName(file.name)}`;

        const { error } = await supabase.storage.from("media").upload(path, file);
        if (error) continue;

        // Downscaled copies for the gallery and the filmstrip. Each is
        // best-effort: if the browser can't produce or upload one, the row
        // keeps a null and the app falls back to this original.
        let thumbnailPath: string | null = null;
        let previewPath: string | null = null;

        if (!isVideo) {
          const [thumb, preview] = await Promise.all([makeThumbnail(file), makePreview(file)]);
          [thumbnailPath, previewPath] = await Promise.all([
            uploadDerivative(supabase, `${folder}/${key}-thumb.webp`, thumb),
            uploadDerivative(supabase, `${folder}/${key}-preview.webp`, preview),
          ]);
        }

        await attachMediaAction({
          memoryId,
          storagePath: path,
          thumbnailPath,
          previewPath,
          mediaType: isVideo ? "video" : "image",
        });
      }

      setUploading(false);
      setFiles([]);
      router.refresh();
      onDone();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function handleDeleteMedia(mediaId: string) {
    setExistingMedia((prev) => prev.filter((item) => item.id !== mediaId));
    await deleteMediaAction(mediaId);
    router.refresh();
  }

  const busy = pending || uploading;

  return (
    <form
      action={formAction}
      onSubmit={() => {
        hasSubmitted.current = true;
      }}
      className="sketch grid gap-6 bg-surface p-8 sm:grid-cols-2"
    >
      <h3 className="font-display text-2xl font-bold leading-none sm:col-span-2">
        {memory ? t("editTitle") : t("newTitle")}
      </h3>

      {memory && <input type="hidden" name="id" value={memory.id} />}

      <Field
        label={t("titleLabel")}
        name="title"
        placeholder={t("titlePlaceholder")}
        defaultValue={memory?.title}
        maxLength={TITLE_MAX}
        required
      />

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">{t("categoryLabel")}</span>
        <select
          name="categoryId"
          defaultValue={memory?.category_id ?? ""}
          className="border-b-2 border-line bg-transparent px-1 py-2 text-ink outline-none focus:border-ink"
        >
          <option value="">{t("noCategory")}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <Field
        label={t("dateLabel")}
        name="memoryDate"
        type="date"
        defaultValue={memory?.memory_date}
        required
      />

      <div className="flex flex-col justify-end gap-3 sm:flex-row sm:items-center sm:gap-6">
        <Switch
          name="showInTimeline"
          label={t("showTimelineLabel")}
          hint={t("showTimelineHint")}
          defaultChecked={memory?.show_in_timeline ?? true}
        />
        <Switch
          name="showInRuleta"
          label={t("showRouletteLabel")}
          hint={t("showRouletteHint")}
          defaultChecked={memory?.show_in_ruleta ?? false}
        />
      </div>

      <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">{t("descriptionLabel")}</span>
        <textarea
          name="description"
          rows={2}
          maxLength={DESCRIPTION_MAX}
          placeholder={t("descriptionPlaceholder")}
          defaultValue={memory?.description}
          className="border-b-2 border-line bg-transparent px-1 py-2 text-ink outline-none focus:border-ink"
        />
      </label>

      {/* The long-form entry. Unlike the description this never appears on a
          card or bubble, so it has no length cap. */}
      <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
          {t("bodyLabel")} · {t("bodyHint")}
        </span>
        <textarea
          name="body"
          rows={8}
          placeholder={t("bodyPlaceholder")}
          defaultValue={memory?.body}
          className="border-2 border-line bg-transparent px-3 py-2 leading-relaxed text-ink outline-none focus:border-ink"
        />
      </label>

      <div className="sm:col-span-2">
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">{t("mediaLabel")}</span>

        {existingMedia.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {existingMedia.map((item) => (
              <li
                key={item.id}
                className="sketch-soft-2 flex items-center gap-2 bg-ground-2 px-3 py-1.5 text-xs"
              >
                {item.media_type === "video" ? "🎬" : "🖼️"}{" "}
                {item.storage_path.split("/").pop()}
                <button type="button" onClick={() => handleDeleteMedia(item.id)} className="text-accent-1">
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <label className="mt-3 block cursor-pointer border-2 border-dashed border-line px-4 py-8 text-center font-display text-lg text-ink-soft hover:border-ink hover:text-ink">
          {files.length > 0 ? files.map((f) => f.name).join(", ") : t("mediaHint")}
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
        </label>
      </div>

      {state.error && (
        <p className="border-l-2 border-accent-1 px-3 py-1.5 text-sm font-medium text-accent-1 sm:col-span-2">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2 sm:col-span-2">
        <button
          type="button"
          onClick={onDone}
          className="btn-quiet"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          disabled={busy}
          className="btn-ink"
        >
          {busy ? t("saving") : t("save")}
        </button>
      </div>
    </form>
  );
}
