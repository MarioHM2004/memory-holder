import { createClient } from "@/lib/supabase/server";
import { mediaUrl } from "@/lib/media-url";
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

export type MemoryWithCover = Memory & { coverMediaId: string | null };

const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * One round trip for a batch of paths, deduplicated, keyed by path. Only
 * videos still need this — images go through the /media route instead.
 */
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

/** Shape of the `media(...)` embed added to the memory queries below. */
type EmbeddedMedia = { id: string; media_type: "image" | "video"; position: number };

/** Columns of that embed. Kept in one place so the queries can't drift apart. */
const MEDIA_EMBED = "media(id, media_type, position)";

/**
 * Picks each memory's first photo as its cover.
 *
 * The media rows arrive embedded in the same query as the memories, rather
 * than in a follow-up round trip keyed by the ids we just fetched. Nothing is
 * signed here either: the cover is addressed by media id through /media, so
 * the URL is stable and the browser can cache it.
 */
function withCover<T extends Memory & { media?: EmbeddedMedia[] | null }>(
  rows: T[],
): (Omit<T, "media"> & { coverMediaId: string | null })[] {
  return rows.map((row) => {
    const { media, ...memory } = row;
    const cover = (media ?? [])
      .filter((item) => item.media_type === "image")
      .sort((a, b) => a.position - b.position)[0];
    return { ...(memory as Omit<T, "media">), coverMediaId: cover?.id ?? null };
  });
}

export async function getCategoryMemories(
  coupleId: string,
  categoryId: string,
): Promise<MemoryWithCover[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memories")
    .select(`*, ${MEDIA_EMBED}`)
    .eq("couple_id", coupleId)
    .eq("category_id", categoryId)
    .order("memory_date", { ascending: true });
  return withCover(data ?? []);
}

export async function getUncategorizedMemories(coupleId: string): Promise<MemoryWithCover[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memories")
    .select("*")
    .eq("couple_id", coupleId)
    .is("category_id", null)
    .order("memory_date", { ascending: true });
  return withCover(data ?? []);
}

export async function getTimelineMemories(coupleId: string): Promise<MemoryWithCover[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memories")
    .select(`*, ${MEDIA_EMBED}`)
    .eq("couple_id", coupleId)
    .eq("show_in_timeline", true)
    .order("memory_date", { ascending: true });
  return withCover(data ?? []);
}

export async function getRuletaMemories(coupleId: string): Promise<MemoryWithCover[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memories")
    .select(`*, ${MEDIA_EMBED}`)
    .eq("couple_id", coupleId)
    .eq("show_in_ruleta", true);
  return withCover(data ?? []);
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

export type RecentMemory = MemoryWithCategory & { coverMediaId: string | null };

export async function getRecentMemories(coupleId: string, limit = 20): Promise<RecentMemory[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memories")
    .select(`*, categories(name, color), ${MEDIA_EMBED}`)
    .eq("couple_id", coupleId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return withCover((data as unknown as (MemoryWithCategory & { media: EmbeddedMedia[] })[]) ?? []);
}

/** `url` drives the main viewer, `thumbUrl` the filmstrip beside it. */
export type GalleryItem = Media & { url: string | null; thumbUrl: string | null };

export async function getMemory(
  coupleId: string,
  memoryId: string,
): Promise<{ memory: MemoryWithCategory; media: GalleryItem[] } | null> {
  const supabase = await createClient();
  // Media comes back embedded, so the page costs one round trip instead of
  // memory → media → sign.
  const { data } = await supabase
    .from("memories")
    .select("*, categories(name, color), media(*)")
    .eq("couple_id", coupleId)
    .eq("id", memoryId)
    .single();

  if (!data) return null;

  const { media, ...memory } = data as unknown as MemoryWithCategory & { media: Media[] };
  const items = [...(media ?? [])].sort((a, b) => a.position - b.position);

  // Only videos still need signing, and only because the /media route can't
  // serve range requests — without those, seeking a video breaks. When a
  // memory has no video (the common case) this costs nothing.
  const videoPaths = items.filter((i) => i.media_type === "video").map((i) => i.storage_path);
  const signedByPath = await signPaths(supabase, videoPaths);

  const mediaWithUrls: GalleryItem[] = items.map((item) =>
    item.media_type === "video"
      ? { ...item, url: signedByPath.get(item.storage_path) ?? null, thumbUrl: null }
      : { ...item, url: mediaUrl(item.id, "preview"), thumbUrl: mediaUrl(item.id, "thumb") },
  );

  return { memory: memory as MemoryWithCategory, media: mediaWithUrls };
}
