import { resolveAuthMode } from "@/lib/auth/mode";
import { resetApprovalNoteStoreForTests } from "@/lib/approval-note-store";
import { resetArtworkBlobStoreForTests } from "@/lib/artwork-blob";
import { resetCabinPlaqueStoreForTests } from "@/lib/cabin-plaque-store";
import { resetCircuitStoryStoreForTests } from "@/lib/circuit-story-store";
import { resetContentRightsStoreForTests } from "@/lib/content-rights-store";
import { resetIntentStoreForTests } from "@/lib/intent-store";
import { resetMockupStoreForTests } from "@/lib/mockup-store";
import { resetOperatorBanListForTests } from "@/lib/operator-ban-list";
import { resetRateLimitForTests } from "@/lib/rate-limit";
import { resetSightingStoreForTests } from "@/lib/sighting-store";
import { testApiBlockedResponse } from "@/lib/test-api-gate";

/** Slice 7.3 — 404 when VERCEL_ENV or NODE_ENV is production. */
export async function POST() {
  const blocked = testApiBlockedResponse();
  if (blocked) return blocked;

  if (resolveAuthMode() !== "test") {
    return Response.json({ ok: false, error: "test only" }, { status: 403 });
  }
  await resetIntentStoreForTests();
  resetArtworkBlobStoreForTests();
  resetOperatorBanListForTests();
  await resetMockupStoreForTests();
  await resetApprovalNoteStoreForTests();
  await resetCabinPlaqueStoreForTests();
  await resetContentRightsStoreForTests();
  await resetCircuitStoryStoreForTests();
  await resetSightingStoreForTests();
  resetRateLimitForTests();
  return Response.json({ ok: true, capture: false, closeAt: null });
}
