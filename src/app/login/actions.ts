"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = { error: string | null };

export async function login(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const t = await getTranslations("Auth.login");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: t("errorFields") };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  // An unconfirmed account fails here like a wrong password, and "email or
  // password incorrect" sends people off checking a password that was fine.
  if (error) {
    return { error: error.code === "email_not_confirmed" ? t("notConfirmed") : t("error") };
  }

  redirect("/");
}
