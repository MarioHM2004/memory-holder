"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOut } from "@/app/(app)/actions";
import type { DiarySummary } from "@/lib/data/couple-context";
import { DiarySwitcher } from "@/components/diary-switcher";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NavIcon, type NavIconName } from "@/components/nav-icons";
import { Wordmark } from "@/components/wordmark";
import { ThemeToggle } from "@/components/theme-toggle";

export function RailNav({ diaries, activeDiaryId }: { diaries: DiarySummary[]; activeDiaryId: string }) {
  const pathname = usePathname();
  const t = useTranslations("Nav");

  const items: { href: string; label: string; icon: NavIconName }[] = [
    { href: "/home", label: t("home"), icon: "home" },
    { href: "/search", label: t("search"), icon: "search" },
    { href: "/roulette", label: t("roulette"), icon: "roulette" },
    { href: "/timeline", label: t("timeline"), icon: "timeline" },
    { href: "/categories", label: t("categories"), icon: "categories" },
    { href: "/admin", label: t("admin"), icon: "admin" },
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
        {/* Language and theme join the diary name on the phone header. They
            belong in reach: someone opening the diary for the first time in
            a language they don't read has to find the switcher without being
            able to read the way there. Compact, so all three fit one line. */}
        <div className="flex items-center gap-3 lg:block">
          <DiarySwitcher diaries={diaries} activeId={activeDiaryId} />
          <span className="lg:hidden">
            <LanguageSwitcher showLabel={false} />
          </span>
          <span className="lg:hidden">
            <ThemeToggle />
          </span>
        </div>
      </div>

      {/* Only from lg. On a phone these live in the bar along the bottom,
          where a thumb reaches them. */}
      <div className="hidden lg:flex lg:flex-col lg:items-start lg:gap-0.5">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex w-fit items-center gap-2 px-1 py-1.5 font-display text-lg leading-tight transition-transform hover:translate-x-0.5 ${
                active ? "font-bold text-ink" : "text-ink-soft hover:text-ink"
              }`}
            >
              <NavIcon name={item.icon} />
              {/* The marker stays under the word alone. Stretched behind the
                  icon too it reads as a highlighted box, not a pen stroke. */}
              <span className={active ? "highlighted" : undefined}>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="drawn-rule hidden h-2 w-full lg:mt-5 lg:block" aria-hidden />

      {/* Also rail-only. Language, privacy and signing out are rare enough
          to live in the admin panel's Account tab on a phone, which keeps
          this header to a single line. */}
      <div className="hidden pt-3 lg:block">
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
