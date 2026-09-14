import { resolveAuthMode } from "@/lib/auth/mode";
import { resetApprovalNoteStoreForTests } from "@/lib/approval-note-store";
import { resetCabinPlaqueStoreForTests } from "@/lib/cabin-plaque-store";
import { resetIntentStoreForTests } from "@/lib/intent-store";
import { resetMockupStoreForTests } from "@/lib/mockup-store";

export async function POST() {
  if (resolveAuthMode() !== "test") {
    return Response.json({ ok: false, error: "test only" }, { status: 403 });
  }
  await resetIntentStoreForTests();
  await resetMockupStoreForTests();
  await resetApprovalNoteStoreForTests();
  await resetCabinPlaqueStoreForTests();
  return Response.json({ ok: true, capture: false, closeAt: null });
}
