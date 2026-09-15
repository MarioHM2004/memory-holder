import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCoupleContext } from "@/lib/data/couple-context";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Wordmark } from "@/components/wordmark";
import { ThemeToggle } from "@/components/theme-toggle";
import { OnboardingForms } from "./onboarding-forms";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Reachable with diaries already: this is also where another one is
  // created or joined, e.g. one with family alongside one with a partner.
  const context = await getCoupleContext();

  const t = await getTranslations("Onboarding");

  return (
    <div className="flex min-h-screen items-center justify-center bg-ground px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-9 text-center">
          <Wordmark />
          <h1 className="mt-4 text-balance font-marker text-2xl leading-tight">
            {context ? t("headingAnother") : t("heading")}
          </h1>
          <p className="mt-3 text-ink-soft">{context ? t("subtitleAnother") : t("subtitle")}</p>
        </div>
        <OnboardingForms />
        {context && (
          <p className="mt-6 text-center">
            <Link
              href="/"
              className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted hover:text-ink"
            >
              ← {t("back", { name: context.couple.name })}
            </Link>
          </p>
        )}
        <div className="mt-8 flex items-end justify-center gap-4">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
