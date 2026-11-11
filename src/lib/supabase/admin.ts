import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * A client that answers to nobody: the service role key bypasses Row Level
 * Security entirely, so this reads and writes every diary in the database.
 *
 * It exists for one job — the weekly email, which runs with nobody signed in
 * and has to look across all of them. Use `@/lib/supabase/server` everywhere
 * else, and keep the key out of anything the browser can reach.
 *
 * Throws rather than falling back to the anon key: a silent downgrade here
 * would look like "no recipients this week" instead of a misconfiguration.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

  return createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
