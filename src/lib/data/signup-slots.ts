import { createClient } from "@/lib/supabase/server";

/**
 * How many more accounts the diary will accept, from the cap in
 * app_settings (migration 0005).
 *
 * Only ever a courtesy to the person in front of the form — the trigger on
 * auth.users is what enforces the limit. So when the question can't be
 * answered, this says there's room rather than locking everyone out of a
 * signup the database would have allowed.
 */
export async function signupSlotsLeft(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("signup_slots_left");
  if (error || typeof data !== "number") return 1;
  return data;
}
