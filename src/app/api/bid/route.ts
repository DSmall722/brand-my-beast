import { NextResponse } from "next/server";
import { bidDeskMode } from "@/lib/bid-desk";
import { PUBLIC_COPY } from "@/lib/public-copy";

/**
 * Public Place bid. Refuses while the desk is closed and never writes a row.
 * No card charge.
 */
export async function POST() {
  const mode = bidDeskMode();
  switch (mode.kind) {
    case "closed":
      return NextResponse.json(
        {
          ok: false,
          error: PUBLIC_COPY.bidDesk.closedResult,
          code: "bidding_closed",
        },
        { status: 403 },
      );
    case "intent":
      return NextResponse.json(
        {
          ok: false,
          error: "This form does not take a deposit.",
          code: "no_deposit",
        },
        { status: 403 },
      );
    default: {
      const unreachable: never = mode;
      return unreachable;
    }
  }
}
