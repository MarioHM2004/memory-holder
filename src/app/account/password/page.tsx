import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Wordmark } from "@/components/wordmark";
import { ThemeToggle } from "@/components/theme-toggle";
import { PasswordForm } from "./password-form";

/**
 * Sets a new password. Reached two ways: from a recovery link, which has just
 * signed the person in through /auth/confirm, and from the admin panel.
 *
 * Deliberately outside the (app) group — it needs a session but not a diary,
 * and someone recovering an account shouldn't be bounced to onboarding.
 */
export default async function PasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // No session means the link expired or was already used.
  if (!user) redirect("/login?error=link");

  const t = await getTranslations("Auth.password");

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="sketch w-full max-w-sm bg-surface p-8">
        <div className="mb-7 text-center">
          <Wordmark />
          <p className="mt-2 font-display text-lg text-ink-soft">{t("subtitle")}</p>
        </div>

        <PasswordForm />

        <div className="drawn-rule mt-7 h-2 w-full" aria-hidden />
        <div className="mt-4 flex items-end justify-center gap-4">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
