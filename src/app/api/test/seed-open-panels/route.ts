import { resolveAuthMode } from "@/lib/auth/mode";
import { seedOpenPanelsZeroStanding } from "@/lib/seed-open-panels";
import { testApiBlockedResponse } from "@/lib/test-api-gate";

/**
 * Slice 12.10 — seed 12 open panels, zero standing. CI only.
 * 404 in production. Never sets CLOSE_AT. No Stripe.
 */
export async function POST() {
  const blocked = testApiBlockedResponse();
  if (blocked) return blocked;

  if (resolveAuthMode() !== "test") {
    return Response.json({ ok: false, error: "test only" }, { status: 403 });
  }

  const result = await seedOpenPanelsZeroStanding();
  if (!result.ok) {
    return Response.json(result, { status: 400 });
  }
  return Response.json(result);
}
