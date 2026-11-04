"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export type SignUpActionState = {
  error: string | null;
  /** Supabase's own wording, shown only when we have nothing better to say. */
  detail: string | null;
  info: string | null;
};

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
    return { error: t("errorFields"), detail: null, info: null };
  }
  if (password.length < 8) {
    return { error: t("errorPasswordLength"), detail: null, info: null };
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

  // Supabase's own messages are English-only and worded for developers, so
  // the ones worth explaining get our wording. Anything else keeps the
  // original alongside: a bare "try again" hides whether the problem is the
  // person's to fix (and it is nearly always the mail sender misconfigured).
  if (error) {
    const known = SIGNUP_ERRORS[error.code ?? ""];
    console.error("signUp failed", { code: error.code, status: error.status, message: error.message });
    return {
      error: t(known ?? "errorGeneric"),
      detail: known ? null : error.message,
      info: null,
    };
  }

  if (!data.session) {
    return { error: null, detail: null, info: t("confirmEmail") };
  }

  redirect("/onboarding");
}
