export type NavIconName = "home" | "search" | "roulette" | "timeline" | "categories" | "admin";

/**
 * The marks beside the rail's links.
 *
 * Drawn as thin open strokes with rounded ends, like the theme toggle, so
 * they read as pencil lines rather than app icons. Two of them quote the
 * screen they point at: the timeline is its own line of dots, and categories
 * are the scattered bubbles of the category canvas.
 *
 * `currentColor` throughout, so each one darkens with its label on hover and
 * when its page is the one open.
 */
export function NavIcon({ name, className = "" }: { name: NavIconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-[17px] w-[17px] shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {ICONS[name]}
    </svg>
  );
}

const ICONS: Record<NavIconName, React.ReactNode> = {
  home: (
    <>
      <path d="M3.6 11.4 12 4.6l8.4 6.8" />
      <path d="M6.2 10.1v9.3h11.6v-9.3" />
      <path d="M10.3 19.4v-4.3h3.4v4.3" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.2" />
      <path d="m15.4 15.4 4.3 4.3" />
    </>
  ),
  roulette: (
    <>
      {/* A prize wheel: six segments around an open hub, with the marker
          biting into the rim from the top left. The spokes stop short of the
          hub instead of crossing it, so the middle stays clear at 17px —
          without the marker this is just a wheel.
          Every point is absolute. The six radii were relative hops before,
          and the arithmetic drifted until one of them shot past the rim. */}
      <circle cx="12" cy="12.6" r="7.2" />
      <circle cx="12" cy="12.6" r="2" />
      <path d="M12 9.9V5.4M12 15.3V19.8" />
      <path d="M14.3 11.3 18.2 9M14.3 13.9 18.2 16.2M9.7 11.3 5.8 9M9.7 13.9 5.8 16.2" />
      <path d="M7 7.6 2.3 6.3 5.7 2.9Z" fill="currentColor" />
    </>
  ),
  timeline: (
    <>
      <path d="M3.2 12h17.6" />
      <circle cx="7.4" cy="12" r="1.9" />
      <circle cx="12" cy="12" r="1.9" />
      <circle cx="16.6" cy="12" r="1.9" />
    </>
  ),
  categories: (
    <>
      <circle cx="8.3" cy="9.3" r="4.3" />
      <circle cx="16.6" cy="7.9" r="2.8" />
      <circle cx="13.7" cy="16.6" r="3.9" />
    </>
  ),
  admin: (
    <>
      {/* The rails stop either side of each knob, so the line doesn't show
          through a shape that has no fill. */}
      <path d="M4 8.5h3.4M11.6 8.5H20" />
      <circle cx="9.5" cy="8.5" r="2.1" />
      <path d="M4 15.5h8.9M17.1 15.5H20" />
      <circle cx="15" cy="15.5" r="2.1" />
    </>
  ),
};
