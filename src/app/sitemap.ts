import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** The pages a signed-out visitor can actually open. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: SITE_URL, lastModified, priority: 1 },
    { url: `${SITE_URL}/signup`, lastModified, priority: 0.8 },
    { url: `${SITE_URL}/login`, lastModified, priority: 0.5 },
    { url: `${SITE_URL}/privacy`, lastModified, priority: 0.3 },
  ];
}
