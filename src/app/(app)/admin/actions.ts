"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireCoupleContext } from "@/lib/data/couple-context";
import { ACTIVE_DIARY_COOKIE } from "@/lib/data/active-diary";
import { removeStorageFolder } from "@/lib/data/media-storage";
import { diaryNameMatches } from "@/lib/format";

export type MemoryFormState = { error: string | null; memoryId: string | null };

/**
 * The diary a form was rendered for, from its hidden coupleId field, or null
 * if the user isn't a member of it.
 *
 * Not the active diary from couple-context: with several diaries, switching
 * in another tab changes that while this form is still open, and saving would
 * then put a new memory in the wrong diary or silently miss the one edited.
 */
async function formDiary(formData: FormData) {
  const context = await requireCoupleContext();
  const coupleId = String(formData.get("coupleId") ?? "");
  return context.diaries.some((diary) => diary.id === coupleId) ? { context, coupleId } : null;
}

export async function saveMemoryAction(
  _prevState: MemoryFormState,
  formData: FormData,
): Promise<MemoryFormState> {
  const t = await getTranslations("Admin.form");
  const diary = await formDiary(formData);
  if (!diary) return { error: t("errorGeneric"), memoryId: null };
  const { context, coupleId } = diary;
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "").trim() || null;
  const title = String(formData.get("title") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim() || null;
  const memoryDate = String(formData.get("memoryDate") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const showInTimeline = formData.get("showInTimeline") === "on";
  const showInRuleta = formData.get("showInRuleta") === "on";

  if (!title || !memoryDate) {
    return { error: t("errorRequired"), memoryId: null };
  }

  // Nothing in the schema ties a memory's category to the same diary, and
  // with several diaries one from another is only a stale form away.
  if (categoryId) {
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("id", categoryId)
      .eq("couple_id", coupleId)
      .maybeSingle();
    if (!category) return { error: t("errorGeneric"), memoryId: null };
  }

  if (id) {
    const { error } = await supabase
      .from("memories")
      .update({
        title,
        category_id: categoryId,
        memory_date: memoryDate,
        description,
        body,
        show_in_timeline: showInTimeline,
        show_in_ruleta: showInRuleta,
      })
      .eq("id", id)
      .eq("couple_id", coupleId);

    if (error) return { error: t("errorGeneric"), memoryId: null };
    revalidatePath("/", "layout");
    return { error: null, memoryId: id };
  }

  const { data, error } = await supabase
    .from("memories")
    .insert({
      couple_id: coupleId,
      title,
      category_id: categoryId,
      memory_date: memoryDate,
      description,
      body,
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
  const diary = await formDiary(formData);
  const id = String(formData.get("id") ?? "");
  if (!diary || !id) return;
  const supabase = await createClient();

  await supabase.from("memories").delete().eq("id", id).eq("couple_id", diary.coupleId);
  revalidatePath("/", "layout");
}

export async function attachMediaAction(input: {
  memoryId: string;
  storagePath: string;
  thumbnailPath?: string | null;
  previewPath?: string | null;
  mediaType: "image" | "video";
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("media").insert({
    memory_id: input.memoryId,
    storage_path: input.storagePath,
    thumbnail_path: input.thumbnailPath ?? null,
    preview_path: input.previewPath ?? null,
    media_type: input.mediaType,
  });
  revalidatePath("/", "layout");
  return { error: error?.message ?? null };
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
    // Deduplicated: preview_path points at storage_path for anything stored
    // downscaled, which is most photos.
    const paths = [
      ...new Set(
        [media.storage_path, media.thumbnail_path, media.preview_path].filter(
          (path): path is string => Boolean(path),
        ),
      ),
    ];
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
  const diary = await formDiary(formData);
  if (!diary) return { error: t("errorName") };
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  if (!name) return { error: t("errorName") };

  const { error } = await supabase.from("categories").insert({
    couple_id: diary.coupleId,
    name,
    color: color || undefined,
  });

  if (error) return { error: t("errorName") };

  revalidatePath("/", "layout");
  return { error: null };
}

export async function deleteCategoryAction(formData: FormData) {
  const diary = await formDiary(formData);
  const id = String(formData.get("id") ?? "");
  if (!diary || !id) return;
  const supabase = await createClient();

  await supabase.from("categories").delete().eq("id", id).eq("couple_id", diary.coupleId);
  revalidatePath("/", "layout");
}

export type LeaveDiaryState = { error: string | null };

export async function leaveDiaryAction(
  _prevState: LeaveDiaryState,
  formData: FormData,
): Promise<LeaveDiaryState> {
  const t = await getTranslations("Admin.leaveDiary");
  const diary = await formDiary(formData);
  if (!diary) return { error: t("errorGeneric") };
  const { context, coupleId } = diary;
  const supabase = await createClient();

  const { count } = await supabase
    .from("couple_members")
    .select("user_id", { count: "exact", head: true })
    .eq("couple_id", coupleId);

  if (count === 1) {
    const name = context.diaries.find((item) => item.id === coupleId)?.name ?? "";
    if (!diaryNameMatches(String(formData.get("confirmName") ?? ""), name)) {
      return { error: t("errorConfirmName") };
    }

    // The last member leaving deletes the diary, and its photos have to go
    // first: the database cascade can't reach Storage, and once this person
    // is out the storage policies no longer let them delete anything there.
    try {
      await removeStorageFolder(supabase, coupleId);
    } catch {
      // Nothing has been left yet, so it's safe to stop and let them retry.
      return { error: t("errorGeneric") };
    }
  }

  const { error } = await supabase.rpc("leave_couple", { p_couple_id: coupleId });
  if (error) return { error: t("errorGeneric") };

  // If it was the active diary the cookie now points at nothing; clearing it
  // lets couple-context fall back to the next diary, or onboarding if none.
  const cookieStore = await cookies();
  if (cookieStore.get(ACTIVE_DIARY_COOKIE)?.value === coupleId) cookieStore.delete(ACTIVE_DIARY_COOKIE);

  revalidatePath("/", "layout");
  redirect("/");
}

export type DeleteAccountState = { error: string | null };

/**
 * Closes the caller's account for good.
 *
 * Diaries shared with other people stay where they are — the memories belong
 * to everyone in them — while a diary nobody else is in goes too, photos
 * included. The database side is delete_account() in migration 0004.
 */
export async function deleteAccountAction(
  _prevState: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const t = await getTranslations("Admin.account");
  const context = await requireCoupleContext();
  const supabase = await createClient();

  const password = String(formData.get("password") ?? "");
  if (!password) return { error: t("errorPassword") };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: t("errorGeneric") };

  // There is no undo, so ask for the password rather than trusting whoever
  // happens to be in front of an open session.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (signInError) return { error: t("errorPassword") };

  // Photos first, while the account still exists and the storage policies
  // still answer to it; afterwards nothing could reach them again.
  try {
    for (const diary of context.diaries) {
      const { count } = await supabase
        .from("couple_members")
        .select("user_id", { count: "exact", head: true })
        .eq("couple_id", diary.id);
      if (count === 1) await removeStorageFolder(supabase, diary.id);
    }
  } catch {
    // Nothing is deleted yet, so stopping here leaves the account intact.
    return { error: t("errorGeneric") };
  }

  const { error } = await supabase.rpc("delete_account");
  if (error) return { error: t("errorGeneric") };

  await supabase.auth.signOut();
  (await cookies()).delete(ACTIVE_DIARY_COOKIE);
  revalidatePath("/", "layout");
  redirect("/login?deleted=1");
}
