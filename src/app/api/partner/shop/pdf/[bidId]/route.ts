import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  canDownloadShopPdf,
  forbiddenDownload,
  unsignedDownload,
} from "@/lib/download-auth";
import {
  getIntentBidById,
  loadBoardIntentStats,
} from "@/lib/intent-store";
import {
  buildShopSeatPdf,
  shopPdfFilename,
  shopPdfSeatFromApproved,
} from "@/lib/shop-pdf";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ bidId: string }> };

/**
 * Slice 8.6 / 13.36 — shop PDF for one approved seat.
 * Shop partner or operator. No Imagine API.
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
  if (!canDownloadShopPdf(session.user.email)) {
    const denial = forbiddenDownload("Shop partners or operator only.");
    return NextResponse.json(
      { ok: false, error: denial.error },
      { status: denial.status },
    );
  }

  const { bidId: rawId } = await context.params;
  const bidId = decodeURIComponent(rawId ?? "").trim();
  if (!bidId) {
    return NextResponse.json(
      { ok: false, error: "Missing bid id." },
      { status: 400 },
    );
  }

  const bid = await getIntentBidById(bidId);
  if (!bid) {
    return NextResponse.json(
      { ok: false, error: "Seat not found." },
      { status: 404 },
    );
  }

  const board = await loadBoardIntentStats();
  const seatResult = shopPdfSeatFromApproved({
    bid,
    pledgedUsd: board.pledgedUsd,
  });
  if (!seatResult.ok) {
    return NextResponse.json(
      { ok: false, error: seatResult.error },
      { status: 400 },
    );
  }

  const pdf = buildShopSeatPdf(seatResult.seat);
  const filename = shopPdfFilename(seatResult.seat);

  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
