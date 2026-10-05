import { NextResponse } from "next/server";
import { placeRemainderCheckout } from "@/lib/deposit-flow";

export const runtime = "nodejs";

function originOf(request: Request): string {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`;
}

/** Winner pays the remainder. The deposit already captured is credited. */
export async function POST(request: Request) {
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
  const result = await placeRemainderCheckout({
    bidId: typeof record.bidId === "string" ? record.bidId : "",
    email: typeof record.email === "string" ? record.email : "",
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
