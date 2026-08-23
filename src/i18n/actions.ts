"use server";

import { cookies } from "next/headers";
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
}
