"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isLocale, LOCALE_COOKIE, type Locale } from "./locales";

// Setting the cookie here (inside a Server Action) makes Next.js re-render the
// current route in the same response, so the new language shows up immediately
// without a manual router.refresh() on the client.
export async function setLocaleAction(locale: Locale) {
  if (!isLocale(locale)) return;
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  // Mirrored onto the profile for anything that runs without a browser —
  // the weekly email, which otherwise has no way of knowing which language
  // its reader picked. Best effort: a signed-out visitor has no profile, and
  // choosing a language shouldn't fail because a write did.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await supabase.from("profiles").update({ locale }).eq("id", user.id);
}
