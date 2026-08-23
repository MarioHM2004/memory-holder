-- Memory Holder — downscaled copies of uploaded photos
--
-- The gallery was serving the untouched camera original everywhere: once for
-- the main viewer and once more per 80px thumbnail. Uploads now also produce a
-- small and a medium WebP copy, recorded here.
--
-- Both columns are nullable on purpose: media rows created before this
-- migration have neither, and the app falls back to storage_path for them.
-- Objects live under the same {couple_id}/{memory_id}/ prefix as the original,
-- so the existing storage policies cover them without change.

alter table public.media
  add column if not exists thumbnail_path text,
  add column if not exists preview_path text;
