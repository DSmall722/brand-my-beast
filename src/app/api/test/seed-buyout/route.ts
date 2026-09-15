import { resolveAuthMode } from "@/lib/auth/mode";
import { CLOSE_AT, GOAL_USD } from "@/lib/campaign";
import {
  isWholeTruckIntentOpen,
  loadBoardIntentStats,
  placeWholeTruckIntent,
  setIntentStatus,
} from "@/lib/intent-store";
import { testApiBlockedResponse } from "@/lib/test-api-gate";

/**
 * Slice 9.5 test seed — approve whole-truck buyout so pledged >= $120,000.
 * 404 in production. Never sets CLOSE_AT.
 */
export async function POST() {
  const blocked = testApiBlockedResponse();
  if (blocked) return blocked;

  if (resolveAuthMode() !== "test") {
    return Response.json({ ok: false, error: "test only" }, { status: 403 });
  }

  const whole = await placeWholeTruckIntent({
    userId: "test:seed-buyout@example.com",
    brandLabel: "Buyout Seed Co",
    tradeLabel: "buyout seed trade",
  });
  if (!whole.ok) {
    return Response.json({ ok: false, error: whole.error }, { status: 400 });
  }
  for (const bid of whole.bids) {
    const approved = await setIntentStatus(bid.id, "approved");
    if (!approved.ok) {
      return Response.json(
        { ok: false, error: approved.error },
        { status: 400 },
      );
    }
  }

  const board = await loadBoardIntentStats();
  return Response.json({
    ok: true,
    pledgedUsd: board.pledgedUsd,
    goalUsd: GOAL_USD,
    wholeTruckOpen: isWholeTruckIntentOpen(board.pledgedUsd),
    closeAt: CLOSE_AT,
  });
}
