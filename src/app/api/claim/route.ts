import { NextResponse } from "next/server";
import { depositDeskOpen, resolveLiveBidding } from "@/lib/campaign-clock";
import { listAllIntentBids } from "@/lib/intent-store";
import {
  bidTimesForSoftClose,
  placePanelClaim,
} from "@/lib/panel-claim-flow";
import { closedDeskResult } from "@/lib/public-copy";

export const runtime = "nodejs";

function originOf(request: Request): string {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`;
}

export async function POST(request: Request) {
  const bids = await listAllIntentBids();
  if (
    resolveLiveBidding() &&
    !depositDeskOpen(bidTimesForSoftClose(bids))
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: closedDeskResult(),
        code: "bidding_closed",
      },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Expected JSON body.", code: "bad_json" },
      { status: 400 },
    );
  }
  const record =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};
  const result = await placePanelClaim({
    panelId: typeof record.panelId === "string" ? record.panelId : "",
    brandLabel: typeof record.brandLabel === "string" ? record.brandLabel : "",
    tradeLabel: typeof record.tradeLabel === "string" ? record.tradeLabel : "",
    email: typeof record.email === "string" ? record.email : "",
    idempotencyKey:
      typeof record.idempotencyKey === "string" ? record.idempotencyKey : null,
    origin: originOf(request),
  });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, code: result.code },
      { status: result.status },
    );
  }
  return NextResponse.json({
    ok: true,
    bidId: result.bidId,
    depositDueUsd: result.depositDueUsd,
    checkoutUrl: result.checkoutUrl,
    covered: result.covered,
  });
}
