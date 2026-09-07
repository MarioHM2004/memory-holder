/**
 * Formats a stored `YYYY-MM-DD` for display.
 *
 * The locale is passed in rather than read from a global: this runs in both
 * Server and Client Components, which get it from different places
 * (`getLocale()` and `useLocale()` respectively).
 *
 * The date is pinned to local midnight before formatting. Parsing a bare
 * `YYYY-MM-DD` would be treated as UTC, so anyone west of Greenwich would see
 * the day before the one they typed.
 */
export function formatDate(isoDate: string, locale: string): string {
  return new Date(`${isoDate}T00:00:00`)
    .toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" })
    .toLocaleUpperCase(locale);
}
