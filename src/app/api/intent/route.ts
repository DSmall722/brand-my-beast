import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseStandingUsd } from "@/lib/intent";
import { placeIntentBid } from "@/lib/intent-store";
import { PUBLIC_COPY } from "@/lib/public-copy";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  resolveSeatsOpen,
  seatsClosedIntentPayload,
} from "@/lib/seats-open";

/**
 * Slice 14.32 — intent POST. When SEATS_OPEN is false → 403.
 * Waitlist stays open (201). CLOSE_AT stays null. No card charge.
 */
export async function POST(request: Request) {
  // Slice 14.32 — seats closed blocks intent listing at the API.
  if (!resolveSeatsOpen()) {
    return NextResponse.json(seatsClosedIntentPayload(), { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "Sign in to place an intent mark." },
      { status: 401 },
    );
  }

  const limited = checkRateLimit("intent", `user:${session.user.id}`);
  if (!limited.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: PUBLIC_COPY.intent.rateLimited,
        code: "rate_limited",
      },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Expected JSON body." },
      { status: 400 },
    );
  }

  const record =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};
  const panelId = typeof record.panelId === "string" ? record.panelId : "";
  const brandLabel =
    typeof record.brandLabel === "string" ? record.brandLabel : "";
  const tradeLabel =
    typeof record.tradeLabel === "string" ? record.tradeLabel : "";
  const standingRaw =
    record.standingUsd === undefined || record.standingUsd === null
      ? null
      : String(record.standingUsd);
  const standingParsed = parseStandingUsd(standingRaw);
  if (!standingParsed.ok) {
    return NextResponse.json(
      { ok: false, error: standingParsed.error },
      { status: 400 },
    );
  }

  const result = await placeIntentBid({
    panelId,
    userId: session.user.id,
    brandLabel,
    tradeLabel,
    standingUsd: standingParsed.standingUsd,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      bidId: result.bid.id,
      panelId: result.bid.panelId,
      standingUsd: result.bid.standingUsd,
      depositUsd: result.bid.depositUsd,
    },
    { status: 201 },
  );
}
