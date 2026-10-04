import { resolveAuthMode } from "@/lib/auth/mode";
import {
  resetCampaignClockForTests,
  resolveCampaignPhase,
  resolveLiveBidding,
  resolveNowMs,
  setCampaignClockForTests,
} from "@/lib/campaign-clock";
import { settleClosedCampaign } from "@/lib/deposit-flow";
import { testApiBlockedResponse } from "@/lib/test-api-gate";

export const runtime = "nodejs";

/**
 * Playwright clock. Opens the deposit desk inside the published window
 * without flipping production LIVE_BIDDING.
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
    resetCampaignClockForTests();
    return Response.json({
      ok: true,
      live: resolveLiveBidding(),
      now: new Date(resolveNowMs()).toISOString(),
      phase: resolveCampaignPhase().kind,
    });
  }
  try {
    setCampaignClockForTests({
      live: typeof record.live === "boolean" ? record.live : undefined,
      now: typeof record.now === "string" ? record.now : undefined,
      previewOpen:
        typeof record.previewOpen === "boolean" ? record.previewOpen : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad clock.";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
  if (record.settle === true) {
    await settleClosedCampaign(resolveNowMs());
  }
  return Response.json({
    ok: true,
    live: resolveLiveBidding(),
    now: new Date(resolveNowMs()).toISOString(),
    phase: resolveCampaignPhase().kind,
  });
}
