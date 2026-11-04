import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

/**
 * The card other apps draw when someone pastes the link — which is how this
 * spreads, so it shouldn't be a blank rectangle.
 *
 * Rendered from JSX rather than a saved image so the text follows the
 * reader's language. The diary's own marker font isn't here: pulling a font
 * file in would make every build depend on a download, for a line of text
 * seen at thumbnail size.
 */
export const alt = "Memory Holder";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const t = await getTranslations("Meta");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          backgroundColor: "#fbfaf7",
          padding: "0 90px",
        }}
      >
        {/* The polaroid from the icon, at a size where the frame reads. */}
        <div
          style={{
            display: "flex",
            transform: "rotate(-6deg)",
            backgroundColor: "#ffffff",
            border: "5px solid #171614",
            padding: "20px 20px 62px",
            marginRight: "72px",
          }}
        >
          <div style={{ width: "230px", height: "230px", backgroundColor: "#c8452f" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: "620px" }}>
          <div style={{ display: "flex", fontSize: 74, fontWeight: 700 }}>
            <span style={{ color: "#171614" }}>memory&nbsp;</span>
            <span style={{ color: "#c8452f" }}>holder</span>
          </div>
          <div style={{ fontSize: 31, color: "#56534c", marginTop: "22px", lineHeight: 1.4 }}>
            {t("description")}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
