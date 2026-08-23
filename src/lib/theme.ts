export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "mh-theme";

/**
 * Runs before first paint, inlined in the document head, so a stored theme is
 * applied without the flash of the wrong one. Kept tiny and dependency-free
 * because it is injected as raw script text, not bundled.
 */
export const themeInitScript = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t}}catch(e){}`;

/* ---------------------------------------------------------------------------
 * The active theme lives outside React: it is the `data-theme` attribute on
 * <html> (absent means "follow the OS"). Exposed here as an external store so
 * components can read it with useSyncExternalStore instead of mirroring it
 * into their own state. Every function touches `window`/`document` only when
 * called, so this module stays importable from Server Components.
 * ------------------------------------------------------------------------- */

const listeners = new Set<() => void>();

export function subscribeTheme(onChange: () => void) {
  listeners.add(onChange);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  // OS preference changing matters while no explicit choice is stored, and
  // `storage` keeps other tabs of the diary in sync.
  media.addEventListener("change", onChange);
  window.addEventListener("storage", onChange);

  return () => {
    listeners.delete(onChange);
    media.removeEventListener("change", onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function getTheme(): Theme {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === "light" || chosen === "dark") return chosen;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** The server can know neither the stored choice nor the OS preference. */
export function getServerTheme(): Theme | null {
  return null;
}

export function setTheme(next: Theme) {
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Storage blocked (private browsing): the theme still applies to this
    // page, it just won't be remembered.
  }
  listeners.forEach((listener) => listener());
}
