"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setActiveDiary } from "@/lib/data/active-diary";
import { requireCoupleContext } from "@/lib/data/couple-context";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function switchDiaryAction(coupleId: string) {
  const context = await requireCoupleContext();
  // Not a security check (couple-context re-validates the cookie on every
  // request) but there's no point storing an id this person can't open.
  if (!context.diaries.some((diary) => diary.id === coupleId)) return;

  await setActiveDiary(coupleId);
  revalidatePath("/", "layout");
  // Home rather than the current page: a memory or category open now
  // belongs to the diary being left, and would 404 in the new one.
  redirect("/");
}
