import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  canDownloadOperatorCsv,
  forbiddenDownload,
  unsignedDownload,
} from "@/lib/download-auth";
import { listStandingIntents } from "@/lib/intent-store";
import {
  buildOperatorCsv,
  OPERATOR_CSV_FILENAME,
} from "@/lib/operator-csv";
import { listWaitlistSignups } from "@/lib/waitlist";

export const runtime = "nodejs";

/**
 * Slice 8.4 / 13.36 — operator CSV of waitlist + standing intents.
 * Operator only. Not listed in robots/sitemap.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    const denial = unsignedDownload();
    return NextResponse.json(
      { ok: false, error: denial.error },
      { status: denial.status },
    );
  }
  if (!canDownloadOperatorCsv(session.user.email)) {
    const denial = forbiddenDownload("Operator only.");
    return NextResponse.json(
      { ok: false, error: denial.error },
      { status: denial.status },
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
