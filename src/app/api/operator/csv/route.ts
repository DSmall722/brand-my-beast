import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isOperatorEmail } from "@/lib/auth/operator";
import { listStandingIntents } from "@/lib/intent-store";
import {
  buildOperatorCsv,
  OPERATOR_CSV_FILENAME,
} from "@/lib/operator-csv";
import { listWaitlistSignups } from "@/lib/waitlist";

export const runtime = "nodejs";

/**
 * Slice 8.4 — operator CSV of waitlist + standing intents.
 * Auth + OPERATOR_EMAILS. Not listed in robots/sitemap.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { ok: false, error: "Sign in required." },
      { status: 401 },
    );
  }
  if (!isOperatorEmail(session.user.email)) {
    return NextResponse.json(
      { ok: false, error: "Operator only." },
      { status: 403 },
    );
  }

  const [waitlist, intents] = await Promise.all([
    listWaitlistSignups(),
    listStandingIntents(),
  ]);
  const body = buildOperatorCsv({ waitlist, intents });

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${OPERATOR_CSV_FILENAME}"`,
      "Cache-Control": "no-store",
    },
  });
}
