import { resolveAuthMode } from "@/lib/auth/mode";
import { resetApprovalNoteStoreForTests } from "@/lib/approval-note-store";
import { resetArtworkBlobStoreForTests } from "@/lib/artwork-blob";
import { resetContentRightsStoreForTests } from "@/lib/content-rights-store";
import { resetIntentStoreForTests } from "@/lib/intent-store";
import { resetIntentRevisionsForTests } from "@/lib/intent-revision";
import { resetMockupStoreForTests } from "@/lib/mockup-store";
import { resetOperatorAuditLogForTests } from "@/lib/operator-audit-log";
import { resetMailDeadLettersForTests } from "@/lib/mail-dead-letter";
import { resetOperatorBanListForTests } from "@/lib/operator-ban-list";
import { resetPanelExtensionStoreForTests } from "@/lib/panel-extension-store";
import { resetRateLimitForTests } from "@/lib/rate-limit";
import { resetLastOperatorDigestAtForTests } from "@/lib/operator-status";
import { resetShopArtStatusStoreForTests } from "@/lib/shop-art-status-store";
import { testApiBlockedResponse } from "@/lib/test-api-gate";
import { resetWaitlistDomainBlocklistForTests } from "@/lib/waitlist-domain-blocklist";

/**
 * Slice 7.3 — 404 when VERCEL_ENV or NODE_ENV is production.
 * Slice 14.11 — plaque / sighting / circuit stores load only via dynamic
 * import so TRUCK_EXISTS=false app routes do not statically pull them in.
 */
export async function POST() {
  const blocked = testApiBlockedResponse();
  if (blocked) return blocked;

  if (resolveAuthMode() !== "test") {
    return Response.json({ ok: false, error: "test only" }, { status: 403 });
  }
  await resetIntentStoreForTests();
  resetArtworkBlobStoreForTests();
  resetOperatorBanListForTests();
  resetWaitlistDomainBlocklistForTests();
  resetOperatorAuditLogForTests();
  resetMailDeadLettersForTests();
  resetIntentRevisionsForTests();
  await resetPanelExtensionStoreForTests();
  await resetMockupStoreForTests();
  await resetShopArtStatusStoreForTests();
  await resetApprovalNoteStoreForTests();
  const { resetCabinPlaqueStoreForTests } = await import(
    "@/lib/cabin-plaque-store"
  );
  await resetCabinPlaqueStoreForTests();
  await resetContentRightsStoreForTests();
  const { resetCircuitStoryStoreForTests } = await import(
    "@/lib/circuit-story-store"
  );
  await resetCircuitStoryStoreForTests();
  const { resetSightingStoreForTests } = await import("@/lib/sighting-store");
  await resetSightingStoreForTests();
  const { resetSeatsOpenOverrideForTests } = await import(
    "@/lib/seats-open-store"
  );
  resetSeatsOpenOverrideForTests();
  resetRateLimitForTests();
  resetLastOperatorDigestAtForTests();
  return Response.json({ ok: true, capture: false, closeAt: null });
}
