import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  buildCounselZip,
  COUNSEL_ZIP_FILENAME,
  readContractMarkdown,
} from "@/lib/counsel-export";
import {
  canDownloadOperatorCsv,
  forbiddenDownload,
  unsignedDownload,
} from "@/lib/download-auth";
import { listStandingIntents } from "@/lib/intent-store";

export const runtime = "nodejs";

/**
 * Slice 14.42 — counsel ZIP: CONTRACT.md + standing table.
 * No emails in the ZIP. Operator only. CLOSE_AT null. No card charge.
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

  const standing = await listStandingIntents();
  const zip = buildCounselZip({
    contractMarkdown: readContractMarkdown(),
    standingBids: standing,
  });

  return new NextResponse(new Uint8Array(zip), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${COUNSEL_ZIP_FILENAME}"`,
      "Cache-Control": "no-store",
    },
  });
}
