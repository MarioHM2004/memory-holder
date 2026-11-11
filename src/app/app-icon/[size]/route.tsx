import { ImageResponse } from "next/og";
import { iconArt } from "@/lib/icon-art";

/**
 * The PNG icons the web app manifest points at.
 *
 * Android wants bitmaps at known sizes for the home screen and the install
 * prompt; the tab favicon stays the SVG. Both sizes are prerendered, so this
 * never runs on a real request.
 */
const SIZES = [192, 512];

export function generateStaticParams() {
  return SIZES.map((size) => ({ size: String(size) }));
}

export async function GET(_request: Request, ctx: { params: Promise<{ size: string }> }) {
  const size = Number((await ctx.params).size);
  if (!SIZES.includes(size)) return new Response("Not found", { status: 404 });

  return new ImageResponse(iconArt(size), { width: size, height: size });
}
