"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export type SignUpActionState = { error: string | null; info: string | null };

/** Supabase auth error codes worth explaining, mapped to our own messages. */
const SIGNUP_ERRORS: Record<string, string> = {
  user_already_exists: "errorExists",
  email_exists: "errorExists",
  email_address_invalid: "errorEmailInvalid",
  weak_password: "errorPasswordLength",
  over_email_send_rate_limit: "errorRateLimit",
  signup_disabled: "errorGeneric",
};

export async function signUp(
  _prevState: SignUpActionState,
  formData: FormData,
): Promise<SignUpActionState> {
  const t = await getTranslations("Auth.signup");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();

  if (!email || !password || !displayName) {
    return { error: t("errorFields"), info: null };
  }
  if (password.length < 8) {
    return { error: t("errorPasswordLength"), info: null };
  }

  // Where the confirmation email should land. Taken from the request rather
  // than hardcoded so a signup on localhost gets a localhost link, and the
  // live site a live one; Supabase only honours hosts listed under
  // Authentication → URL Configuration → Redirect URLs.
  const headerList = await headers();
  const origin =
    headerList.get("origin") ??
    `${headerList.get("x-forwarded-proto") ?? "https"}://${headerList.get("host")}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  // Supabase's own messages are English-only and worded for developers.
  if (error) {
    return { error: t(SIGNUP_ERRORS[error.code ?? ""] ?? "errorGeneric"), info: null };
  }

  if (!data.session) {
    return { error: null, info: t("confirmEmail") };
  }

  redirect("/onboarding");
}
