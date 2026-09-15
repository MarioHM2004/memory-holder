import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_DIARY_COOKIE } from "@/lib/data/active-diary";
import type { Couple } from "@/lib/types/database";

export interface DiarySummary {
  id: string;
  name: string;
}

export interface CoupleContext {
  userId: string;
  displayName: string;
  /** The diary being viewed. Every page and action works on this one. */
  couple: Couple;
  role: "owner" | "member";
  /** Every diary the user belongs to, oldest membership first. */
  diaries: DiarySummary[];
}

interface LoadedContext {
  /** Set whenever there's a session, even if that user hasn't joined a couple. */
  userId: string | null;
  context: CoupleContext | null;
}

/**
 * Resolves the signed-in user and the diary they're looking at.
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

  const [{ data: memberships }, { data: profile }, cookieStore] = await Promise.all([
    supabase
      .from("couple_members")
      .select("role, couples(*)")
      .eq("user_id", user.id)
      // Ordered so the fallback diary is always the same one. Without an
      // order Postgres may return the rows in any order, and someone in two
      // diaries could land in either from one visit to the next. couple_id
      // breaks ties between diaries joined in the same instant.
      .order("joined_at", { ascending: true })
      .order("couple_id", { ascending: true }),
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    cookies(),
  ]);

  const rows = (memberships ?? [])
    .filter((membership) => membership.couples)
    .map((membership) => ({
      couple: membership.couples as unknown as Couple,
      role: membership.role as "owner" | "member",
    }));
  if (rows.length === 0) return { userId: user.id, context: null };

  const wanted = cookieStore.get(ACTIVE_DIARY_COOKIE)?.value;
  const active = rows.find((row) => row.couple.id === wanted) ?? rows[0];

  return {
    userId: user.id,
    context: {
      userId: user.id,
      displayName: profile?.display_name ?? user.email ?? "Tú",
      couple: active.couple,
      role: active.role,
      diaries: rows.map((row) => ({ id: row.couple.id, name: row.couple.name })),
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
