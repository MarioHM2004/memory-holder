"use client";

import { useLocale, useTranslations } from "next-intl";
import { locales, localeNames, type Locale } from "@/i18n/locales";
import { setLocaleAction } from "@/i18n/actions";

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("Language");

  return (
    <div className="flex flex-col gap-1.5">
      <span className="px-1 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted">
        {t("label")}
      </span>
      <div className="flex flex-wrap gap-2">
        {locales.map((l: Locale) => (
          <button
            key={l}
            type="button"
            onClick={() => {
              void setLocaleAction(l);
            }}
            aria-pressed={locale === l}
            className={`px-1 font-display text-base ${
              locale === l ? "highlighted font-bold text-ink" : "text-ink-soft hover:text-ink"
            }`}
          >
            {localeNames[l]}
          </button>
        ))}
      </div>
    </div>
  );
}
