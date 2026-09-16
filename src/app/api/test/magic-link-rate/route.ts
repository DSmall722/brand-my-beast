import { resolveAuthMode } from "@/lib/auth/mode";
import {
  MAGIC_LINK_RATE_LIMITED,
  checkMagicLinkRateLimit,
  clientIpFromRequest,
} from "@/lib/rate-limit";
import { testApiBlockedResponse } from "@/lib/test-api-gate";

/**
 * Slice 11.2 test harness — trip magic-link rate limit without Resend.
 * 404 in production.
 */
export async function POST(request: Request) {
  const blocked = testApiBlockedResponse();
  if (blocked) return blocked;

  if (resolveAuthMode() !== "test") {
    return Response.json({ ok: false, error: "test only" }, { status: 403 });
  }

  let body: { email?: unknown } = {};
  try {
    body = (await request.json()) as { email?: unknown };
  } catch {
    body = {};
  }
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return Response.json(
      { ok: false, error: "Enter a valid email." },
      { status: 400 },
    );
  }

  const limited = checkMagicLinkRateLimit(email, clientIpFromRequest(request));
  if (!limited.ok) {
    return Response.json(
      {
        ok: false,
        error: MAGIC_LINK_RATE_LIMITED,
        code: "rate_limited",
        retryAfterSec: limited.retryAfterSec,
      },
      { status: 429 },
    );
  }

  return Response.json({
    ok: true,
    emailed: false,
    note: "Rate-limit slot consumed. No magic-link email in test harness.",
  });
}
