import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The one-click unsubscribe a mail client performs on the reader's behalf,
 * named by the List-Unsubscribe header on the weekly email.
 *
 * POST only, and that's the point: scanners and link previewers follow GETs,
 * and an inbox that quietly unsubscribed people by looking at their mail
 * would be worse than no unsubscribe at all. The visible link in the email
 * goes to /unsubscribe/[token], which asks first.
 */
export async function POST(_request: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("unsubscribe_weekly", { p_token: token });

  if (error) return new Response("Could not unsubscribe", { status: 500 });
  // A token nobody holds is still a 200: the sender only needs to know the
  // request was understood, and saying which tokens exist helps no one.
  return new Response(data ? "Unsubscribed" : "Nothing to do", { status: 200 });
}
