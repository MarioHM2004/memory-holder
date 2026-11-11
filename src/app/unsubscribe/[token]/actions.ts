"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type UnsubscribeState = { done: boolean; failed: boolean };

/**
 * Turns the weekly email off for whoever holds this token.
 *
 * Runs with the admin client because the person clicking has no session —
 * they came from their inbox. The token is the whole credential, which is
 * why it grants nothing else: the worst it can do is stop an email.
 */
export async function unsubscribeAction(
  _prevState: UnsubscribeState,
  formData: FormData,
): Promise<UnsubscribeState> {
  const token = String(formData.get("token") ?? "");
  if (!token) return { done: false, failed: true };

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("unsubscribe_weekly", { p_token: token });

  // Whether the token matched anyone isn't reflected back: the page says the
  // same thing either way rather than confirming which tokens are real.
  return error ? { done: false, failed: true } : { done: true, failed: false };
}
