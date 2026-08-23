import { createClient } from "@/lib/supabase/server";
import type { MediaVariant } from "@/lib/media-url";

/**
 * Serves a photo from the private bucket under a stable, cacheable URL.
 *
 * Nothing here re-implements permissions: the queries run as the signed-in
 * user, so the existing RLS policies do the work. The media row is invisible
 * to anyone outside the couple, and the storage policy checks membership
 * again on the object itself. Without a valid session there is no photo, so
 * a leaked URL is worth nothing.
 */

// Derivatives are always WebP (we set that on upload); originals keep whatever
// extension they came with.
const CONTENT_TYPES: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  avif: "image/avif",
  heic: "image/heic",
};

function contentTypeFor(path: string) {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[extension] ?? "application/octet-stream";
}

export async function GET(request: Request, ctx: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await ctx.params;
  const variant = (new URL(request.url).searchParams.get("v") ?? "preview") as MediaVariant;

  const supabase = await createClient();

  const { data: media } = await supabase
    .from("media")
    .select("storage_path, thumbnail_path, preview_path, media_type")
    .eq("id", mediaId)
    .single();

  // Also the "not allowed" case: RLS returns nothing rather than erroring, and
  // we deliberately don't distinguish the two to avoid confirming that an id
  // exists in someone else's diary.
  if (!media) return new Response("Not found", { status: 404 });

  // Videos are served straight from Supabase via a signed URL, not through
  // here, because this route can't answer range requests and seeking would
  // break. Images are the ones worth proxying.
  if (media.media_type === "video") return new Response("Not found", { status: 404 });

  // Rows created before the derivatives migration only have the original.
  const path =
    variant === "thumb"
      ? (media.thumbnail_path ?? media.preview_path ?? media.storage_path)
      : variant === "original"
        ? media.storage_path
        : (media.preview_path ?? media.storage_path);

  const { data: stream, error } = await supabase.storage.from("media").download(path).asStream();
  if (error || !stream) return new Response("Not found", { status: 404 });

  return new Response(stream, {
    headers: {
      "Content-Type": contentTypeFor(path),
      // private, never shared: one couple's photo must never be served from a
      // shared cache to anyone else. immutable is safe because every upload
      // gets a fresh UUID key, so a given id's bytes never change.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
