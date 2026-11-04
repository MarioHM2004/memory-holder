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

/**
 * Whether a typed diary name matches the stored one.
 *
 * Shared by the leave-diary confirmation on both sides, so the button the
 * client enables and the check the server runs can't drift apart.
 *
 * Case and surrounding spaces are ignored on purpose. The label that says
 * what to type is styled in small caps, so someone reading "DIARIO DE
 * PRUEBA" and typing it back was stuck on a disabled button with nothing
 * explaining why.
 */
export function diaryNameMatches(typed: string, name: string): boolean {
  return typed.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase();
}
