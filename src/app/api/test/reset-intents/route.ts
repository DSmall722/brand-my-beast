import { resolveAuthMode } from "@/lib/auth/mode";
import { resetApprovalNoteStoreForTests } from "@/lib/approval-note-store";
import { resetCabinPlaqueStoreForTests } from "@/lib/cabin-plaque-store";
import { resetCircuitStoryStoreForTests } from "@/lib/circuit-story-store";
import { resetContentRightsStoreForTests } from "@/lib/content-rights-store";
import { resetIntentStoreForTests } from "@/lib/intent-store";
import { resetMockupStoreForTests } from "@/lib/mockup-store";
import { resetRateLimitForTests } from "@/lib/rate-limit";
import { resetSightingStoreForTests } from "@/lib/sighting-store";

export async function POST() {
  if (resolveAuthMode() !== "test") {
    return Response.json({ ok: false, error: "test only" }, { status: 403 });
  }
  await resetIntentStoreForTests();
  await resetMockupStoreForTests();
  await resetApprovalNoteStoreForTests();
  await resetCabinPlaqueStoreForTests();
  await resetContentRightsStoreForTests();
  await resetCircuitStoryStoreForTests();
  await resetSightingStoreForTests();
  resetRateLimitForTests();
  return Response.json({ ok: true, capture: false, closeAt: null });
}
