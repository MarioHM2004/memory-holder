"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";
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

/** Identifies a picked file, so adding the same one twice doesn't queue it twice. */
function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

/**
 * A drop isn't filtered by the input's accept attribute, so this does it.
 * HEIC photos from an iPhone can arrive with an empty type on Windows, hence
 * the extension check.
 */
function isMedia(file: File) {
  return /^(image|video)\//.test(file.type) || /\.(heic|heif)$/i.test(file.name);
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
  // Files that didn't make it on the last save, with the reason for each.
  const [failed, setFailed] = useState<{ name: string; reason: string }[]>([]);
  const [dragging, setDragging] = useState(false);
  // How many files of the last pick or drop were left out for not being media.
  const [ignored, setIgnored] = useState(0);
  const hasSubmitted = useRef(false);
  // Keyed on the state object, not the memory id: retrying after a failed
  // upload saves the same memory again, and must still upload.
  const uploadedFor = useRef<MemoryFormState | null>(null);
  // Once a new memory has been created, saving again has to update that row.
  // Otherwise retrying failed uploads would create a second copy of it.
  const savedId = memory?.id ?? state.memoryId;
  const busy = pending || uploading;

  useEffect(() => {
    if (!hasSubmitted.current || !state.memoryId || state.error) return;

    if (files.length === 0) {
      router.refresh();
      onDone();
      return;
    }

    if (uploadedFor.current === state) return;
    uploadedFor.current = state;

    void (async () => {
      setUploading(true);
      setFailed([]);
      const supabase = createClient();
      const memoryId = state.memoryId!;
      const stillPending: File[] = [];
      const failures: { name: string; reason: string }[] = [];

      for (const file of files) {
        // Every failure used to be skipped with a bare `continue`, after
        // which the form closed as if all had gone well: photos vanished
        // with no message. Each one is now caught, reported and kept for
        // another try.
        try {
          const isVideo = file.type.startsWith("video");
          const key = crypto.randomUUID();
          const folder = `${coupleId}/${memoryId}`;
          const path = `${folder}/${key}-${safeFileName(file.name)}`;

          const { error } = await supabase.storage.from("media").upload(path, file);
          if (error) throw error;

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

          const attached = await attachMediaAction({
            memoryId,
            storagePath: path,
            thumbnailPath,
            previewPath,
            mediaType: isVideo ? "video" : "image",
          });
          if (attached.error) throw new Error(attached.error);
        } catch (err) {
          stillPending.push(file);
          failures.push({ name: file.name, reason: err instanceof Error ? err.message : String(err) });
        }
      }

      setUploading(false);
      setFiles(stillPending);
      router.refresh();
      if (failures.length === 0) onDone();
      else setFailed(failures);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Dropping a file anywhere outside the drop zone makes the browser open it,
  // navigating away from the form and losing everything typed into it.
  useEffect(() => {
    function blockFileDrop(e: globalThis.DragEvent) {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    }
    window.addEventListener("dragover", blockFileDrop);
    window.addEventListener("drop", blockFileDrop);
    return () => {
      window.removeEventListener("dragover", blockFileDrop);
      window.removeEventListener("drop", blockFileDrop);
    };
  }, []);

  // Picking and dropping both add to the queue rather than replacing it, so
  // photos can be gathered from several folders before saving.
  function addFiles(list: FileList | null) {
    const incoming = Array.from(list ?? []);
    const media = incoming.filter(isMedia);
    setIgnored(incoming.length - media.length);
    setFiles((current) => {
      const queued = new Set(current.map(fileKey));
      return [...current, ...media.filter((file) => !queued.has(fileKey(file)))];
    });
  }

  function onZoneDragOver(e: DragEvent<HTMLLabelElement>) {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = busy ? "none" : "copy";
    if (!busy) setDragging(true);
  }

  function onZoneDragLeave(e: DragEvent<HTMLLabelElement>) {
    // dragleave also fires when moving onto a child of the zone; only a real
    // exit should drop the highlight.
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
  }

  function onZoneDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    // While uploading, the loop is working through a snapshot of the queue.
    if (!busy) addFiles(e.dataTransfer.files);
  }

  async function handleDeleteMedia(mediaId: string) {
    setExistingMedia((prev) => prev.filter((item) => item.id !== mediaId));
    await deleteMediaAction(mediaId);
    router.refresh();
  }

  return (
    <form
      // Submitted by hand instead of through the action prop, which makes
      // React clear every field once the action finishes. That was invisible
      // while the form always closed afterwards, but when an upload fails the
      // form now stays open for a retry, and a new memory's title would be
      // gone by then.
      onSubmit={(e) => {
        e.preventDefault();
        hasSubmitted.current = true;
        const formData = new FormData(e.currentTarget);
        startTransition(() => formAction(formData));
      }}
      className="sketch grid gap-6 bg-surface p-8 sm:grid-cols-2"
    >
      <h3 className="font-display text-2xl font-bold leading-none sm:col-span-2">
        {memory ? t("editTitle") : t("newTitle")}
      </h3>

      {savedId && <input type="hidden" name="id" value={savedId} />}

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

        <label
          onDragOver={onZoneDragOver}
          onDragLeave={onZoneDragLeave}
          onDrop={onZoneDrop}
          className={`mt-3 block cursor-pointer border-2 border-dashed px-4 py-8 text-center font-display text-lg transition-colors hover:border-ink hover:text-ink ${
            dragging ? "border-ink bg-ground-2 text-ink" : "border-line text-ink-soft"
          }`}
        >
          {dragging ? t("mediaDrop") : t("mediaHint")}
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            disabled={busy}
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              // Cleared so choosing the same file again after removing it
              // still fires a change.
              e.target.value = "";
            }}
          />
        </label>

        {ignored > 0 && (
          <p className="mt-2 text-xs text-accent-1">{t("mediaIgnored", { count: ignored })}</p>
        )}

        {files.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {files.map((file) => (
              <li
                key={fileKey(file)}
                className="flex items-center gap-2 border border-dashed border-line px-3 py-1.5 text-xs"
              >
                {file.type.startsWith("video") ? "🎬" : "🖼️"} {file.name}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setFiles((current) => current.filter((f) => fileKey(f) !== fileKey(file)))}
                  aria-label={t("removeFile")}
                  className="text-accent-1 disabled:opacity-40"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {state.error && (
        <p className="border-l-2 border-accent-1 px-3 py-1.5 text-sm font-medium text-accent-1 sm:col-span-2">
          {state.error}
        </p>
      )}

      {failed.length > 0 && !busy && (
        <div
          role="alert"
          className="border-l-2 border-accent-1 px-3 py-1.5 text-sm text-accent-1 sm:col-span-2"
        >
          <p className="font-medium">{t("errorUpload", { count: failed.length })}</p>
          {/* The raw reason is for us, not for her: it's what tells a blocked
              connection apart from a rejected file when she sends a screenshot. */}
          <ul className="mt-1 font-mono text-[0.68rem] text-ink-soft">
            {failed.map((item, i) => (
              <li key={i} className="break-all">
                {item.name}: {item.reason}
              </li>
            ))}
          </ul>
        </div>
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
