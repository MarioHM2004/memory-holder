"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { NavIcon, type NavIconName } from "@/components/nav-icons";

/**
 * The phone's navigation: a fixed bar along the bottom.
 *
 * It replaces the stack of links the rail used to drop above the page, which
 * cost around 240px before the content began — a third of the screen on
 * every view. This costs about 60, and it sits where a thumb already is,
 * rather than at the top corner a hand has to stretch for.
 *
 * Five destinations, not six: the roulette is reached from the card the home
 * page already gives it, and five columns stay wide enough to read.
 */
const ITEMS: { href: string; label: "home" | "search" | "timeline" | "categories" | "admin"; icon: NavIconName }[] = [
  { href: "/home", label: "home", icon: "home" },
  { href: "/search", label: "search", icon: "search" },
  { href: "/timeline", label: "timeline", icon: "timeline" },
  { href: "/categories", label: "categories", icon: "categories" },
  { href: "/admin", label: "admin", icon: "admin" },
];

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("Nav");

  return (
    <nav
      aria-label={t("sections")}
      // The inset keeps the row clear of the iPhone's home indicator and of
      // Safari's own bar, which otherwise sit on top of it.
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="flex items-stretch">
        {ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-start gap-1 px-1 pb-2 pt-2.5 text-center ${
                  active ? "text-ink" : "text-muted"
                }`}
              >
                <NavIcon name={item.icon} />
                {/* Left to wrap onto a second line rather than shortened:
                    "Línea de tiempo" doesn't fit a fifth of a phone on one. */}
                <span
                  className={`font-display text-[0.6rem] leading-tight ${active ? "font-bold" : ""}`}
                >
                  {t(item.label)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
