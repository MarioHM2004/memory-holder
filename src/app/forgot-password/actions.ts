"use server";

import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export type ForgotPasswordState = { error: string | null; info: string | null };

export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const t = await getTranslations("Auth.forgot");
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: t("errorEmail"), info: null };

  const headerList = await headers();
  const origin =
    headerList.get("origin") ??
    `${headerList.get("x-forwarded-proto") ?? "https"}://${headerList.get("host")}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    // The email template appends the token and sends people to the page that
    // sets a new password.
    redirectTo: `${origin}/auth/confirm`,
  });

  if (error?.code === "over_email_send_rate_limit") {
    return { error: t("errorRateLimit"), info: null };
  }

  // The same answer whether or not that address has an account: anything else
  // turns this form into a way of finding out who is registered.
  return { error: null, info: t("sent") };
}
