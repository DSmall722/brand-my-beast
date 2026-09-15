import { resolveAuthMode } from "@/lib/auth/mode";
import { CLOSE_AT } from "@/lib/campaign";
import { setPanelExtendedUntil } from "@/lib/panel-extension-store";
import { testApiBlockedResponse } from "@/lib/test-api-gate";

/** Slice 9.3 test seed — 404 in production. Never sets CLOSE_AT. */
export async function POST(request: Request) {
  const blocked = testApiBlockedResponse();
  if (blocked) return blocked;

  if (resolveAuthMode() !== "test") {
    return Response.json({ ok: false, error: "test only" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    panelId?: string;
    panelExtendedUntil?: string | null;
  } | null;
  const panelId = String(body?.panelId ?? "");
  const result = await setPanelExtendedUntil(
    panelId,
    body?.panelExtendedUntil ?? null,
  );
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 400 });
  }
  return Response.json({
    ok: true,
    panelExtendedUntil: result.panelExtendedUntil,
    closeAt: CLOSE_AT,
  });
}
