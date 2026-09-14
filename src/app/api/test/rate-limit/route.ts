import { resolveAuthMode } from "@/lib/auth/mode";
import {
  configureRateLimitForTests,
  resetRateLimitForTests,
} from "@/lib/rate-limit";

/**
 * Test-only rate-limit control (AUTH_MODE=test).
 * Body: `{ reset: true }` or `{ configure: { waitlistMax, intentMax, windowMs? } }`.
 */
export async function POST(request: Request) {
  if (resolveAuthMode() !== "test") {
    return Response.json({ ok: false, error: "test only" }, { status: 403 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (
    typeof body === "object" &&
    body !== null &&
    "configure" in body &&
    typeof (body as { configure: unknown }).configure === "object" &&
    (body as { configure: unknown }).configure !== null
  ) {
    const cfg = (body as {
      configure: {
        waitlistMax?: unknown;
        intentMax?: unknown;
        windowMs?: unknown;
      };
    }).configure;
    const waitlistMax = Number(cfg.waitlistMax);
    const intentMax = Number(cfg.intentMax);
    const windowMs =
      cfg.windowMs === undefined ? undefined : Number(cfg.windowMs);
    if (
      !Number.isFinite(waitlistMax) ||
      waitlistMax < 1 ||
      !Number.isFinite(intentMax) ||
      intentMax < 1
    ) {
      return Response.json(
        { ok: false, error: "configure requires positive waitlistMax and intentMax" },
        { status: 400 },
      );
    }
    configureRateLimitForTests({
      waitlistMax: Math.floor(waitlistMax),
      intentMax: Math.floor(intentMax),
      windowMs:
        windowMs !== undefined && Number.isFinite(windowMs) && windowMs > 0
          ? Math.floor(windowMs)
          : undefined,
    });
    return Response.json({ ok: true, configured: true });
  }

  resetRateLimitForTests();
  return Response.json({ ok: true, reset: true });
}
