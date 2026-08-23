"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireCoupleContext } from "@/lib/data/couple-context";

export type MemoryFormState = { error: string | null; memoryId: string | null };

export async function saveMemoryAction(
  _prevState: MemoryFormState,
  formData: FormData,
): Promise<MemoryFormState> {
  const t = await getTranslations("Admin.form");
  const context = await requireCoupleContext();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "").trim() || null;
  const title = String(formData.get("title") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim() || null;
  const memoryDate = String(formData.get("memoryDate") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const showInTimeline = formData.get("showInTimeline") === "on";
  const showInRuleta = formData.get("showInRuleta") === "on";

  if (!title || !memoryDate) {
    return { error: t("errorRequired"), memoryId: null };
  }

  if (id) {
    const { error } = await supabase
      .from("memories")
      .update({
        title,
        category_id: categoryId,
        memory_date: memoryDate,
        description,
        show_in_timeline: showInTimeline,
        show_in_ruleta: showInRuleta,
      })
      .eq("id", id)
      .eq("couple_id", context.couple.id);

    if (error) return { error: t("errorGeneric"), memoryId: null };
    revalidatePath("/", "layout");
    return { error: null, memoryId: id };
  }

  const { data, error } = await supabase
    .from("memories")
    .insert({
      couple_id: context.couple.id,
      title,
      category_id: categoryId,
      memory_date: memoryDate,
      description,
      show_in_timeline: showInTimeline,
      show_in_ruleta: showInRuleta,
      created_by: context.userId,
    })
    .select("id")
    .single();

  if (error || !data) return { error: t("errorGeneric"), memoryId: null };

  revalidatePath("/", "layout");
  return { error: null, memoryId: data.id };
}

export async function deleteMemoryAction(formData: FormData) {
  const context = await requireCoupleContext();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase.from("memories").delete().eq("id", id).eq("couple_id", context.couple.id);
  revalidatePath("/", "layout");
}

export async function attachMediaAction(input: {
  memoryId: string;
  storagePath: string;
  thumbnailPath?: string | null;
  previewPath?: string | null;
  mediaType: "image" | "video";
}) {
  const supabase = await createClient();
  await supabase.from("media").insert({
    memory_id: input.memoryId,
    storage_path: input.storagePath,
    thumbnail_path: input.thumbnailPath ?? null,
    preview_path: input.previewPath ?? null,
    media_type: input.mediaType,
  });
  revalidatePath("/", "layout");
}

export async function deleteMediaAction(mediaId: string) {
  const supabase = await createClient();
  const { data: media } = await supabase
    .from("media")
    .select("storage_path, thumbnail_path, preview_path")
    .eq("id", mediaId)
    .single();

  if (media) {
    // Remove the downscaled copies alongside the original, or they'd be left
    // orphaned in the bucket.
    const paths = [media.storage_path, media.thumbnail_path, media.preview_path].filter(
      (path): path is string => Boolean(path),
    );
    await supabase.storage.from("media").remove(paths);
    await supabase.from("media").delete().eq("id", mediaId);
  }
  revalidatePath("/", "layout");
}

export type CategoryFormState = { error: string | null };

export async function saveCategoryAction(
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const t = await getTranslations("Admin.categoriesTab");
  const context = await requireCoupleContext();
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  if (!name) return { error: t("errorName") };

  const { error } = await supabase.from("categories").insert({
    couple_id: context.couple.id,
    name,
    color: color || undefined,
  });

  if (error) return { error: t("errorName") };

  revalidatePath("/", "layout");
  return { error: null };
}

export async function deleteCategoryAction(formData: FormData) {
  const context = await requireCoupleContext();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase.from("categories").delete().eq("id", id).eq("couple_id", context.couple.id);
  revalidatePath("/", "layout");
}
