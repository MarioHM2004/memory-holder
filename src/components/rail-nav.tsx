"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOut } from "@/app/(app)/actions";
import type { DiarySummary } from "@/lib/data/couple-context";
import { DiarySwitcher } from "@/components/diary-switcher";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Wordmark } from "@/components/wordmark";
import { ThemeToggle } from "@/components/theme-toggle";

export function RailNav({ diaries, activeDiaryId }: { diaries: DiarySummary[]; activeDiaryId: string }) {
  const pathname = usePathname();
  const t = useTranslations("Nav");

  const items = [
    { href: "/home", label: t("home") },
    { href: "/roulette", label: t("roulette") },
    { href: "/timeline", label: t("timeline") },
    { href: "/categories", label: t("categories") },
    { href: "/admin", label: t("admin") },
  ];

  return (
    // Below lg this is a bar across the top, so the links run in a wrapping
    // row and nothing is sticky. From lg it becomes the sticky side column.
    <nav
      aria-label="Main navigation"
      className="sketch flex w-full shrink-0 flex-col gap-0.5 bg-surface p-4 lg:sticky lg:top-8 lg:w-[216px] lg:p-5"
    >
      {/* On the bar, the wordmark and the diary's name sit side by side
          rather than stacked, to keep the header shallow on a phone. */}
      <div className="flex items-center justify-between gap-3 px-1 lg:block">
        <Wordmark size="sm" />
        <DiarySwitcher diaries={diaries} activeId={activeDiaryId} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 lg:mt-0 lg:flex-col lg:items-start lg:gap-0.5">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`w-fit px-1 py-1.5 font-display text-lg leading-tight transition-transform hover:translate-x-0.5 ${
                active ? "highlighted font-bold text-ink" : "text-ink-soft hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="drawn-rule mt-3 h-2 w-full lg:mt-5" aria-hidden />

      {/* Language, theme and sign out share one row on the bar; on the rail
          they stack as before. */}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 pt-3 lg:block">
        <div className="flex items-end gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        {/* Side by side on the phone bar, stacked on the rail. */}
        <div className="flex items-center gap-4 lg:block">
          <Link
            href="/privacy"
            className="px-1 py-1 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted hover:text-ink lg:block lg:pt-3"
          >
            {t("privacy")}
          </Link>

          <form action={signOut} className="lg:pt-3">
            <button
              type="submit"
              className="px-1 py-1 text-left font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted hover:text-accent-1"
            >
              {t("signOut")}
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
