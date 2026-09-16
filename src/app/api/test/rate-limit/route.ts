import { resolveAuthMode } from "@/lib/auth/mode";
import {
  configureRateLimitForTests,
  resetRateLimitForTests,
} from "@/lib/rate-limit";
import { testApiBlockedResponse } from "@/lib/test-api-gate";

/**
 * Test-only rate-limit control (AUTH_MODE=test).
 * Body: `{ reset: true }` or `{ configure: { waitlistMax, intentMax, windowMs? } }`.
 * Slice 7.3 — 404 when VERCEL_ENV or NODE_ENV is production.
 */
export async function POST(request: Request) {
  const blocked = testApiBlockedResponse();
  if (blocked) return blocked;

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
        magicLinkMax?: unknown;
        operatorDecideMax?: unknown;
        windowMs?: unknown;
      };
    }).configure;
    const waitlistMax = Number(cfg.waitlistMax);
    const intentMax = Number(cfg.intentMax);
    const magicLinkMax =
      cfg.magicLinkMax === undefined ? undefined : Number(cfg.magicLinkMax);
    const operatorDecideMax =
      cfg.operatorDecideMax === undefined
        ? undefined
        : Number(cfg.operatorDecideMax);
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
    if (
      magicLinkMax !== undefined &&
      (!Number.isFinite(magicLinkMax) || magicLinkMax < 1)
    ) {
      return Response.json(
        { ok: false, error: "magicLinkMax must be a positive number" },
        { status: 400 },
      );
    }
    if (
      operatorDecideMax !== undefined &&
      (!Number.isFinite(operatorDecideMax) || operatorDecideMax < 1)
    ) {
      return Response.json(
        { ok: false, error: "operatorDecideMax must be a positive number" },
        { status: 400 },
      );
    }
    configureRateLimitForTests({
      waitlistMax: Math.floor(waitlistMax),
      intentMax: Math.floor(intentMax),
      magicLinkMax:
        magicLinkMax !== undefined ? Math.floor(magicLinkMax) : undefined,
      operatorDecideMax:
        operatorDecideMax !== undefined
          ? Math.floor(operatorDecideMax)
          : undefined,
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
