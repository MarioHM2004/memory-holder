import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Wordmark } from "@/components/wordmark";
import { ThemeToggle } from "@/components/theme-toggle";
import { UnsubscribeForm } from "./unsubscribe-form";

/**
 * Where the unsubscribe link in the weekly email lands.
 *
 * It asks before doing anything. Clicking the link is a GET, and inboxes
 * fetch those on their own to build previews and scan for malware — a page
 * that unsubscribed on sight would do it to people who never clicked.
 */
export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const t = await getTranslations("Unsubscribe");

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="sketch w-full max-w-sm bg-surface p-8">
        <div className="mb-7 text-center">
          <Wordmark />
          <p className="mt-2 font-display text-lg text-ink-soft">{t("subtitle")}</p>
        </div>

        <UnsubscribeForm token={token} />

        <div className="drawn-rule mt-7 h-2 w-full" aria-hidden />
        <div className="mt-4 flex items-end justify-center gap-4">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
