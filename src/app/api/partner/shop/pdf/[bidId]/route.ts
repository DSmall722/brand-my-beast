import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isShopPartnerEmail } from "@/lib/auth/shop-partner";
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
 * Slice 8.6 — shop PDF for one approved seat.
 * Auth: SHOP_PARTNER_EMAILS (test: shop@example.com). No Imagine API.
 */
export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { ok: false, error: "Sign in required." },
      { status: 401 },
    );
  }
  if (!isShopPartnerEmail(session.user.email)) {
    return NextResponse.json(
      { ok: false, error: "Shop partners only." },
      { status: 403 },
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
