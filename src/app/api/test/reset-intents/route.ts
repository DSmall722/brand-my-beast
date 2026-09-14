import { resolveAuthMode } from "@/lib/auth/mode";
import { resetIntentStoreForTests } from "@/lib/intent-store";

export async function POST() {
  if (resolveAuthMode() !== "test") {
    return Response.json({ ok: false, error: "test only" }, { status: 403 });
  }
  await resetIntentStoreForTests();
  return Response.json({ ok: true, capture: false, closeAt: null });
}
