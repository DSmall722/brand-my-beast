import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Slice 6.10 — apple touch icon, public BrandMyBeast mark only. */
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
          background: "#0c0e11",
          borderRadius: 36,
        }}
      >
        <div
          style={{
            fontSize: 110,
            fontWeight: 800,
            color: "#d6ff3f",
            letterSpacing: "-0.06em",
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
          }}
        >
          B
        </div>
      </div>
    ),
    { ...size },
  );
}
