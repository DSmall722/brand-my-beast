import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getIntentBidById,
  loadBoardIntentStats,
} from "@/lib/intent-store";
import {
  buildWinnerPacketMarkdown,
  winnerPacketFilename,
  winnerPacketSeatFromApproved,
} from "@/lib/winner-packet";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ bidId: string }> };

/**
 * Slice 12.22 — winner packet markdown for one approved seat.
 * Auth: seat owner only. Intent only — no card charge.
 */
export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { ok: false, error: "Sign in required." },
      { status: 401 },
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

  if (bid.userId !== session.user.id) {
    return NextResponse.json(
      { ok: false, error: "Winner packet is only for your approved seats." },
      { status: 403 },
    );
  }

  const board = await loadBoardIntentStats();
  const seatResult = winnerPacketSeatFromApproved({
    bid,
    pledgedUsd: board.pledgedUsd,
  });
  if (!seatResult.ok) {
    return NextResponse.json(
      { ok: false, error: seatResult.error },
      { status: 400 },
    );
  }

  const markdown = buildWinnerPacketMarkdown(seatResult.seat);
  const filename = winnerPacketFilename(seatResult.seat);

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
