import { resolveAuthMode } from "@/lib/auth/mode";
import { resolveMaintenance } from "@/lib/maintenance";
import {
  resetMaintenanceOverrideForTests,
  setMaintenanceOverride,
} from "@/lib/maintenance-store";
import { testApiBlockedResponse } from "@/lib/test-api-gate";

/**
 * Slice 14.41 — Playwright helper to flip MAINTENANCE on the Next server.
 * Never sets CLOSE_AT or a date. Homepage stays up either way.
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
    resetMaintenanceOverrideForTests();
    return Response.json({
      ok: true,
      maintenance: resolveMaintenance(),
      closeAt: null,
    });
  }

  if (typeof record.on !== "boolean") {
    return Response.json(
      { ok: false, error: "Body requires { on: boolean } or { reset: true }." },
      { status: 400 },
    );
  }

  const result = setMaintenanceOverride(record.on);
  if (!result.ok) {
    return Response.json(result, { status: 400 });
  }

  return Response.json({
    ok: true,
    maintenance: result.maintenance,
    closeAt: null,
  });
}
