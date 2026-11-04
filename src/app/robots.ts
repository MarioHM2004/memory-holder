import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Everything worth reading is behind a sign-in, so a crawler can only ever
 * reach the few public pages. The private paths are listed anyway: it costs
 * nothing and keeps a stray link out of the index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/onboarding",
          "/timeline",
          "/roulette",
          "/categories",
          "/memories",
          "/media",
          "/account",
          "/auth",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
