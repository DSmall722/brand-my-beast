import { resolveAuthMode } from "@/lib/auth/mode";
import { seedDemoMixedBoard } from "@/lib/seed-demo";
import { testApiBlockedResponse } from "@/lib/test-api-gate";

export async function POST() {
  const blocked = testApiBlockedResponse();
  if (blocked) return blocked;

  if (resolveAuthMode() !== "test") {
    return Response.json({ ok: false, error: "test only" }, { status: 403 });
  }

  const result = await seedDemoMixedBoard();
  if (!result.ok) {
    return Response.json(result, { status: 400 });
  }
  return Response.json(result);
}
