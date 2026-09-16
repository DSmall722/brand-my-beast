import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  BRAND,
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  formatUsd,
  isEtchable,
} from "@/lib/campaign";
import {
  canDownloadSeatPng,
  forbiddenDownload,
  unsignedDownload,
} from "@/lib/download-auth";
import { loadStandingHoldersByPanel } from "@/lib/intent-store";
import {
  seatExportFinishBadge,
  seatExportPngFilename,
  seatExportStandingLabel,
} from "@/lib/seat-export-png";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ panelId: string }> };

/**
 * Slice 10.6 / 13.36 — one PNG per seat.
 * Operator or standing seat owner. Preview composite — not billed.
 */
export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    const denial = unsignedDownload();
    return NextResponse.json(
      { ok: false, error: denial.error },
      { status: denial.status },
    );
  }

  const { panelId: rawId } = await context.params;
  const panelId = decodeURIComponent(rawId ?? "").trim();
  const panel = PANELS.find((row) => row.id === panelId);
  if (!panel) {
    return NextResponse.json(
      { ok: false, error: "Unknown panel." },
      { status: 404 },
    );
  }

  const holders = await loadStandingHoldersByPanel();
  const holder = holders.get(panel.id);
  const allowed = canDownloadSeatPng({
    email: session.user.email,
    userId: session.user.id,
    ownerUserId: holder?.userId ?? null,
  });
  if (!allowed) {
    const denial = forbiddenDownload(
      "Seat PNG is only for the standing owner or the operator.",
    );
    return NextResponse.json(
      { ok: false, error: denial.error },
      { status: denial.status },
    );
  }

  const brandLabel = seatExportStandingLabel(holder?.brandLabel ?? null);
  const finishBadge = seatExportFinishBadge(isEtchable(panel));
  const filename = seatExportPngFilename(panel.id);

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px 56px",
          background:
            "linear-gradient(145deg, #0c0e11 0%, #14181e 48%, #1a222c 100%)",
          color: "#e8edf3",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              fontSize: 22,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#d6ff3f",
            }}
          >
            {BRAND.name}
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              textTransform: "uppercase",
            }}
          >
            {panel.name}
          </div>
          <div style={{ fontSize: 28, color: "#b7c0cc" }}>{brandLabel}</div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            fontSize: 22,
            color: "#b7c0cc",
          }}
        >
          <div>{finishBadge}</div>
          <div>{`Floor ${formatUsd(FLOOR_USD)} · Buyout ${formatUsd(GOAL_USD)}`}</div>
          <div style={{ fontSize: 18, color: "#8b95a3" }}>
            {"Preview only. Not charged. Not a photo of a truck that does not exist."}
          </div>
        </div>
      </div>
    ),
    { width: 960, height: 540 },
  );

  const bytes = await image.arrayBuffer();
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
