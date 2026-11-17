import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { removeStorageFolder } from "@/lib/data/media-storage";

/**
 * Clears out the try-it diaries once a night.
 *
 * Their rows cascade from the couple, but the photos a visitor uploaded do
 * not — SQL cannot reach the bucket, and once the rows are gone there is no
 * record of which folders existed. So the folders go first, and the rows
 * after.
 */

function authorised(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorised(request)) return Response.json({ error: "unauthorised" }, { status: 401 });

  const supabase = createAdminClient();

  const { data: expired, error } = await supabase.rpc("expired_sandboxes");
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const failed: string[] = [];
  for (const row of expired ?? []) {
    try {
      await removeStorageFolder(supabase, row.couple_id);
    } catch {
      // Keep going: one folder refusing shouldn't leave every other diary
      // sitting there until tomorrow. It is reported below.
      failed.push(row.couple_id);
    }
  }

  const { data: deleted, error: deleteError } = await supabase.rpc("delete_expired_sandboxes");
  if (deleteError) return Response.json({ error: deleteError.message }, { status: 500 });

  return Response.json(
    { expired: expired?.length ?? 0, deleted, foldersFailed: failed },
    { status: failed.length > 0 ? 500 : 200 },
  );
}
