import { ImageResponse } from "next/og";
import { iconArt } from "@/lib/icon-art";

/**
 * The icon iOS uses when the diary is added to the home screen, which is how
 * a phone ends up treating it like an app. Same polaroid as icon.svg and as
 * the manifest icons, redrawn here because Apple only takes a bitmap.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(iconArt(size.width), size);
}
