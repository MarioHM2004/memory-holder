import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Wordmark } from "@/components/wordmark";
import { ThemeToggle } from "@/components/theme-toggle";
import { signupSlotsLeft } from "@/lib/data/signup-slots";
import { SignUpForm } from "./signup-form";

export default async function SignUpPage() {
  const t = await getTranslations("Auth.signup");
  const tCommon = await getTranslations("Common");
  // Asked before the form is drawn: being told there's no room beats filling
  // in three fields to find out.
  const slots = await signupSlotsLeft();

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="sketch-2 w-full max-w-sm bg-surface p-8">
        <div className="mb-7 text-center">
          <Wordmark />
          <p className="mt-2 font-display text-lg text-ink-soft">{t("subtitle")}</p>
        </div>

        {slots > 0 ? (
          <SignUpForm />
        ) : (
          <p className="whitespace-pre-line border-l-2 border-accent-2 px-3 py-2 text-sm leading-relaxed text-ink">
            {t("full")}
          </p>
        )}

        <p className="mt-7 text-center text-sm text-ink-soft">
          {t("haveAccount")}{" "}
          <Link
            href="/login"
            className="font-display text-lg font-bold text-ink underline decoration-accent-1 decoration-2 underline-offset-2"
          >
            {t("signIn")}
          </Link>
        </p>

        <div className="drawn-rule mt-7 h-2 w-full" aria-hidden />
        <div className="mt-4 flex items-end justify-center gap-4">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
        <p className="mt-5 text-center">
          <Link
            href="/privacy"
            className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted hover:text-ink"
          >
            {tCommon("privacy")}
          </Link>
        </p>
      </div>
    </div>
  );
}
