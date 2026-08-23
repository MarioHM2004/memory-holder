"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { getServerTheme, getTheme, setTheme, subscribeTheme } from "@/lib/theme";

/**
 * Flips `data-theme` on <html>, which pins `color-scheme` and so decides which
 * side of every light-dark() token resolves. Until someone touches it there is
 * no attribute at all and the OS preference stands.
 */
export function ThemeToggle() {
  const t = useTranslations("Theme");
  const theme = useSyncExternalStore(subscribeTheme, getTheme, getServerTheme);

  const isDark = theme === "dark";
  const label = isDark ? t("toLight") : t("toDark");

  return (
    <button
      type="button"
      // Reads the live DOM state rather than closing over `isDark`: if two
      // clicks land before React re-renders (e.g. a fast double-click), a
      // captured `isDark` would resolve both to the same target and the
      // second click would silently do nothing.
      onClick={() => setTheme(getTheme() === "dark" ? "light" : "dark")}
      aria-label={label}
      title={label}
      className="btn-circle h-9 w-9 shrink-0"
    >
      {/* Held back until the real theme is known on the client, so the icon
          never flips from wrong to right in front of the user. */}
      {theme && (
        <svg
          viewBox="0 0 24 24"
          className="h-[18px] w-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          {isDark ? (
            <path d="M20 14.5A8.2 8.2 0 0 1 9.4 3.9a8.5 8.5 0 1 0 10.6 10.6z" />
          ) : (
            <>
              <circle cx="12" cy="12" r="4.2" />
              <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
            </>
          )}
        </svg>
      )}
    </button>
  );
}
