import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { FLOOR_USD, GOAL_USD, PANELS, formatUsd } from "@/lib/campaign";
import { panelBoardMarkFor, panelSeatH1 } from "@/lib/panel-board";
import { PUBLIC_COPY } from "@/lib/public-copy";

export const alt = "Seat number and panel name";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Slice 16.33 — OG image for `/panels/[id]` shows the board number and name.
 */
export default async function PanelOpenGraphImage({
  params,
}: {
  params: Promise<{ panelId: string }>;
}) {
  const { panelId } = await params;
  const panel = PANELS.find((row) => row.id === panelId);
  if (!panel) notFound();

  const mark = panelBoardMarkFor(panel.id);
  const seat = panelSeatH1(panel);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0c0e11",
          color: "#f4f7fb",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          padding: "48px 64px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 28,
            letterSpacing: "-0.04em",
            textTransform: "uppercase",
            fontWeight: 800,
          }}
        >
          <span>{PUBLIC_COPY.header.wordmark}</span>
          <span style={{ color: "#8b96a5", fontWeight: 600, fontSize: 24 }}>
            {seat}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              display: "flex",
              fontSize: 200,
              fontWeight: 800,
              lineHeight: 0.9,
              letterSpacing: "-0.06em",
              color: "#d6ff3f",
            }}
          >
            {String(mark.n)}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            {panel.name}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 28,
            fontSize: 26,
            color: "#d6ff3f",
          }}
        >
          <span>Floor {formatUsd(FLOOR_USD)}</span>
          <span>Buyout {formatUsd(GOAL_USD)}</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
