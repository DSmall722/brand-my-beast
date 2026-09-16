import { NextResponse } from "next/server";
import {
  ACCOUNT_EXPORT_FILENAME,
  accountExportJson,
  buildAccountExport,
} from "@/lib/account-export";
import { auth } from "@/lib/auth";
import { listBidsForUser } from "@/lib/intent-store";
import { getWaitlistByEmail } from "@/lib/waitlist";

export const runtime = "nodejs";

/**
 * Slice 12.15 — signed-in account holder exports own JSON.
 * Auth-gated. Intent only — no Stripe fields.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json(
      { ok: false, error: "Sign in required." },
      { status: 401 },
    );
  }

  const email = session.user.email;
  const userId = session.user.id;
  const [waitlist, intents] = await Promise.all([
    getWaitlistByEmail(email),
    listBidsForUser(userId),
  ]);

  const payload = buildAccountExport({
    email,
    userId,
    waitlist,
    intents,
  });
  const body = accountExportJson(payload);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${ACCOUNT_EXPORT_FILENAME}"`,
      "Cache-Control": "no-store",
    },
  });
}
