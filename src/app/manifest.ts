import type { MetadataRoute } from "next";

/**
 * What a phone reads when someone adds the diary to their home screen.
 *
 * Photos live on phones, and until now reaching the diary meant opening a
 * browser and finding a tab. Installed, it gets an icon of its own and opens
 * without the address bar — the difference between a website you visit and
 * somewhere you keep things.
 *
 * Deliberately not translated. Making it so would mean reading the language
 * cookie, which turns a file every install reads into a per-request render,
 * and the only string most launchers show is the name.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Memory Holder",
    short_name: "Memory Holder",
    description: "A private diary for you and your friends: photos, dates and the small moments.",
    // "/" and not "/home": signed out it's the public page, signed in it
    // forwards to the diary, so the icon does the right thing either way.
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbfaf7",
    theme_color: "#fbfaf7",
    // Each size listed twice, once per purpose: the art is full-bleed with
    // the polaroid well inside the safe area, so it serves a launcher that
    // crops it to its own shape and one that draws it as given. Next's type
    // takes a single purpose per entry, not the space-separated pair.
    icons: [
      { src: "/app-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon/192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
