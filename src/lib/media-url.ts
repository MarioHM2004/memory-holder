export type MediaVariant = "thumb" | "preview" | "original";

/**
 * Points at our own /media route rather than a Supabase signed URL.
 *
 * Signed URLs carry a fresh token on every page load, so the browser treats
 * each render as a new resource and re-downloads the photo. This URL is stable
 * for the life of the media row, which is what lets it actually be cached —
 * and the route still checks the session, so nothing becomes public.
 */
export function mediaUrl(mediaId: string, variant: MediaVariant = "preview") {
  return `/media/${mediaId}?v=${variant}`;
}
