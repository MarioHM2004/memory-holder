"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Hands a visitor a diary of their own, copied from the demo one, without
 * asking them for anything.
 *
 * They get an anonymous Supabase session — a real identity as far as Row
 * Level Security is concerned, just one with no address behind it — and
 * start_sandbox (migration 0009) builds the copy. It is deleted tonight.
 *
 * Why not keep their changes in the browser: every page here is rendered on
 * the server from the database, so a local-only version would mean a second
 * implementation of every read and every save — one that quietly stops
 * matching the real app. This way the demonstration cannot be out of date.
 */
export async function startSandboxAction() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Someone already signed in keeps whatever diary they came with: a real
  // account must not pick up a try-it diary that vanishes tonight. The
  // button only shows on the signed-out page, but the action is reachable
  // either way.
  if (user?.email) redirect("/home");

  if (!user) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) redirect("/?error=demo");
  }

  const { error } = await supabase.rpc("start_sandbox");
  if (error) redirect("/?error=demo");

  redirect("/home");
}
