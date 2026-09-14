import { NextResponse } from "next/server";
import { PUBLIC_COPY } from "@/lib/public-copy";
import {
  checkRateLimit,
  clientIpFromRequest,
} from "@/lib/rate-limit";
import { joinWaitlist } from "@/lib/waitlist";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Expected JSON body." },
      { status: 400 },
    );
  }

  const email =
    typeof body === "object" &&
    body !== null &&
    "email" in body &&
    typeof (body as { email: unknown }).email === "string"
      ? (body as { email: string }).email
      : "";

  const rateKey = email.trim()
    ? `email:${email.trim().toLowerCase()}`
    : `ip:${clientIpFromRequest(request)}`;
  const limited = checkRateLimit("waitlist", rateKey);
  if (!limited.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: PUBLIC_COPY.waitlist.rateLimited,
        code: "rate_limited",
      },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  const result = await joinWaitlist(email);

  if (!result.ok) {
    const status =
      result.code === "invalid"
        ? 400
        : result.code === "unavailable"
          ? 503
          : 500;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result, {
    status: result.status === "created" ? 201 : 200,
  });
}
