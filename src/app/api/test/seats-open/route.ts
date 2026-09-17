import { resolveAuthMode } from "@/lib/auth/mode";
import { resolveSeatsOpen } from "@/lib/seats-open";
import {
  resetSeatsOpenOverrideForTests,
  setSeatsOpenOverride,
} from "@/lib/seats-open-store";
import { testApiBlockedResponse } from "@/lib/test-api-gate";

/**
 * Slice 14.32 — Playwright helper to flip SEATS_OPEN on the Next server.
 * Never sets CLOSE_AT or a date.
 */
export async function POST(request: Request) {
  const blocked = testApiBlockedResponse();
  if (blocked) return blocked;

  if (resolveAuthMode() !== "test") {
    return Response.json({ ok: false, error: "test only" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "Expected JSON body." },
      { status: 400 },
    );
  }

  const record =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};

  if (record.reset === true) {
    resetSeatsOpenOverrideForTests();
    return Response.json({
      ok: true,
      seatsOpen: resolveSeatsOpen(),
      closeAt: null,
    });
  }

  if (typeof record.open !== "boolean") {
    return Response.json(
      { ok: false, error: "Body requires { open: boolean } or { reset: true }." },
      { status: 400 },
    );
  }

  const result = setSeatsOpenOverride(record.open);
  if (!result.ok) {
    return Response.json(result, { status: 400 });
  }

  return Response.json({
    ok: true,
    seatsOpen: result.seatsOpen,
    closeAt: null,
  });
}
