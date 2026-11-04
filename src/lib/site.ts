/**
 * The site's own address, for the absolute URLs that only make sense outside
 * the app: sitemap entries, robots, and the link previews other apps build.
 *
 * Overridable so a preview deployment doesn't advertise the live domain.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://memory-holder.com";
