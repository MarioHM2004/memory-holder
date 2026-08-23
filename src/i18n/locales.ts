export const locales = ["en", "es", "zh"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

// Language names are shown in their own script regardless of the active UI language.
export const localeNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
  zh: "中文",
};

export const LOCALE_COOKIE = "locale";

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
