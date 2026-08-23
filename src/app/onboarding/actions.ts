"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export type OnboardingActionState = { error: string | null };

export async function createCoupleAction(
  _prevState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const t = await getTranslations("Onboarding.create");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: t("errorName") };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("create_couple", { p_name: name });
  if (error) return { error: t("errorGeneric") };

  redirect("/");
}

export async function joinCoupleAction(
  _prevState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const t = await getTranslations("Onboarding.join");
  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();
  if (!code) return { error: t("errorCode") };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("join_couple_by_code", { p_code: code });
  if (error) return { error: t("errorInvalid") };

  redirect("/");
}
