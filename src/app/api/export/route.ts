import { requireCoupleContext } from "@/lib/data/couple-context";
import { createClient } from "@/lib/supabase/server";
import { slugify, type ExportManifest, type ExportMemory } from "@/lib/export";

/**
 * Everything in the active diary, as one JSON document with signed links to
 * the files. The browser does the downloading and the zipping — see
 * lib/export.ts for why the photos don't come through here.
 *
 * No elevated access: this runs as the signed-in member, so the existing row
 * policies decide what comes back, and signing a URL requires the same
 * permission as reading the object.
 */

/** Long enough to download a large diary over a slow line, short enough to matter. */
const URL_TTL = 60 * 60 * 2;

export async function GET() {
  const context = await requireCoupleContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("memories")
    .select("id, title, description, body, memory_date, categories(name), media(id, storage_path, media_type, position)")
    .eq("couple_id", context.couple.id)
    .order("memory_date", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as unknown as {
    id: string;
    title: string;
    description: string;
    body: string;
    memory_date: string;
    categories: { name: string } | null;
    media: { id: string; storage_path: string; media_type: string; position: number }[] | null;
  }[];

  // One signing call for the whole diary rather than one per file.
  const paths = rows.flatMap((row) => (row.media ?? []).map((m) => m.storage_path));
  const signed = new Map<string, string>();
  if (paths.length > 0) {
    const { data: urls } = await supabase.storage
      .from("media")
      .createSignedUrls([...new Set(paths)], URL_TTL);
    for (const entry of urls ?? []) {
      if (entry.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
    }
  }

  const memories: ExportMemory[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    body: row.body,
    date: row.memory_date,
    category: row.categories?.name ?? null,
    media: (row.media ?? [])
      .sort((a, b) => a.position - b.position)
      .map((item, index) => {
        // Named after the memory rather than kept as a UUID: the point of an
        // export is that it still makes sense without this app to read it.
        const extension = item.storage_path.split(".").pop()?.toLowerCase() ?? "bin";
        return {
          path: `photos/${row.memory_date}-${slugify(row.title)}-${index + 1}.${extension}`,
          url: signed.get(item.storage_path) ?? "",
        };
      })
      // A file we couldn't sign would become an empty entry in the archive.
      .filter((item) => item.url),
  }));

  const manifest: ExportManifest = {
    diary: context.couple.name,
    exportedAt: new Date().toISOString(),
    memories,
  };

  return Response.json(manifest, {
    headers: { "Cache-Control": "no-store" },
  });
}
