import { ImageResponse } from "next/og";

/**
 * The icon iOS uses when the diary is added to the home screen, which is how
 * a phone ends up treating it like an app. Same polaroid as icon.svg, redrawn
 * here because Apple only takes a bitmap.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#171614",
        }}
      >
        <div
          style={{
            display: "flex",
            transform: "rotate(-8deg)",
            backgroundColor: "#fbfaf7",
            padding: "11px 11px 34px",
          }}
        >
          <div style={{ width: "78px", height: "70px", backgroundColor: "#c8452f" }} />
        </div>
      </div>
    ),
    size,
  );
}
