import { NextResponse } from "next/server";
import { depositDeskOpen } from "@/lib/campaign-clock";
import { placeDepositBid } from "@/lib/deposit-flow";
import { listAllIntentBids } from "@/lib/intent-store";
import { PUBLIC_COPY } from "@/lib/public-copy";

export const runtime = "nodejs";

function originOf(request: Request): string {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`;
}

/**
 * Public Place bid. Closed before open and after the effective close.
 * A standing row exists only after the webhook sets depositPaidAt.
 */
export async function POST(request: Request) {
  const bids = await listAllIntentBids();
  if (!depositDeskOpen(bids.map((bid) => bid.createdAt))) {
    return NextResponse.json(
      {
        ok: false,
        error: PUBLIC_COPY.bidDesk.closedResult,
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
  const result = await placeDepositBid({
    panelId: typeof record.panelId === "string" ? record.panelId : "",
    standingUsd:
      typeof record.standingUsd === "number" ? record.standingUsd : Number.NaN,
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
