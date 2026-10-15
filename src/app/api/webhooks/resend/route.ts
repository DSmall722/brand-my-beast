import { NextResponse } from "next/server";
import {
  handleResendBounceWebhookBody,
  isAuthorizedResendWebhook,
} from "@/lib/resend-bounce-webhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAuthorizedResendWebhook(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Expected JSON body." },
      { status: 400 },
    );
  }

  try {
    const result = await handleResendBounceWebhookBody(body);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 },
      );
    }
    if (result.ignored) {
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: result.reason,
      });
    }
    return NextResponse.json({
      ok: true,
      ignored: false,
      deadLetterId: result.row.id,
      kind: result.row.kind,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Bounce webhook failed.";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
