import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Couple } from "@/lib/types/database";

export interface CoupleContext {
  userId: string;
  displayName: string;
  couple: Couple;
  role: "owner" | "member";
}

interface LoadedContext {
  /** Set whenever there's a session, even if that user hasn't joined a couple. */
  userId: string | null;
  context: CoupleContext | null;
}

/**
 * Resolves the signed-in user and their diary.
 *
 * Wrapped in React's cache() because the app layout and every page under it
 * both need this, and without deduplication each render repeated the whole
 * lookup — and `auth.getUser()` is a network call to Supabase every time, not
 * a local cookie read. One render pass now costs one lookup.
 */
const loadContext = cache(async (): Promise<LoadedContext> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { userId: null, context: null };

  const [{ data: membership }, { data: profile }] = await Promise.all([
    supabase
      .from("couple_members")
      .select("role, couples(*)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle(),
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
  ]);

  if (!membership || !membership.couples) return { userId: user.id, context: null };

  return {
    userId: user.id,
    context: {
      userId: user.id,
      displayName: profile?.display_name ?? user.email ?? "Tú",
      couple: membership.couples as unknown as Couple,
      role: membership.role as "owner" | "member",
    },
  };
});

/** Returns null when there's no session or the user hasn't joined a couple yet. */
export async function getCoupleContext(): Promise<CoupleContext | null> {
  return (await loadContext()).context;
}

/** Same as getCoupleContext, but redirects to /login or /onboarding instead of returning null. */
export async function requireCoupleContext(): Promise<CoupleContext> {
  // userId comes back from the same cached lookup, so choosing between the two
  // redirects no longer costs a second auth round trip.
  const { userId, context } = await loadContext();
  if (!context) redirect(userId ? "/onboarding" : "/login");
  return context;
}
