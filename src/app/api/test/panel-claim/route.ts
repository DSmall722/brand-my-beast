import { resolveAuthMode } from "@/lib/auth/mode";
import { PANELS } from "@/lib/campaign";
import {
  loadCampaignClaimState,
  loadPanelClaimState,
  resetPanelClaimStoreForTests,
  seedPanelClaimForTests,
} from "@/lib/panel-claim-flow";
import type { ClaimStatus, TierLocked } from "@/lib/panel-claim";
import { testApiBlockedResponse } from "@/lib/test-api-gate";

export const runtime = "nodejs";

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
    return Response.json({ ok: false, error: "Expected JSON body." }, { status: 400 });
  }
  const record =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};
  if (record.reset === true) {
    resetPanelClaimStoreForTests();
    return Response.json({ ok: true, reset: true });
  }
  if (typeof record.panelId === "string" && typeof record.claimStatus === "string") {
    const status = record.claimStatus as ClaimStatus;
    await seedPanelClaimForTests({
      panelId: record.panelId,
      claimStatus: status,
      claimedBrand:
        typeof record.claimedBrand === "string" ? record.claimedBrand : "Seed Brand",
    });
  }
  if (record.tierLocked === "purchase" || record.tierLocked === "none") {
    await seedPanelClaimForTests({
      tierLocked: record.tierLocked as TierLocked,
    });
  }
  const panels = await Promise.all(
    PANELS.map((panel) => loadPanelClaimState(panel.id)),
  );
  const campaign = await loadCampaignClaimState();
  return Response.json({ ok: true, panels, campaign });
}
