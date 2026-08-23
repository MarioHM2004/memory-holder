"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOut } from "@/app/(app)/actions";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Wordmark } from "@/components/wordmark";
import { ThemeToggle } from "@/components/theme-toggle";

export function RailNav({ coupleName }: { coupleName: string }) {
  const pathname = usePathname();
  const t = useTranslations("Nav");

  const items = [
    { href: "/", label: t("home") },
    { href: "/roulette", label: t("roulette") },
    { href: "/timeline", label: t("timeline") },
    { href: "/categories", label: t("categories") },
    { href: "/admin", label: t("admin") },
  ];

  return (
    <nav
      aria-label="Main navigation"
      className="sketch sticky top-8 flex w-[216px] shrink-0 flex-col gap-0.5 bg-surface p-5"
    >
      <div className="px-1">
        <Wordmark size="sm" />
      </div>
      <p className="mb-4 px-1 pt-1 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted">
        {coupleName}
      </p>

      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
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

      <div className="drawn-rule mt-5 h-2 w-full" aria-hidden />

      <div className="flex items-end justify-between gap-3 pt-3">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <form action={signOut} className="pt-3">
        <button
          type="submit"
          className="px-1 py-1 text-left font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted hover:text-accent-1"
        >
          {t("signOut")}
        </button>
      </form>
    </nav>
  );
}
