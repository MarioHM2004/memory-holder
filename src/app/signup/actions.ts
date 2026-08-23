"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export type SignUpActionState = { error: string | null; info: string | null };

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

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });

  if (error) {
    return { error: error.message, info: null };
  }

  if (!data.session) {
    return { error: null, info: t("confirmEmail") };
  }

  redirect("/onboarding");
}
