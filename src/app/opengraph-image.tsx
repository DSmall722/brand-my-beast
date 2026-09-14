import { ImageResponse } from "next/og";
import { BRAND, FLOOR_USD, GOAL_USD, formatUsd } from "@/lib/campaign";
import { PUBLIC_COPY } from "@/lib/public-copy";

export const alt = `${BRAND.name} — floor ${formatUsd(FLOOR_USD)}, buyout ${formatUsd(GOAL_USD)}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Slice 6.10 — public brand only. No personal identity, no lease, no close date. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(145deg, #0c0e11 0%, #14181e 48%, #1a222c 100%)",
          color: "#e8edf3",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: "#0c0e11",
              border: "1px solid rgba(214,255,63,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#d6ff3f",
              fontSize: 34,
              fontWeight: 800,
            }}
          >
            B
          </div>
          <div
            style={{
              fontSize: 42,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              textTransform: "uppercase",
              color: "#f4f7fb",
            }}
          >
            {BRAND.name}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 54,
              fontWeight: 700,
              lineHeight: 1.12,
              letterSpacing: "-0.03em",
              maxWidth: 980,
              color: "#f4f7fb",
            }}
          >
            {PUBLIC_COPY.meta.title.replace(`${BRAND.name} — `, "")}
          </div>
          <div
            style={{
              fontSize: 28,
              lineHeight: 1.35,
              color: "#b7c0cc",
              maxWidth: 920,
            }}
          >
            {PUBLIC_COPY.meta.description}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 24,
          }}
        >
          <div style={{ display: "flex", gap: 28, fontSize: 26, color: "#d6ff3f" }}>
            <span>Floor {formatUsd(FLOOR_USD)}</span>
            <span>Buyout {formatUsd(GOAL_USD)}</span>
          </div>
          <div style={{ display: "flex", gap: 20, fontSize: 24, color: "#8b96a5" }}>
            <span>{BRAND.handle}</span>
            <span>{BRAND.domain}</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
