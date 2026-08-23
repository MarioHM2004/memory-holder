import { createClient } from "@/lib/supabase/server";
import type { Category, Media, Memory } from "@/lib/types/database";

export type CategoryWithCount = Category & { memoryCount: number };
export type MemoryWithCategory = Memory & { categories: { name: string; color: string } | null };

export async function getCategories(coupleId: string): Promise<CategoryWithCount[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*, memories(count)")
    .eq("couple_id", coupleId)
    .order("position", { ascending: true });

  if (!data) return [];

  return data.map((row) => {
    const { memories, ...category } = row as unknown as Category & {
      memories: { count: number }[];
    };
    return { ...category, memoryCount: memories?.[0]?.count ?? 0 };
  });
}

export async function getCategory(coupleId: string, categoryId: string): Promise<Category | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("couple_id", coupleId)
    .eq("id", categoryId)
    .single();
  return data;
}

/** Memories that belong to no category, surfaced as their own folder. */
export async function getUncategorizedCount(coupleId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("memories")
    .select("id", { count: "exact", head: true })
    .eq("couple_id", coupleId)
    .is("category_id", null);
  return count ?? 0;
}

export type MemoryWithCover = Memory & { coverUrl: string | null };

const SIGNED_URL_TTL_SECONDS = 60 * 60;

/** One round trip for a batch of paths, deduplicated, keyed by path. */
async function signPaths(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paths: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(paths)];
  const signed = new Map<string, string>();
  if (unique.length === 0) return signed;

  const { data } = await supabase.storage
    .from("media")
    .createSignedUrls(unique, SIGNED_URL_TTL_SECONDS);

  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
  }
  return signed;
}

/**
 * Signed URL of each memory's first photo, for the bubble hover preview.
 * One query for all the media, then one signing call per memory that has any.
 */
async function attachCovers<T extends Memory>(
  supabase: Awaited<ReturnType<typeof createClient>>,
  memories: T[],
): Promise<(T & { coverUrl: string | null })[]> {
  if (memories.length === 0) return [];

  const { data: media } = await supabase
    .from("media")
    .select("memory_id, storage_path, thumbnail_path")
    .in(
      "memory_id",
      memories.map((memory) => memory.id),
    )
    .eq("media_type", "image")
    .order("position", { ascending: true });

  const coverPaths = new Map<string, string>();
  for (const item of media ?? []) {
    // Thumbnail where one exists; the original is the fallback for rows
    // uploaded before derivatives were generated.
    if (!coverPaths.has(item.memory_id)) {
      coverPaths.set(item.memory_id, item.thumbnail_path ?? item.storage_path);
    }
  }

  const signedByPath = await signPaths(supabase, [...coverPaths.values()]);

  return memories.map((memory) => {
    const path = coverPaths.get(memory.id);
    return { ...memory, coverUrl: path ? (signedByPath.get(path) ?? null) : null };
  });
}

export async function getCategoryMemories(
  coupleId: string,
  categoryId: string,
): Promise<MemoryWithCover[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memories")
    .select("*")
    .eq("couple_id", coupleId)
    .eq("category_id", categoryId)
    .order("memory_date", { ascending: true });
  return attachCovers(supabase, data ?? []);
}

export async function getUncategorizedMemories(coupleId: string): Promise<MemoryWithCover[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memories")
    .select("*")
    .eq("couple_id", coupleId)
    .is("category_id", null)
    .order("memory_date", { ascending: true });
  return attachCovers(supabase, data ?? []);
}

export async function getTimelineMemories(coupleId: string): Promise<MemoryWithCover[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memories")
    .select("*")
    .eq("couple_id", coupleId)
    .eq("show_in_timeline", true)
    .order("memory_date", { ascending: true });
  return attachCovers(supabase, data ?? []);
}

export async function getRuletaMemories(coupleId: string): Promise<MemoryWithCover[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memories")
    .select("*")
    .eq("couple_id", coupleId)
    .eq("show_in_ruleta", true);
  return attachCovers(supabase, data ?? []);
}

export type MemoryForAdmin = MemoryWithCategory & { media: Media[] };

export async function getAllMemoriesForAdmin(coupleId: string): Promise<MemoryForAdmin[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memories")
    .select("*, categories(name, color), media(*)")
    .eq("couple_id", coupleId)
    .order("memory_date", { ascending: false });
  return (data as unknown as MemoryForAdmin[]) ?? [];
}

export type RecentMemory = MemoryWithCategory & { coverUrl: string | null };

export async function getRecentMemories(coupleId: string, limit = 20): Promise<RecentMemory[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memories")
    .select("*, categories(name, color)")
    .eq("couple_id", coupleId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return attachCovers(supabase, (data as unknown as MemoryWithCategory[]) ?? []);
}

/** `url` drives the main viewer, `thumbUrl` the filmstrip beside it. */
export type GalleryItem = Media & { url: string | null; thumbUrl: string | null };

export async function getMemory(
  coupleId: string,
  memoryId: string,
): Promise<{ memory: MemoryWithCategory; media: GalleryItem[] } | null> {
  const supabase = await createClient();
  const { data: memory } = await supabase
    .from("memories")
    .select("*, categories(name, color)")
    .eq("couple_id", coupleId)
    .eq("id", memoryId)
    .single();

  if (!memory) return null;

  const { data: media } = await supabase
    .from("media")
    .select("*")
    .eq("memory_id", memoryId)
    .order("position", { ascending: true });

  const items = media ?? [];

  // The viewer gets the medium copy and the strip the small one, so opening a
  // memory no longer pulls every full-resolution original. Videos have no
  // derivatives, and pre-migration rows have none either: both fall back to
  // storage_path.
  const viewerPath = (item: Media) => item.preview_path ?? item.storage_path;
  const stripPath = (item: Media) => item.thumbnail_path ?? item.preview_path ?? item.storage_path;

  const signedByPath = await signPaths(supabase, [
    ...items.map(viewerPath),
    ...items.map(stripPath),
  ]);

  const mediaWithUrls: GalleryItem[] = items.map((item) => ({
    ...item,
    url: signedByPath.get(viewerPath(item)) ?? null,
    thumbUrl: signedByPath.get(stripPath(item)) ?? null,
  }));

  return { memory: memory as unknown as MemoryWithCategory, media: mediaWithUrls };
}
