import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Wordmark } from "@/components/wordmark";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * What the diary stores and how to get rid of it. Public: people ask before
 * signing up, not after.
 */
const SECTIONS = ["what", "where", "who", "cookies", "keep", "rights", "contact"] as const;

export default async function PrivacyPage() {
  const t = await getTranslations("Privacy");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="sketch bg-surface p-6 sm:p-9">
        <div className="text-center">
          <Wordmark />
        </div>

        <h1 className="mt-7 font-marker text-2xl leading-tight">{t("title")}</h1>
        <p className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
          {t("updated")}
        </p>
        <p className="mt-5 text-ink-soft">{t("intro")}</p>

        {SECTIONS.map((section) => (
          <section key={section} className="mt-8">
            <h2 className="font-display text-xl font-bold leading-none">{t(`${section}.title`)}</h2>
            {/* The bodies are written as plain paragraphs with line breaks
                rather than markup, so translators only deal with text. */}
            <p className="mt-2 whitespace-pre-line leading-relaxed text-ink-soft">
              {t(`${section}.body`)}
            </p>
          </section>
        ))}

        <div className="drawn-rule mt-9 h-2 w-full" aria-hidden />
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <Link
            href="/"
            className="font-display text-lg font-bold text-ink underline decoration-accent-1 decoration-2 underline-offset-2"
          >
            {t("back")}
          </Link>
          <div className="flex items-end gap-4">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}
