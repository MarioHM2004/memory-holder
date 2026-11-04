import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Storage lists in pages; deletes take a batch at a time. */
const PAGE = 1000;
const BATCH = 500;

/** Every object under a storage folder, descending into subfolders. */
async function listFolder(supabase: Supabase, prefix: string): Promise<string[]> {
  const paths: string[] = [];

  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage
      .from("media")
      .list(prefix, { limit: PAGE, offset });
    if (error) throw error;

    for (const item of data) {
      const path = `${prefix}/${item.name}`;
      // Folders come back as entries with no id.
      if (item.id === null) paths.push(...(await listFolder(supabase, path)));
      else paths.push(path);
    }

    if (data.length < PAGE) return paths;
  }
}

/**
 * Deletes everything under a diary's media folder. Throws rather than
 * reporting partial success, so a caller about to delete the diary itself can
 * stop while the rows — and the permission to reach these files — still exist.
 *
 * Walks the folder rather than the media rows on purpose: it also catches
 * files from uploads that failed before their row was written.
 */
export async function removeStorageFolder(supabase: Supabase, prefix: string) {
  const paths = await listFolder(supabase, prefix);

  for (let i = 0; i < paths.length; i += BATCH) {
    const { error } = await supabase.storage.from("media").remove(paths.slice(i, i + BATCH));
    if (error) throw error;
  }
}
