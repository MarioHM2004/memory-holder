/**
 * The polaroid of icon.svg, as JSX for next/og to rasterise.
 *
 * Shared by the Apple touch icon and the manifest icons so the home screen
 * and the browser tab can't drift apart. Plain divs, no border radius: these
 * are declared maskable, and Android rounds or clips them to whatever shape
 * the launcher uses — a corner we rounded ourselves would be cut twice.
 */
export function iconArt(size: number) {
  // Everything is a fraction of the canvas, so one drawing serves 180px and
  // 512px without a second set of numbers.
  const frame = size * 0.52;
  const photo = frame * 0.74;
  const foot = frame * 0.3;

  return (
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
          padding: `${frame * 0.1}px ${frame * 0.1}px ${foot}px`,
        }}
      >
        <div style={{ width: `${photo}px`, height: `${photo * 0.9}px`, backgroundColor: "#c8452f" }} />
      </div>
    </div>
  );
}
