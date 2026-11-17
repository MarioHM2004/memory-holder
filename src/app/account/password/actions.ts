"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCoupleContext } from "@/lib/data/couple-context";

export type UpdatePasswordState = { error: string | null };

export async function updatePassword(
  _prevState: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const t = await getTranslations("Auth.password");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: t("errorLength") };

  // Shared credentials: one visitor changing them locks out every other.
  // And a try-it visitor has no address to sign in with, so a password would
  // only give them a key to a door that isn't there.
  const context = await getCoupleContext();
  if (context?.isDemo || context?.isSandbox) return { error: t("errorDemo") };

  const supabase = await createClient();
  // Changes the password of whoever the session belongs to, so there is no
  // account to name here: a recovery link signs that person in first.
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    if (error.code === "same_password") return { error: t("errorSame") };
    if (error.code === "weak_password") return { error: t("errorLength") };
    // Most likely the recovery session expired while this form sat open.
    return { error: t("errorGeneric") };
  }

  redirect("/");
}
